#!/usr/bin/env bash
# Mechanical checks for the learn-from-bugs skill. Structure only, and safe to run
# anywhere: the PHI screen is scripts/phi-screen.sh (local, never CI, because it
# reads an uncommitted word list) and triggering is `claude plugin eval`
# (informative, not blocking).
set -uo pipefail
cd "$(dirname "$0")/.."

SKILL="plugins/learn-from-bugs/skills/learn-from-bugs/SKILL.md"
REFS="plugins/learn-from-bugs/skills/learn-from-bugs/references"
REF_BUDGET=200
# Per-file override. history-sources.md is the canonical home for retrieval:
# every other file points at it and may not restate it, which the tracker-name
# check below enforces. So it is structurally the largest reference and grows with
# each source the ecosystem adds. A uniform cap across files with different jobs was the wrong shape; this
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

echo "== step headings are 1..8, in order, no gaps =="
steps="$(grep -oE '^## [0-9]+\.' "$SKILL" | grep -oE '[0-9]+' | tr '\n' ' ')"
if [ "$steps" = "1 2 3 4 5 6 7 8 " ]; then pass "steps: $steps"
else fail "expected '1 2 3 4 5 6 7 8', got '$steps' (a step was lost, added, or reordered)"; fi

echo "== README's numbered list matches the step count =="
readme_steps="$(grep -cE '^[0-9]+\. \*\*' README.md)"
if [ "$readme_steps" = "8" ]; then pass "README lists 8 steps"
else fail "README lists $readme_steps steps, SKILL.md has 8 — the two have drifted"; fi

echo "== retrieval guidance lives in exactly one file =="
for tracker in Linear Jira Shortcut "Azure DevOps" Slack Discord Zendesk Intercom Sentry Pendo Amplitude FullStory; do
  hits="$(grep -rlF "$tracker" "$REFS" "$SKILL" 2>/dev/null | grep -v 'history-sources.md' || true)"
  if [ -z "$hits" ]; then pass "$tracker only in history-sources.md"
  else fail "$tracker also appears in: $(echo "$hits" | tr '\n' ' ')— retrieval has one home"; fi
done

echo "== agent-testing guidance lives in exactly one file =="
# Same rule as retrieval above, for the same reason, learned the harder way. The
# section in SKILL.md summarised agent-and-context.md well enough to act on, so a
# 2026-09-01 trigger run fired the skill, answered from the summary, and never
# opened the file the section tells it to open. A summary complete enough to
# satisfy a reader is a summary that replaces the read. Names of the three holes
# stay in SKILL.md; the procedure does not. Phrases are load-bearing lines from
# the reference, not vocabulary, so a restatement trips this and a passing
# mention does not.
for phrase in "independent source of truth" "Transcripts are not storage" "hook or CI check" "felt sense" "carries no information"; do
  hits="$(grep -rlF "$phrase" "$REFS" "$SKILL" 2>/dev/null | grep -v 'agent-and-context.md' || true)"
  if [ -z "$hits" ]; then pass "\"$phrase\" only in agent-and-context.md"
  else fail "\"$phrase\" also appears in: $(echo "$hits" | tr '\n' ' ')— the summary is regrowing"; fi
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
step7="$(sed -n '/^## 7\./,/^## 8\./p' "$SKILL")"
critic_qs="$(printf '%s' "$step7" | grep -cE '^[0-9]+\. ')"
if [ "$critic_qs" = "5" ]; then pass "the critic pass is five questions"
else fail "step 7 lists $critic_qs numbered questions, and its text says five"; fi
# The pass is only a pass if a different reader runs it. An author answering the
# five at the end of their own turn is the self-audit the skill rejects about
# tests, so the step has to say where it runs, not only what it asks.
if printf '%s' "$step7" | grep -qi 'fresh context' && printf '%s' "$step7" | grep -qi 'subagent'; then
  pass "step 7 dispatches to a reader without the author's context"
else fail "step 7 no longer says where it runs, so it reads as a self-audit"; fi
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

echo "== the step count is stated consistently everywhere =="
# Prose that counts the steps is invisible to the ordering check above: a
# renumber leaves "step 2 of 7" and "the seven steps" behind, reading as correct.
# examples.md is exempt at one line, where "the seven steps were still seven"
# recounts an incident that happened when there were seven.
n_steps="$(grep -cE '^## [0-9]+\.' "$SKILL")"
words="one two three four five six seven eight nine ten"
want_word="$(echo "$words" | cut -d' ' -f"$n_steps")"
bad="$(grep -rnE "step [0-9]+ of [0-9]+" "$SKILL" "$REFS" README.md | grep -vE "of $n_steps\b" || true)"
if [ -z "$bad" ]; then pass "\"step N of $n_steps\" is current everywhere"
else fail "stale step total: $(echo "$bad" | head -2)"; fi
# Scoped to "the N steps", which is how the procedure is referred to. A bare
# "in seven steps" would still pass, and so would a count written as a numeral.
wrong_word="$(grep -rniE "the (one|two|three|four|five|six|seven|eight|nine|ten) steps" "$SKILL" "$REFS" README.md \
  | grep -viE "the $want_word steps" | grep -v 'examples.md:.*still seven' || true)"
if [ -z "$wrong_word" ]; then pass "spelled-out step count is \"$want_word\" everywhere"
else fail "stale spelled-out step count: $(echo "$wrong_word" | head -2)"; fi

echo "== references cross-link only to references that exist =="
# check.sh already walks SKILL.md both ways. References cite each other too, and
# nothing was reading those.
xbad=0
for f in "$REFS"/*.md; do
  for target in $(grep -oE '`[a-z-]+\.md`' "$f" | tr -d '`' | sort -u); do
    case "$target" in SKILL.md|CLAUDE.md) continue ;; esac
    [ -f "$REFS/$target" ] || { fail "$(basename "$f") cites $target, which does not exist"; xbad=1; }
  done
done
[ "$xbad" -eq 0 ] && pass "every reference-to-reference citation resolves"

echo "== nothing cites the removed PLAN document =="
# The PLAN was deleted; three header comments went on citing it by section for
# some time afterwards, reading as authority and resolving to nothing. A citation
# to any other missing document would still slip past this.
stale_plan="$(grep -rn 'PLAN §' scripts "$SKILL" "$REFS" README.md docs 2>/dev/null \
  | grep -v 'stale_plan=' || true)"
if [ -z "$stale_plan" ]; then pass "no PLAN citations"
else fail "cites a document that does not exist: $(echo "$stale_plan" | head -2)"; fi

echo "== step 6 states the closed sets the gate enforces =="
# The block's fields are closed sets in ledger-gate.mjs. Step 6 is where a
# reader learns them, and prose that drifts from the exported sets teaches a
# shape the gate refuses. Grep each value out of the hook and require it in the
# step 6 section. The nomination sentence gets its own assertion because it is
# prose describing a rule, not a value: it said "the commit at HEAD" for a day
# after the rule stopped always reading HEAD.
# Scoped to the fenced block, not the whole section: "none" and "process" and
# "contract" all occur in step 6's prose, so a section-wide grep passed for a
# value the block had dropped. Watched failing on a dropped "misunderstood" and,
# after the narrowing, on a dropped "none" too.
step6="$(sed -n '/^## 6\. Record it/,/^## 7\./p' "$SKILL" | sed -n '/^```$/,/^```$/p')"
gate="plugins/learn-from-bugs/hooks/ledger-gate.mjs"
sets_ok=1
for value in call-site contract convention process missing unread unrecorded misunderstood none same-theme adjacent unrelated; do
  grep -qF "'$value'" "$gate" || { fail "\"$value\" is not a closed-set value in ledger-gate.mjs"; sets_ok=0; }
  printf '%s' "$step6" | grep -qF "$value" || { fail "step 6's block never offers the closed-set value \"$value\""; sets_ok=0; }
done
[ "$sets_ok" -eq 1 ] && pass "step 6 names every closed-set value the gate enforces"
step6_prose="$(sed -n '/^## 6\. Record it/,/^## 7\./p' "$SKILL")"
if printf '%s' "$step6_prose" | grep -q 'since the log was last committed'; then
  pass "step 6 states the touched-file rule the gate implements"
else
  fail "step 6 no longer describes how the gate picks the files this fix touches"
fi

echo "== published files never cite a maintainer note =="
# Plans, proposals and handoffs live in docs/internal/, which is gitignored so
# clients do not see them. A published file citing one points at a path that
# does not exist in the clone, the same class as the removed PLAN citations
# above, with the extra cost that the reader learns an internal document exists.
internal_cite="$(grep -rnE 'docs/internal|PROPOSAL-20[0-9]{2}|HANDOFF-20[0-9]{2}|PLAN-20[0-9]{2}' \
  README.md docs/LESSONS.md docs/PRINCIPLES.md evals scripts "$SKILL" "$REFS" 2>/dev/null \
  | grep -v 'internal_cite=' | grep -v '^scripts/check.sh:.*#' || true)"
if [ -z "$internal_cite" ]; then pass "no published file cites an internal document"
else fail "published file cites an internal document: $(echo "$internal_cite" | head -2)"; fi

echo "== README names every reference =="
# README's structure paragraph lists the reference files by name. Nothing read it,
# so it sat at seven while references/ held ten. A file named there but deleted
# would still slip past this.
rmiss=""
for f in "$REFS"/*.md; do
  grep -qF "$(basename "$f")" README.md || rmiss="$rmiss $(basename "$f")"
done
if [ -z "$rmiss" ]; then pass "README names all $(ls "$REFS"/*.md | wc -l | tr -d ' ') references"
else fail "README's structure list is missing:$rmiss"; fi

# SKILL.md has no cap. It had one from the first commit, never earned by an
# incident, and it was raised three times on 2026-09-02 alone. See
# docs/LESSONS.md, 2026-09-02. The reference caps below stay: references exist
# to hold what SKILL.md pushed out, so a 200-line reference is a failed split.
echo "== reference length budgets =="
for f in "$REFS"/*.md; do
  n="$(grep -c "" "$f")"
  case "$(basename "$f")" in
    history-sources.md) budget="$REF_BUDGET_history_sources" ;;
    *) budget="$REF_BUDGET" ;;
  esac
  if [ "$n" -le "$budget" ]; then pass "$(basename "$f") $n/$budget lines"
  else fail "$(basename "$f") is $n lines, budget $budget. Cut it, or raise the cap in a comment naming what was considered for removal."; fi
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
