#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST_FILE="$SCRIPT_DIR/issues_remaining_manifest.tsv"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI not found. Install gh first."
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Run: gh auth login"
  exit 1
fi

# Skip header
{ read -r _; while IFS=$'\t' read -r id title milestone labels body_file; do
  [[ -z "$id" ]] && continue
  full_title="$id $title"

  existing_count="$(gh issue list --state all --search "\"$full_title\" in:title" --limit 1 --json title --jq 'length')"
  if [[ "$existing_count" != "0" ]]; then
    echo "Skipping existing issue: $full_title"
    continue
  fi

  echo "Creating issue: $full_title"
  gh issue create \
    --title "$full_title" \
    --body-file "$body_file" \
    --milestone "$milestone" \
    --label "$labels"
done } < "$MANIFEST_FILE"
