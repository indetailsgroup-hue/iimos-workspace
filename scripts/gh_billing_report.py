#!/usr/bin/env python3
"""
gh_billing_report.py — GitHub Actions per-workflow minute spend
for the current billing cycle (1st of current month → today).

Usage:
  export GH_TOKEN=ghp_...
  python3 scripts/gh_billing_report.py

  # Override org/repo or date range:
  python3 scripts/gh_billing_report.py \\
      --owner indetailsgroup-hue \\
      --repo  monolith-workspace \\
      --since 2026-09-01

Requires only Python 3.9+ stdlib — no pip installs needed.
"""

import os
import sys
import json
import argparse
import datetime
from collections import defaultdict
from urllib.request import Request, urlopen
from urllib.error import HTTPError

# ─── constants ────────────────────────────────────────────────────────────────
BASE = "https://api.github.com"

# GitHub Actions billing multipliers (minutes → USD)
RATES = {"UBUNTU": 0.008, "WINDOWS": 0.016, "MACOS": 0.08}
LABELS = {"UBUNTU": "Linux", "WINDOWS": "Windows", "MACOS": "macOS"}


# ─── HTTP helper ──────────────────────────────────────────────────────────────
def api_get(token: str, url: str) -> dict:
    req = Request(url, headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    try:
        with urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except HTTPError as e:
        body = e.read().decode(errors="replace")
        raise RuntimeError(f"HTTP {e.code} {url}\n  {body[:300]}") from e


# ─── API wrappers ─────────────────────────────────────────────────────────────
def org_billing_summary(token: str, owner: str) -> dict:
    """Returns org-level Actions billing totals, or {} if unavailable."""
    for endpoint in (
        f"{BASE}/orgs/{owner}/settings/billing/actions",
        f"{BASE}/users/{owner}/settings/billing/actions",
    ):
        try:
            return api_get(token, endpoint)
        except RuntimeError as e:
            if "HTTP 404" in str(e) or "HTTP 403" in str(e):
                continue
            raise
    return {}


def list_workflows(token: str, owner: str, repo: str) -> list[dict]:
    out, page = [], 1
    while True:
        d = api_get(token, f"{BASE}/repos/{owner}/{repo}/actions/workflows?per_page=100&page={page}")
        batch = d.get("workflows", [])
        out.extend(batch)
        if len(batch) < 100:
            break
        page += 1
    return out


def workflow_runs_since(token: str, owner: str, repo: str,
                        workflow_id: int, since: str) -> list[dict]:
    """
    Fetch completed runs for a single workflow created on/after `since`.
    Capped at 10 pages (1,000 runs) to stay within rate-limit budget.
    """
    out, page = [], 1
    while page <= 10:
        url = (f"{BASE}/repos/{owner}/{repo}/actions/runs"
               f"?workflow_id={workflow_id}&status=completed"
               f"&created=>={since}&per_page=100&page={page}")
        d = api_get(token, url)
        batch = d.get("workflow_runs", [])
        out.extend(batch)
        if len(batch) < 100:
            break
        page += 1
    return out


def run_billing_minutes(token: str, owner: str, repo: str, run_id: int) -> dict[str, int]:
    """
    Returns {OS_KEY: billable_minutes} for a single run.
    Silently returns {} on error (timing not available for all run states).
    """
    try:
        d = api_get(token, f"{BASE}/repos/{owner}/{repo}/actions/runs/{run_id}/timing")
        billable = d.get("billable", {})
        return {
            os_key: data.get("total_ms", 0) // 60_000   # ms → minutes
            for os_key, data in billable.items()
        }
    except RuntimeError:
        return {}


# ─── report ───────────────────────────────────────────────────────────────────
def cycle_start() -> str:
    """First day of the current calendar month (GitHub's default billing cycle)."""
    return datetime.date.today().replace(day=1).isoformat()


def print_org_summary(summary: dict) -> None:
    if not summary:
        print("  (org billing endpoint not accessible with this token)")
        return
    inc  = summary.get("included_minutes", "n/a")
    used = summary.get("total_minutes_used", "n/a")
    paid = summary.get("total_paid_minutes_used", 0)
    bd   = summary.get("minutes_used_breakdown", {})
    print(f"  Included quota : {inc!s:>8} min")
    print(f"  Total used     : {used!s:>8} min")
    for key, label in LABELS.items():
        mins = bd.get(key, 0)
        if mins:
            print(f"    {label:<10}: {mins:>6} min  (${mins * RATES[key]:.2f})")
    if paid:
        print(f"  Paid overage   : {paid:>8} min")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="GitHub Actions billing report — per-workflow minute spend"
    )
    parser.add_argument("--owner", default=os.environ.get("GH_OWNER", "indetailsgroup-hue"))
    parser.add_argument("--repo",  default=os.environ.get("GH_REPO",  "monolith-workspace"))
    parser.add_argument("--token", default=os.environ.get("GH_TOKEN", ""),
                        help="GitHub PAT (or set GH_TOKEN env var)")
    parser.add_argument("--since", default=None,
                        help="Override cycle start (YYYY-MM-DD); default = 1st of current month")
    args = parser.parse_args()

    if not args.token:
        sys.exit("ERROR: pass --token or set the GH_TOKEN environment variable.")

    since = args.since or cycle_start()
    today = datetime.date.today().isoformat()

    print(f"\n{'═'*68}")
    print(f"  GitHub Actions Billing Report")
    print(f"  Repo   : {args.owner}/{args.repo}")
    print(f"  Period : {since} → {today}")
    print(f"{'═'*68}\n")

    # ── org-level totals ──────────────────────────────────────────────────────
    print("── Org-level Actions billing (full cycle) ──")
    summary = org_billing_summary(args.token, args.owner)
    print_org_summary(summary)

    # ── per-workflow breakdown ────────────────────────────────────────────────
    print(f"\n── Per-workflow breakdown (completed runs since {since}) ──\n")
    workflows = list_workflows(args.token, args.owner, args.repo)
    if not workflows:
        print("  No workflows found.")
        return

    rows: list[dict] = []
    for wf in workflows:
        wf_name = wf["name"]
        wf_file = wf["path"].split("/")[-1]
        print(f"  Scanning  {wf_name:<42} ({wf_file})", end="", flush=True)

        runs = workflow_runs_since(args.token, args.owner, args.repo, wf["id"], since)
        print(f"  {len(runs):>3} runs", end="", flush=True)

        totals: dict[str, int] = defaultdict(int)
        for run in runs:
            for os_key, mins in run_billing_minutes(
                args.token, args.owner, args.repo, run["id"]
            ).items():
                totals[os_key] += mins

        total_min  = sum(totals.values())
        total_cost = sum(totals[k] * RATES.get(k, 0) for k in totals)
        print(f"  →  {total_min:>5} min  (${total_cost:>7.2f})")

        rows.append({
            "name":      wf_name,
            "file":      wf_file,
            "runs":      len(runs),
            "mins":      total_min,
            "cost":      total_cost,
            "breakdown": dict(totals),
        })

    # ── summary table ─────────────────────────────────────────────────────────
    rows.sort(key=lambda r: r["mins"], reverse=True)
    grand_min  = sum(r["mins"]  for r in rows)
    grand_cost = sum(r["cost"]  for r in rows)

    col_w = 42
    print(f"\n{'─'*76}")
    print(f"  {'Workflow':<{col_w}} {'Runs':>5}  {'Min':>7}  {'Cost':>9}  Breakdown")
    print(f"{'─'*76}")
    for r in rows:
        bd_str = "  ".join(
            f"{LABELS.get(k, k)} {v}m"
            for k, v in sorted(r["breakdown"].items())
            if v
        )
        print(f"  {r['name']:<{col_w}} {r['runs']:>5}  {r['mins']:>7}  ${r['cost']:>8.2f}  {bd_str}")
    print(f"{'─'*76}")
    print(f"  {'TOTAL':<{col_w}} {'':>5}  {grand_min:>7}  ${grand_cost:>8.2f}")
    print()


if __name__ == "__main__":
    main()
