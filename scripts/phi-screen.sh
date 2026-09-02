#!/usr/bin/env bash
# Local-only PHI screen. Run before every push.
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

# Tracked files AND untracked files git would add. `git grep` reads only the
# former, so a fresh draft pasted into docs/ was invisible to this screen while
# being one `git add -A` away from the public repo.
files="$( { git ls-files; git ls-files --others --exclude-standard; } | sort -u )"
hits=0
while IFS= read -r term; do
  case "$term" in ''|\#*) continue ;; esac
  found="$(printf '%s\n' "$files" | tr '\n' '\0' | xargs -0 grep -inF -- "$term" 2>/dev/null || true)"
  if [ -n "$found" ]; then
    echo "✗ '$term' appears in files the next commit can carry:"
    printf '%s\n' "$found" | head -5
    hits=$((hits + 1))
  fi
done < .phi-words

if [ "$hits" -eq 0 ]; then echo "✓ PHI screen clean."; else echo "$hits term(s) found — scrub before pushing."; fi
exit "$hits"
