#!/usr/bin/env bash
# Local-only PHI screen (PLAN §6, tier 2). Run before every push.
#
# Reads .phi-words — one term per line, comments with #. That file is
# .gitignore'd and MUST NEVER be committed: publishing the word list to a public
# repo would publish the exact vocabulary this screen exists to suppress.
set -uo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .phi-words ]; then
  echo "No .phi-words file. Create it locally (one term per line) with the product"
  echo "names and vocabulary that must not appear in this public repo. Never commit it."
  exit 1
fi
if git ls-files --error-unmatch .phi-words >/dev/null 2>&1; then
  echo "✗ .phi-words is TRACKED BY GIT. Run: git rm --cached .phi-words"
  exit 1
fi

hits=0
while IFS= read -r term; do
  case "$term" in ''|\#*) continue ;; esac
  if git grep -inF -- "$term" >/dev/null 2>&1; then
    echo "✗ '$term' appears in tracked files:"
    git grep -inF -- "$term" | head -5
    hits=$((hits + 1))
  fi
done < .phi-words

if [ "$hits" -eq 0 ]; then echo "✓ PHI screen clean."; else echo "$hits term(s) found — scrub before pushing."; fi
exit "$hits"
