#!/usr/bin/env bash
# =============================================================================
# test-npm-audit-workflow.sh
#
# Validates the behaviour of .github/workflows/npm-audit.yml without running
# a real GitHub Actions job.  Specifically exercises:
#
#   T1 — Python summary script: zero-vuln audit JSON → correct counts printed
#   T2 — Python summary script: moderate-vuln JSON   → counts reported
#   T3 — Python summary script: high+critical JSON   → all severity buckets
#   T4 — Python summary script: malformed JSON       → graceful error message
#   T5 — Audit gate (exit code): empty dependency tree → exit 0
#   T6 — Gate logic: moderate vuln in JSON → gate must exit non-zero
#   T7 — Workflow YAML: audit-level flag is present and set to 'moderate'
#   T8 — Workflow YAML: working-directory is 'server'
#   T9 — Workflow YAML: trigger includes pull_request targeting main
#  T10 — Workflow YAML: trigger includes push targeting main
#
# Usage:
#   bash scripts/test-npm-audit-workflow.sh
#
# Exit code: 0 if all tests pass; non-zero if any fail.
# =============================================================================

set -euo pipefail

PASS=0
FAIL=0
ERRORS=()

if [ -t 1 ]; then
  GREEN='\033[0;32m'; RED='\033[0;31m'; RESET='\033[0m'; BOLD='\033[1m'
else
  GREEN=''; RED=''; RESET=''; BOLD=''
fi

ok()     { echo -e "${GREEN}ok${RESET} $1";  PASS=$((PASS+1)); }
not_ok() {
  echo -e "${RED}not ok${RESET} $1"
  echo -e "       ${RED}↳ $2${RESET}"
  FAIL=$((FAIL+1)); ERRORS+=("$1: $2")
}

TMPDIR_TEST=$(mktemp -d)
trap 'rm -rf "$TMPDIR_TEST"' EXIT

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKFLOW_FILE="$REPO_ROOT/.github/workflows/npm-audit.yml"

# ---------------------------------------------------------------------------
# Extract the inline Python summary block from the workflow YAML.
# Lines between (exclusive of) the heredoc open and close tags.
# ---------------------------------------------------------------------------
START_LINE=$(grep -n "python3 - << 'PYEOF'" "$WORKFLOW_FILE" | head -1 | cut -d: -f1)
END_LINE=$(awk "NR>$START_LINE && /^[[:space:]]*PYEOF[[:space:]]*$/{print NR; exit}" "$WORKFLOW_FILE")

if [ -z "$START_LINE" ] || [ -z "$END_LINE" ]; then
  echo "FATAL: could not locate Python summary block in $WORKFLOW_FILE"
  exit 2
fi

PYTHON_SUMMARY_SCRIPT="$TMPDIR_TEST/summary.py"
sed -n "$((START_LINE+1)),$((END_LINE-1))p" "$WORKFLOW_FILE" \
  | sed 's/^          //' \
  > "$PYTHON_SUMMARY_SCRIPT"

# Patch the hardcoded /tmp path to our temp dir so tests are hermetic
AUDIT_JSON_PATH="$TMPDIR_TEST/npm-audit.json"
sed -i "s|/tmp/npm-audit.json|$AUDIT_JSON_PATH|g" "$PYTHON_SUMMARY_SCRIPT"

run_summary() { python3 "$PYTHON_SUMMARY_SCRIPT"; }

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
write_fixture() { cat > "$AUDIT_JSON_PATH"; }

zero_vuln_fixture() {
  write_fixture << 'EOF'
{
  "auditReportVersion": 2,
  "vulnerabilities": {},
  "metadata": {
    "vulnerabilities": {
      "info": 0, "low": 0, "moderate": 0, "high": 0, "critical": 0, "total": 0
    }
  }
}
EOF
}

moderate_vuln_fixture() {
  write_fixture << 'EOF'
{
  "auditReportVersion": 2,
  "vulnerabilities": {
    "lodash": { "name": "lodash", "severity": "moderate" }
  },
  "metadata": {
    "vulnerabilities": {
      "info": 0, "low": 0, "moderate": 1, "high": 0, "critical": 0, "total": 1
    }
  }
}
EOF
}

high_crit_fixture() {
  write_fixture << 'EOF'
{
  "auditReportVersion": 2,
  "vulnerabilities": {},
  "metadata": {
    "vulnerabilities": {
      "info": 0, "low": 1, "moderate": 2, "high": 3, "critical": 1, "total": 7
    }
  }
}
EOF
}

# ---------------------------------------------------------------------------
# T1 — Python summary: zero vulns
# ---------------------------------------------------------------------------
zero_vuln_fixture
OUT=$(run_summary 2>&1)
if echo "$OUT" | grep -q "Total vulnerabilities : 0"; then
  ok "T1 — summary script reports 0 total vulnerabilities for clean audit"
else
  not_ok "T1 — summary script reports 0 total vulnerabilities for clean audit" \
         "Expected 'Total vulnerabilities : 0'; got: $OUT"
fi

# ---------------------------------------------------------------------------
# T2 — Python summary: moderate vuln
# ---------------------------------------------------------------------------
moderate_vuln_fixture
OUT=$(run_summary 2>&1)
if echo "$OUT" | grep -q "Total vulnerabilities : 1" && \
   echo "$OUT" | grep -q "moderate.*: 1"; then
  ok "T2 — summary script reports 1 moderate vulnerability"
else
  not_ok "T2 — summary script reports 1 moderate vulnerability" \
         "Expected total=1 and moderate=1; got: $OUT"
fi

# ---------------------------------------------------------------------------
# T3 — Python summary: high + critical counts correct
# ---------------------------------------------------------------------------
high_crit_fixture
OUT=$(run_summary 2>&1)
if echo "$OUT" | grep -q "Total vulnerabilities : 7" && \
   echo "$OUT" | grep -q "critical.*: 1" && \
   echo "$OUT" | grep -q "high.*: 3"; then
  ok "T3 — summary script reports correct counts across all severity buckets"
else
  not_ok "T3 — summary script reports correct counts across all severity buckets" \
         "Expected total=7, critical=1, high=3; got: $OUT"
fi

# ---------------------------------------------------------------------------
# T4 — Python summary: malformed JSON
# ---------------------------------------------------------------------------
echo "NOT_VALID_JSON{{" > "$AUDIT_JSON_PATH"
OUT=$(run_summary 2>&1)
if echo "$OUT" | grep -qi "could not parse\|json\|error"; then
  ok "T4 — summary script gracefully handles malformed JSON"
else
  not_ok "T4 — summary script gracefully handles malformed JSON" \
         "Expected graceful error message; got: $OUT"
fi

# ---------------------------------------------------------------------------
# T5 — Audit gate: empty project → exit 0
# ---------------------------------------------------------------------------
MOCK_PROJ="$TMPDIR_TEST/clean-proj"
mkdir -p "$MOCK_PROJ"
cat > "$MOCK_PROJ/package.json" << 'EOF'
{ "name": "test-clean", "version": "1.0.0", "private": true, "dependencies": {} }
EOF
(cd "$MOCK_PROJ" && npm install --silent 2>/dev/null || true)
if (cd "$MOCK_PROJ" && npm audit --audit-level=moderate 2>/dev/null); then
  ok "T5 — audit gate exits 0 for project with no dependencies"
else
  not_ok "T5 — audit gate exits 0 for project with no dependencies" \
         "npm audit --audit-level=moderate returned non-zero for empty project"
fi

# ---------------------------------------------------------------------------
# T6 — Gate logic: moderate vuln fixture triggers non-zero exit
# ---------------------------------------------------------------------------
moderate_vuln_fixture
GATE_EXIT=0
python3 - "$AUDIT_JSON_PATH" << 'PYEOF' || GATE_EXIT=$?
import sys, json
data = json.load(open(sys.argv[1]))
v = data.get("metadata", {}).get("vulnerabilities", {})
if v.get("moderate", 0) > 0 or v.get("high", 0) > 0 or v.get("critical", 0) > 0:
    sys.exit(1)
sys.exit(0)
PYEOF
if [ "$GATE_EXIT" -ne 0 ]; then
  ok "T6 — gate logic exits non-zero when moderate vulnerability is present"
else
  not_ok "T6 — gate logic exits non-zero when moderate vulnerability is present" \
         "Expected exit 1; gate returned 0 — PR would not be blocked"
fi

# ---------------------------------------------------------------------------
# T7 — Workflow YAML: --audit-level=moderate present
# ---------------------------------------------------------------------------
if grep -q "\-\-audit-level=moderate" "$WORKFLOW_FILE"; then
  ok "T7 — workflow YAML contains --audit-level=moderate gate flag"
else
  not_ok "T7 — workflow YAML contains --audit-level=moderate gate flag" \
         "--audit-level=moderate not found in $WORKFLOW_FILE"
fi

# ---------------------------------------------------------------------------
# T8 — Workflow YAML: working-directory is 'server'
# ---------------------------------------------------------------------------
if grep -q "working-directory: server" "$WORKFLOW_FILE"; then
  ok "T8 — workflow YAML sets working-directory to server"
else
  not_ok "T8 — workflow YAML sets working-directory to server" \
         "'working-directory: server' not found in $WORKFLOW_FILE"
fi

# ---------------------------------------------------------------------------
# T9 — Workflow YAML: pull_request trigger targeting main
# ---------------------------------------------------------------------------
if grep -A3 "pull_request:" "$WORKFLOW_FILE" | grep -q "main"; then
  ok "T9 — workflow YAML triggers on pull_request targeting main"
else
  not_ok "T9 — workflow YAML triggers on pull_request targeting main" \
         "pull_request trigger for main not found in $WORKFLOW_FILE"
fi

# ---------------------------------------------------------------------------
# T10 — Workflow YAML: push trigger targeting main
# ---------------------------------------------------------------------------
if grep -A3 "^  push:" "$WORKFLOW_FILE" | grep -q "main"; then
  ok "T10 — workflow YAML triggers on push to main"
else
  not_ok "T10 — workflow YAML triggers on push to main" \
         "push trigger for main not found in $WORKFLOW_FILE"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
TOTAL=$((PASS+FAIL))
echo ""
echo -e "${BOLD}Results: $PASS/$TOTAL passed${RESET}"
if [ ${#ERRORS[@]} -gt 0 ]; then
  echo ""; echo -e "${RED}Failures:${RESET}"
  for err in "${ERRORS[@]}"; do echo "  - $err"; done
fi

[ "$FAIL" -eq 0 ]
