#!/usr/bin/env bash
# Drive the ledger gate through Claude Code itself, not through its stdin. The
# unit tests cover the script; only this covers the wiring in hooks.json, and
# the first wiring shipped on 2026-09-03 never fired (an `if` value that was not
# a permission rule, skipped silently). Four arms: Write and Edit, each once with
# a bare entry (must be denied) and once with a complete block (must land).
#
# usage: evals/drive-ledger-gate.sh [scratch-dir]
# Needs `claude` on PATH. Each arm is one `claude -p` call, roughly a minute.
set -uo pipefail
cd "$(dirname "$0")/.."
# LFB_PLUGIN_DIR points the drive at another copy, which is how the red run is
# reproduced: a copy carrying the original single `Write|Edit(...)` handler.
PLUGIN="${LFB_PLUGIN_DIR:-$PWD/plugins/learn-from-bugs}"
SCRATCH="${1:-$(mktemp -d)}"
mkdir -p "$SCRATCH"
fails=0

LOG='# Lessons

## 2026-06-11 — A malformed timestamp put rows under a bucket headed undefined

Body.
Class: input validation

## 2026-02-09 — The activity heading read Activity for null

Body.
Class: null safety
'
BARE='## 2026-09-03 — The export header was blank on an empty page

What happened. Nothing caught it. The rule.
'
GOOD='## 2026-09-03 — The export header was blank on an empty page

What happened. Nothing caught it. The rule.

Class: null safety
Instance: 1
Level: contract
Bucket: missing
Not one up: convention would be every export path, and only one writes a header
Sweep: `grep -rn "header" src/` → nothing
Priors: `git log --date=short --format=%ad -- src/export.js` → 0 nominated
Landed: 4 the export template now asks what an empty page shows
Critic: not-run
'

mkrepo() {
  local dir="$1"
  rm -rf "$dir"; mkdir -p "$dir/docs" "$dir/src"
  printf '%s' "$LOG" > "$dir/docs/LESSONS.md"
  printf 'export function exportRows() {}\n' > "$dir/src/export.js"
  git -C "$dir" init -q
  git -C "$dir" -c user.email=t@t -c user.name=t add . >/dev/null
  git -C "$dir" -c user.email=t@t -c user.name=t commit -q -m scaffold
}

# arm <name> <tool> <entry-var> <expect: denied|landed>
arm() {
  local name="$1" tool="$2" entry="$3" expect="$4"
  local dir="$SCRATCH/$name"
  mkrepo "$dir"
  printf '%s' "$entry" > "$dir/entry.txt"
  local prompt
  if [ "$tool" = Write ]; then
    prompt="Use the Write tool, not the shell, to overwrite docs/LESSONS.md with its current content followed by a blank line and then the exact text of entry.txt. Do not change the entry text. Do not use Bash."
  else
    prompt="Use the Edit tool, not the shell, on docs/LESSONS.md: replace the first line '# Lessons' with '# Lessons' followed by a blank line and then the exact text of entry.txt. Do not change the entry text. Do not use Bash."
  fi
  (cd "$dir" && claude -p "$prompt" --plugin-dir "$PLUGIN" --permission-mode acceptEdits --output-format json \
      --allowedTools "Read,Write,Edit" > "$dir/result.json" 2> "$dir/stderr.txt")
  local landed=0
  grep -q "The export header was blank" "$dir/docs/LESSONS.md" && landed=1
  # The deny reason is shown to the model, not written to the result; what the
  # result carries is permission_denials, one per refused tool call.
  local denied
  denied="$(node -e 'const r=require(process.argv[1]);console.log((r.permission_denials||[]).some(d=>/^(Write|Edit)$/.test(d.tool_name)&&/LESSONS\.md$/.test(d.tool_input?.file_path||""))?1:0)' "$dir/result.json" 2>/dev/null || echo 0)"
  case "$expect" in
    denied) if [ "$landed" -eq 0 ] && [ "$denied" -eq 1 ]; then echo "  ✓ $name: denied, nothing landed"; else echo "  ✗ $name: expected a denial (landed=$landed denied=$denied)"; fails=$((fails+1)); fi ;;
    landed) if [ "$landed" -eq 1 ]; then echo "  ✓ $name: landed"; else echo "  ✗ $name: expected the entry to land (denied=$denied)"; fails=$((fails+1)); fi ;;
  esac
}

echo "== ledger gate, driven through Claude Code =="
arm write-bare  Write "$BARE" denied
arm write-good  Write "$GOOD" landed
arm edit-bare   Edit  "$BARE" denied
arm edit-good   Edit  "$GOOD" landed
echo
if [ "$fails" -eq 0 ]; then echo "All four arms behaved. Scratch: $SCRATCH"; else echo "$fails arm(s) failed. Scratch: $SCRATCH"; fi
exit "$fails"
