#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TSV_FILE="$SCRIPT_DIR/issues.tsv"
OUT_DIR="$SCRIPT_DIR/markdown"
MANIFEST_FILE="$SCRIPT_DIR/issues_remaining_manifest.tsv"

mkdir -p "$OUT_DIR"

printf 'id\ttitle\tmilestone\tlabels\tbody_file\n' > "$MANIFEST_FILE"

phase_for_sprint() {
  local sprint="$1"
  if (( sprint >= 2 && sprint <= 4 )); then echo "phase/1"; return; fi
  if (( sprint >= 5 && sprint <= 8 )); then echo "phase/2"; return; fi
  if (( sprint >= 9 && sprint <= 12 )); then echo "phase/3"; return; fi
  echo "phase/unknown"
}

emit_scope() {
  local scope="$1"
  IFS=';' read -ra items <<< "$scope"
  for item in "${items[@]}"; do
    printf -- '- %s\n' "$item"
  done
}

emit_acceptance() {
  local acceptance="$1"
  IFS=';' read -ra items <<< "$acceptance"
  for item in "${items[@]}"; do
    printf -- '- [ ] %s\n' "$item"
  done
}

# Skip header
{ read -r _; while IFS=$'\t' read -r id title milestone type_label priority_label goal scope acceptance; do
  [[ -z "$id" ]] && continue

  sprint="$(echo "$id" | sed -E 's/^S([0-9]+)-.*/\1/')"
  phase_label="$(phase_for_sprint "$sprint")"
  sprint_label="sprint/s${sprint}"
  type_full="type/${type_label}"
  priority_full="priority/${priority_label}"
  labels="${phase_label},${sprint_label},${type_full},${priority_full}"

  body_file="$OUT_DIR/${id}.md"

  {
    printf '## Context\n'
    printf '%s\n\n' "This issue is part of milestone ${milestone} and continues delivery after Sprint 1 foundation."

    printf '## Goal\n'
    printf '%s\n\n' "$goal"

    printf '## Scope\n'
    emit_scope "$scope"
    printf '\n'

    printf '## Out of Scope\n'
    printf -- '- Backend cloud sync implementation unless explicitly required by this ticket\n'
    printf -- '- Unrelated UI redesign outside ticket objective\n'
    printf -- '- Scope from future milestones not listed here\n\n'

    printf '## Acceptance Criteria\n'
    emit_acceptance "$acceptance"
    printf '\n'

    printf '## Labels\n'
    printf -- '- `%s`\n' "$phase_label"
    printf -- '- `%s`\n' "$sprint_label"
    printf -- '- `%s`\n' "$type_full"
    printf -- '- `%s`\n\n' "$priority_full"

    printf '## DoD Checklist\n'
    printf -- '- [ ] Frontend lint typecheck tests build pass\n'
    printf -- '- [ ] No heavy template logic or architecture boundary violations\n'
    printf -- '- [ ] Happy path edge case and error case coverage included\n'
    printf -- '- [ ] Documentation updated if behavior or contracts changed\n'
  } > "$body_file"

  printf '%s\t%s\t%s\t%s\t%s\n' "$id" "$title" "$milestone" "$labels" "$body_file" >> "$MANIFEST_FILE"
done } < "$TSV_FILE"

echo "Generated markdown issues in: $OUT_DIR"
echo "Generated manifest: $MANIFEST_FILE"
