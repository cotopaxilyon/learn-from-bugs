#!/usr/bin/env bash
# Mechanical checks for the learn-from-bugs skill (PLAN §6, tier 1).
# Structure only — the PHI screen is scripts/phi-screen.sh (local, never CI)
# and triggering is `claude plugin eval` (informative, not blocking).
set -uo pipefail
cd "$(dirname "$0")/.."

SKILL="plugins/learn-from-bugs/skills/learn-from-bugs/SKILL.md"
REFS="plugins/learn-from-bugs/skills/learn-from-bugs/references"
SKILL_BUDGET=430
REF_BUDGET=200
# Per-file override. history-sources.md is the canonical home for retrieval by
# design (PLAN §3A) — every other file points at it and may not restate it — so it
# is structurally the largest reference and grows with each source the ecosystem
# adds. A uniform cap across files with different jobs was the wrong shape; this
# is a stated exception, not a cap raised on contact. Everything else stays at 200.
REF_BUDGET_history_sources=220
fails=0

fail() { printf '  ✗ %s\n' "$1"; fails=$((fails + 1)); }
pass() { printf '  ✓ %s\n' "$1"; }

echo "== references are reachable from SKILL.md =="
for f in "$REFS"/*.md; do
  name="$(basename "$f")"
  if grep -qF "$name" "$SKILL"; then pass "$name is pointed at"
  else fail "$name exists but SKILL.md never names it (an unread reference)"; fi
done

echo "== references named in SKILL.md exist =="
grep -oE 'references/[a-z-]+\.md' "$SKILL" | sort -u | while read -r ref; do
  if [ -f "plugins/learn-from-bugs/skills/learn-from-bugs/$ref" ]; then pass "$ref resolves"
  else printf '  ✗ %s\n' "SKILL.md points at $ref, which does not exist"; fi
done
grep -oE 'references/[a-z-]+\.md' "$SKILL" | sort -u | while read -r ref; do
  [ -f "plugins/learn-from-bugs/skills/learn-from-bugs/$ref" ] || exit 1
done || fails=$((fails + 1))

echo "== step headings are 1..7, in order, no gaps =="
steps="$(grep -oE '^## [0-9]+\.' "$SKILL" | grep -oE '[0-9]+' | tr '\n' ' ')"
if [ "$steps" = "1 2 3 4 5 6 7 " ]; then pass "steps: $steps"
else fail "expected '1 2 3 4 5 6 7', got '$steps' (a step was lost, added, or reordered)"; fi

echo "== README's numbered list matches the step count =="
readme_steps="$(grep -cE '^[0-9]+\. \*\*' README.md)"
if [ "$readme_steps" = "7" ]; then pass "README lists 7 steps"
else fail "README lists $readme_steps steps, SKILL.md has 7 — the two have drifted"; fi

echo "== retrieval guidance lives in exactly one file =="
for tracker in Linear Jira Shortcut "Azure DevOps" Slack Discord Zendesk Intercom Sentry Pendo Amplitude FullStory; do
  hits="$(grep -rlF "$tracker" "$REFS" "$SKILL" 2>/dev/null | grep -v 'history-sources.md' || true)"
  if [ -z "$hits" ]; then pass "$tracker only in history-sources.md"
  else fail "$tracker also appears in: $(echo "$hits" | tr '\n' ' ')— retrieval has one home"; fi
done

echo "== no unsupported claims about a population =="
# We have no survey data. Where we know *why* something happens, state the
# mechanism; do not dress it as a statistic. Deliberately narrow — these phrases
# have no defensible use here, while bare "everyone"/"nobody" often do.
claims='most teams|most people|most companies|most developers|most engineers|most analyses|most readers|most projects|everyone knows|nobody ever|studies show|research shows|in most cases|far more often'
hits="$(grep -rniE "$claims" "$SKILL" "$REFS" README.md 2>/dev/null || true)"
if [ -z "$hits" ]; then pass "no population claims"
else fail "unsupported population claim(s): $(echo "$hits" | head -3)"; fi

echo "== counts the model rests on =="
# Drifted counts are this repo's most-repeated defect: a number written when a
# list was one length, left behind when the list grew. Only assert counts that
# are load-bearing — for the rest, do not write the number at all.
wrong="$(grep -rniE '(two|three|five|six|seven) buckets' "$SKILL" "$REFS" README.md 2>/dev/null || true)"
if [ -z "$wrong" ]; then pass "the information model is four buckets everywhere"
else fail "bucket count drifted: $(echo "$wrong" | head -2)"; fi
holes="$(grep -rniE '(two|four|five) specific holes' "$SKILL" "$REFS" README.md 2>/dev/null || true)"
if [ -z "$holes" ]; then pass "the agent section is three holes everywhere"
else fail "hole count drifted: $(echo "$holes" | head -2)"; fi
if grep -qiE 'five real issues' README.md; then
  fail "README claims five real examples; examples.md labels one illustrative"
else pass "example provenance is stated honestly"; fi

echo "== the eval procedure gates on the registry =="
# A trigger run without a confirmed registry measures nothing, and its negative
# case reads as a pass. The rule was recorded in docs/LESSONS.md and never
# reached this file; that is the incident this check exists to close.
if grep -qi 'registry' evals/README.md; then
  pass "evals/README.md carries the registry precondition"
else
  fail "evals/README.md lost the registry precondition, so its procedure describes a run that measures nothing"
fi

echo "== length budgets =="
n="$(grep -c "" "$SKILL")"
if [ "$n" -le "$SKILL_BUDGET" ]; then pass "SKILL.md $n/$SKILL_BUDGET lines"
else fail "SKILL.md is $n lines, budget $SKILL_BUDGET — move material to references/, do not raise the cap"; fi
for f in "$REFS"/*.md; do
  n="$(grep -c "" "$f")"
  case "$(basename "$f")" in
    history-sources.md) budget="$REF_BUDGET_history_sources" ;;
    *) budget="$REF_BUDGET" ;;
  esac
  if [ "$n" -le "$budget" ]; then pass "$(basename "$f") $n/$budget lines"
  else fail "$(basename "$f") is $n lines, budget $budget — move material, do not raise the cap"; fi
done

echo "== manifests validate =="
if command -v claude >/dev/null 2>&1; then
  claude plugin validate . >/dev/null 2>&1 && pass "marketplace manifest" || fail "marketplace manifest"
  claude plugin validate plugins/learn-from-bugs >/dev/null 2>&1 && pass "plugin manifest" || fail "plugin manifest"
else
  echo "  – claude CLI not on PATH, skipping manifest validation"
fi

echo
if [ "$fails" -eq 0 ]; then echo "All checks passed."; else echo "$fails check(s) failed."; fi
exit "$fails"
