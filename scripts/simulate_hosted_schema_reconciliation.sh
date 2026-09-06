#!/usr/bin/env bash

# Restore a schema-only hosted database snapshot into an isolated local
# Supabase instance, then apply only the canonical migrations that are absent
# from hosted migration history. The hosted database is never connected to by
# this script; callers provide a pg_dump created in a read-only session.

set -u -o pipefail
export LC_ALL=C

if [[ $# -ne 6 ]]; then
  echo "usage: $0 HOSTED_SCHEMA_SQL HOSTED_INVENTORY_JSON RECONCILIATION_JSON CANONICAL_PLAN_DIR OUTPUT_DIR LOCAL_DATABASE_URL" >&2
  exit 2
fi

hosted_schema_sql="$1"
hosted_inventory_json="$2"
reconciliation_json="$3"
canonical_plan_dir="$4"
output_dir="$5"
local_database_url="$6"

for required_file in \
  "$hosted_schema_sql" \
  "$hosted_inventory_json" \
  "$reconciliation_json" \
  "$canonical_plan_dir/migration-manifest.tsv"; do
  if [[ ! -f "$required_file" ]]; then
    echo "[reconciliation-simulation] required file not found: $required_file" >&2
    exit 1
  fi
done

mkdir -p "$output_dir"
restore_log="$output_dir/schema-restore.log"
apply_log="$output_dir/migration-apply.log"
pgtap_log="$output_dir/reconciliation-pgtap.tap"
lint_log="$output_dir/reconciliation-db-lint.txt"
applied_tsv="$output_dir/applied-migrations.tsv"
result_json="$output_dir/reconciliation-simulation.json"

printf 'order\tversion\tfile\n' > "$applied_tsv"
: > "$restore_log"
: > "$apply_log"
: > "$pgtap_log"
: > "$lint_log"

history_append_only_candidate="$(jq -r '.historyAppendOnlyCandidate // false' "$reconciliation_json")"
missing_count="$(jq -r '.canonicalVersionsMissing' "$reconciliation_json")"
hosted_server_version_num="$(jq -r '.serverVersionNum' "$hosted_inventory_json")"

if [[ "$history_append_only_candidate" != "true" ]]; then
  echo "[reconciliation-simulation] migration history is not append-only compatible" >&2
  exit 1
fi
if [[ ! "$missing_count" =~ ^[0-9]+$ ]] || [[ "$missing_count" -eq 0 ]]; then
  echo "[reconciliation-simulation] expected a positive missing migration count" >&2
  exit 1
fi
if [[ ! "$hosted_server_version_num" =~ ^[0-9]+$ ]]; then
  echo "[reconciliation-simulation] hosted server version is not numeric" >&2
  exit 1
fi

schema_restore_succeeded=false
applied_count=0
failed_order=""
failed_version=""
failed_file=""
core_schema_ready_before=false
core_schema_ready_after=false
pgtap_exit_code=-1
pgtap_test_file_count=0
pgtap_assertion_count=0
pgtap_passed=false
database_lint_exit_code=-1
database_lint_clean=false
local_dependency_extensions_ready=true
failed_dependency_extension=""

core_schema_query="SELECT CASE WHEN (
  to_regclass('public.organizations') IS NOT NULL
  AND to_regclass('public.org_members') IS NOT NULL
  AND to_regclass('public.super_admins') IS NOT NULL
  AND to_regclass('public.notification_digest_queue') IS NOT NULL
  AND to_regclass('public.platform_metrics_snapshots') IS NOT NULL
) THEN 'true' ELSE 'false' END;"

if psql "$local_database_url" --no-psqlrc -X -v ON_ERROR_STOP=1 \
  -c 'DROP SCHEMA IF EXISTS public CASCADE;' \
  >> "$restore_log" 2>&1 \
  && psql "$local_database_url" --no-psqlrc -X -v ON_ERROR_STOP=1 \
    -f "$hosted_schema_sql" \
    >> "$restore_log" 2>&1; then
  schema_restore_succeeded=true
  core_schema_ready_before="$(psql "$local_database_url" --no-psqlrc -X -tA \
    -v ON_ERROR_STOP=1 -c "$core_schema_query")"
else
  echo "[reconciliation-simulation] hosted schema restore failed" >> "$apply_log"
fi

if [[ "$schema_restore_succeeded" == "true" ]]; then
  for dependency_extension in pg_cron pg_net; do
    if jq -e --arg extension "$dependency_extension" \
      '.installedExtensions | has($extension)' \
      "$hosted_inventory_json" > /dev/null; then
      case "$dependency_extension" in
        pg_cron) extension_sql='CREATE EXTENSION IF NOT EXISTS pg_cron;' ;;
        pg_net) extension_sql='CREATE EXTENSION IF NOT EXISTS pg_net;' ;;
      esac

      if ! psql "$local_database_url" --no-psqlrc -X -v ON_ERROR_STOP=1 \
        -c "$extension_sql" >> "$restore_log" 2>&1; then
        local_dependency_extensions_ready=false
        failed_dependency_extension="$dependency_extension"
        break
      fi
    fi
  done
fi

if [[ "$schema_restore_succeeded" == "true" \
  && "$local_dependency_extensions_ready" == "true" ]]; then
  while IFS=$'\t' read -r order version file; do
    migration_path="$canonical_plan_dir/supabase/migrations/$file"
    if [[ ! -f "$migration_path" ]]; then
      failed_order="$order"
      failed_version="$version"
      failed_file="$file"
      echo "missing rendered migration: $migration_path" >> "$apply_log"
      break
    fi

    echo "[reconciliation-simulation] applying $version ($file)" >> "$apply_log"
    if psql "$local_database_url" --no-psqlrc -X -v ON_ERROR_STOP=1 \
      -f "$migration_path" >> "$apply_log" 2>&1; then
      applied_count=$((applied_count + 1))
      printf '%s\t%s\t%s\n' "$order" "$version" "$file" >> "$applied_tsv"
    else
      failed_order="$order"
      failed_version="$version"
      failed_file="$file"
      break
    fi
  done < <(jq -r '.missingFromHosted[] | [.order, .version, .file] | @tsv' \
    "$reconciliation_json")

  core_schema_ready_after="$(psql "$local_database_url" --no-psqlrc -X -tA \
    -v ON_ERROR_STOP=1 -c "$core_schema_query")"
fi

all_missing_migrations_applied=false
if [[ "$schema_restore_succeeded" == "true" \
  && -z "$failed_file" \
  && "$applied_count" -eq "$missing_count" ]]; then
  all_missing_migrations_applied=true
fi

if [[ "$all_missing_migrations_applied" == "true" ]]; then
  psql "$local_database_url" --no-psqlrc -X -v ON_ERROR_STOP=1 \
    -c 'CREATE EXTENSION IF NOT EXISTS pgtap;' >> "$pgtap_log" 2>&1

  shopt -s nullglob
  pgtap_files=("$canonical_plan_dir"/supabase/tests/*.sql)
  shopt -u nullglob
  pgtap_test_file_count="${#pgtap_files[@]}"

  set +e
  if [[ "$pgtap_test_file_count" -eq 0 ]]; then
    echo "No pgTAP SQL files found in $canonical_plan_dir/supabase/tests" \
      >> "$pgtap_log"
    pgtap_exit_code=2
  else
    pg_prove --dbname "$local_database_url" --verbose \
      "${pgtap_files[@]}" >> "$pgtap_log" 2>&1
    pgtap_exit_code=$?
  fi

  supabase db lint \
    --db-url "$local_database_url" \
    --schema public \
    --level error \
    --fail-on error \
    > "$lint_log" 2>&1
  database_lint_exit_code=$?
  set -e

  pgtap_assertion_count="$(grep -Ec '^ok ' "$pgtap_log" || true)"
  if [[ "$pgtap_exit_code" -eq 0 && "$pgtap_assertion_count" -gt 0 ]]; then
    pgtap_passed=true
  fi
  if [[ "$database_lint_exit_code" -eq 0 ]]; then
    database_lint_clean=true
  fi
fi

jq -n \
  --argjson hostedServerVersionNum "$hosted_server_version_num" \
  --argjson missingMigrationCount "$missing_count" \
  --argjson appliedMigrationCount "$applied_count" \
  --arg failedOrder "$failed_order" \
  --arg failedVersion "$failed_version" \
  --arg failedFile "$failed_file" \
  --argjson schemaRestoreSucceeded "$schema_restore_succeeded" \
  --argjson coreSchemaReadyBefore "$core_schema_ready_before" \
  --argjson coreSchemaReadyAfter "$core_schema_ready_after" \
  --argjson allMissingMigrationsApplied "$all_missing_migrations_applied" \
  --argjson pgtapExitCode "$pgtap_exit_code" \
  --argjson pgtapTestFileCount "$pgtap_test_file_count" \
  --argjson pgtapAssertionCount "$pgtap_assertion_count" \
  --argjson pgtapPassed "$pgtap_passed" \
  --argjson databaseLintExitCode "$database_lint_exit_code" \
  --argjson databaseLintClean "$database_lint_clean" \
  --argjson localDependencyExtensionsReady "$local_dependency_extensions_ready" \
  --arg failedDependencyExtension "$failed_dependency_extension" \
  '{
    formatVersion: 1,
    simulationKind: "hosted-public-schema-only",
    hostedServerVersionNum: $hostedServerVersionNum,
    schemaRestoreSucceeded: $schemaRestoreSucceeded,
    localDependencyExtensionsReady: $localDependencyExtensionsReady,
    failedDependencyExtension: (
      if $failedDependencyExtension == "" then null
      else $failedDependencyExtension
      end
    ),
    coreSchemaReadyBefore: $coreSchemaReadyBefore,
    missingMigrationCount: $missingMigrationCount,
    appliedMigrationCount: $appliedMigrationCount,
    allMissingMigrationsApplied: $allMissingMigrationsApplied,
    failedMigration: (
      if $failedFile == "" then null
      else {
        order: ($failedOrder | tonumber),
        version: $failedVersion,
        file: $failedFile
      }
      end
    ),
    coreSchemaReadyAfter: $coreSchemaReadyAfter,
    pgtapExitCode: $pgtapExitCode,
    pgtapTestFileCount: $pgtapTestFileCount,
    pgtapAssertionCount: $pgtapAssertionCount,
    pgtapPassed: $pgtapPassed,
    databaseLintExitCode: $databaseLintExitCode,
    databaseLintClean: $databaseLintClean,
    productionDataCopied: false,
    productionWritesPerformed: false
  }' > "$result_json"

jq . "$result_json"
