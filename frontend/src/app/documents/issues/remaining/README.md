# Remaining Issues Import Pack (S2-S12)

This folder contains a bulk import package for all remaining roadmap tickets after Sprint 1.

## Included Files
- `issues.tsv`: canonical source of remaining tickets metadata
- `markdown/*.md`: generated issue bodies in markdown
- `issues_remaining_manifest.tsv`: issue import manifest with labels and milestones
- `generate_markdown_and_manifest.sh`: regenerate markdown and manifest from TSV
- `create_milestones_s2_s12.sh`: create S2-S12 milestones (idempotent)
- `import_remaining_issues.sh`: create GitHub issues using GitHub CLI

## Before Import
1. Ensure labels already exist in GitHub:
   - `phase/*`
   - `sprint/*`
   - `type/*`
   - `priority/*`
2. Ensure milestones exist for `S2` to `S12` using the exact names used in `issues.tsv`.
3. Authenticate with GitHub CLI:
   - `gh auth login`

## Import Steps
```bash
cd frontend/src/app/documents/issues/remaining
./create_milestones_s2_s12.sh
./import_remaining_issues.sh
```

## Notes
- Script creates issues with title format: `Sx-Ty <title>`.
- Each issue includes goal scope acceptance criteria labels and DoD checklist.
- If a milestone name does not exist, issue creation will fail for that item.
