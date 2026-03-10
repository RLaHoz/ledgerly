#!/usr/bin/env bash
set -euo pipefail

# Requires: gh auth login and gh repo set-default <owner>/<repo>

milestones=(
  "S2 - Dexie Data Layer"
  "S3 - History"
  "S4 - Rules Engine"
  "S5 - Budget Engine"
  "S6 - Real Dashboard"
  "S7 - Split Mode"
  "S8 - Reports"
  "S9 - Insights v1"
  "S10 - Forecasting"
  "S11 - Quality Hardening"
  "S12 - OSS Beta Readiness"
)

for m in "${milestones[@]}"; do
  echo "Ensuring milestone: $m"
  gh api repos/:owner/:repo/milestones \
    --method POST \
    -f title="$m" >/dev/null 2>&1 || true

done

echo "Done."
