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
# examples.md carries the worked output rather than describing it, so every one
# of its five sections ends in a step 6 block and the theme example carries a
# second kind. Six blocks are about 80 lines that cannot be paraphrased: a block
# is the shape, and a shortened one is a different shape. Considered for removal
# before the cap moved: the log-entry blockquotes (kept, they are the entry the
# block belongs to), the second illustrative sketch in example 5 (kept, it is the
# only worked shape for the misunderstood bucket), and the "Reading the blocks"
# preamble (cut by half, not dropped, because a row that resolves in no log is
# the first thing a reader copies wrong). 200 was the cap when the file carried
# no blocks at all.
#
# 300 -> 320 on 2026-09-11, for the worked `none` case. A reviewer's argument for
# it is the one that moved this: a bucket taught as a rule with no worked case is
# what sent two readers to two different answers and cost a release. `none` was
# the last bucket with no case. Twenty-one lines of prose were cut first, all of
# it restating what a block below it already said, and the cut stopped where it
# started costing teaching rather than repetition. Considered and refused: cutting
# the log-entry blockquotes, and dropping the sketch instead of moving the cap.
# This cap moved on 2026-09-10 as well, which is once too often for comfort; the
# next increase should be a reason to split the file, not to raise it again.
REF_BUDGET_examples=320
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

echo "== the tree-rewriting rule is stated for whoever holds the work =="
# It was stated, correctly, in critic-pass.md, naming `git checkout -- <file>` and
# its exact consequence, and addressed to the critic. The author ran that command
# on the live tree the next day and discarded two sessions of uncommitted edits.
# The rule was not missing and was not misread; its scope excluded the reader who
# needed it. Step 1 is the general home. Every other file points at it and may not
# restate the command list, the same single-home rule as retrieval and
# agent-testing above, so the scope cannot silently narrow again.
# Every form, not one of them. The first version of this check greppped for
# `git checkout -- ` alone, so the other five could be deleted and it stayed
# green: the check was narrower than the rule it guarded, which is the incident it
# exists to catch, reappearing inside its own fix. A fresh critic measured it.
step1="$(sed -n '/^## 1\./,/^## 2\./p' "$SKILL")"
missing=""
for c in 'git checkout -- ' 'git checkout <ref> -- ' 'git restore ' 'git reset --hard' 'git clean -f' 'git stash'; do
  printf '%s' "$step1" | grep -qF "$c" || missing="$missing \`$c\`"
done
if [ -n "$step1" ] && [ -z "$missing" ] && printf '%s' "$step1" | grep -qi 'run on a copy'; then
  pass "step 1 names all six tree-rewriting forms and the copy rule"
else fail "step 1 no longer states the whole rule; missing:${missing:- the copy rule}"; fi
# Searched: every published .md and .mjs under plugins/, plus README.md and
# docs/. Stated exemptions. SKILL.md owns the list. docs/LESSONS.md records the
# commands that caused the incidents. The gitignored maintainer-note directory is
# pruned in the find rather than named in the case, so this line does not itself
# trip the citation check below.
# ledger-gate.mjs and its test name the same
# subcommands as the ones held out of ALLOWED, which is a statement about what the
# gate executes, not about the tree. The file count is asserted because the first
# version searched two paths, reported repo-wide, and would have gone green if
# either path were renamed: a negative case that reads as a pass, which is the
# 2026-09-01 entry.
searched=0
restated=""
for f in $(find plugins/learn-from-bugs README.md docs -type d -name internal -prune -o \( -name '*.md' -o -name '*.mjs' \) -print | sort); do
  case "$f" in */SKILL.md|*/LESSONS.md|*/ledger-gate.mjs|*/ledger-gate.test.mjs) continue ;; esac
  searched=$((searched + 1))
  hit="$(grep -n 'git checkout\|git restore\|git reset --hard\|git clean -f\|git stash' "$f" || true)"
  [ -n "$hit" ] && restated="$restated $f:$(printf '%s' "$hit" | head -1 | cut -c1-60)"
done
if [ "$searched" -lt 10 ]; then fail "the restatement search covered only $searched files, so the paths have moved and this check is measuring nothing"
elif [ -z "$restated" ]; then pass "none of the $searched files searched restates the command list step 1 owns"
else fail "the command list is restated outside step 1:$restated"; fi

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
# Step 6 carries two fenced blocks now, the incident one and the theme one. A
# single range over both let every assertion below be satisfied by the wrong
# block: deleting Bucket: from the incident block passed, because the theme
# block still offered its values, and deleting the theme referent passed because
# the incident Landed: line matched. Each block is extracted on its own and each
# rule is asserted against the block that owns it. Watched failing on both.
step6_section="$(sed -n '/^## 6\. Record it/,/^## 7\./p' "$SKILL")"
step6_issue="$(printf '%s' "$step6_section" | awk '/^```$/{n++; next} n==1')"
step6_theme="$(printf '%s' "$step6_section" | awk '/^```$/{n++; next} n==3')"
# Emptiness was the wrong assertion. The awk counts bare fences only, so a
# language tag on the theme block's opening fence shifts the count and
# step6_theme silently becomes step 6's trailing prose, which is non-empty and
# passed. Assert the shape each block must have: the incident block opens with
# Class: and the theme block with Theme:.
if printf '%s\n' "$step6_issue" | head -1 | grep -q '^Class:' \
   && printf '%s\n' "$step6_theme" | head -1 | grep -q '^Theme:'; then
  pass "step 6 carries both blocks, extracted separately"
else
  fail "step 6's blocks no longer extract as an incident block opening Class: and a theme block opening Theme:; the per-block assertions below would be checking nothing"
fi
gate="plugins/learn-from-bugs/hooks/ledger-gate.mjs"
sets_ok=1
# The two lists used to be typed out here, which is a restatement of what the
# gate defines and drifts the moment the gate gains a value: `not-a-member`
# landed in MEMBER_DISPOSITIONS and this check stayed green while SKILL.md could
# have lost it entirely. They are read off the module's own exports now, so a new
# closed-set value is undocumented-until-documented rather than unnoticed.
values_of() { node --input-type=module -e "import('./$gate').then((m) => console.log([$1].join('\n')))"; }
issue_values="$(values_of '...m.LEVELS, ...m.BUCKETS, ...m.DISPOSITIONS')"
theme_values="$(values_of '...m.BUCKETS, ...m.MEMBER_DISPOSITIONS')"
if [ -z "$issue_values" ] || [ -z "$theme_values" ]; then
  fail "the gate's closed sets could not be read, so step 6 was checked against nothing"
  sets_ok=0
fi
for value in $issue_values; do
  printf '%s' "$step6_issue" | grep -qF "$value" || { fail "the incident block never offers the closed-set value \"$value\""; sets_ok=0; }
done
for value in $theme_values; do
  printf '%s' "$step6_theme" | grep -qF "$value" || { fail "the theme block never offers the closed-set value \"$value\""; sets_ok=0; }
done
[ "$sets_ok" -eq 1 ] && pass "step 6 names every closed-set value the gate enforces"
step6_prose="$(sed -n '/^## 6\. Record it/,/^## 7\./p' "$SKILL")"
if printf '%s' "$step6_prose" | grep -q 'since the log was last committed'; then
  pass "step 6 states the touched-file rule the gate implements"
else
  fail "step 6 no longer describes how the gate picks the files this fix touches"
fi
# The mint shape, asserted against the block rather than the prose for the reason
# given above. A mint that is only a reason registers that reason as the label,
# and until 2026-09-04 a mint registered nothing at all, so the label reuse the
# backward sweep runs on had never once worked.
if printf '%s' "$step6_issue" | grep -qF 'new — <the label>; <why' && printf '%s' "$step6_theme" | grep -qF 'new — <the label>; <why'; then
  pass "step 6's block shows the mint shape, naming the label before the reason"
else
  fail "step 6's block no longer shows a mint that names its label first, which is what joins the reusable set"
fi
# The prior row names an entry, not a day. Asserted against the block because the
# block is what an agent copies: three days in this repo's own log carry more
# than one entry and one carries seven, so a bare date was a verdict on all of
# them and the gate scored it as a match. Watched failing against the old
# "- YYYY-MM-DD: same-theme" line.
if printf '%s' "$step6_issue" | grep -qE '^- YYYY-MM-DD <[^>]*heading>:.*same-theme'; then
  pass "step 6's block shows a prior row keyed to an entry, not to a day"
else
  fail "step 6's block no longer asks a prior row to name which entry on that day was read"
fi
if printf '%s' "$step6_theme" | grep -qE '^- YYYY-MM-DD <[^>]*heading>:.*qa'; then
  pass "the theme block shows a member row keyed to an entry, not to a day"
else
  fail "the theme block no longer asks a member row to name which entry on that day it means"
fi
if printf '%s' "$step6_theme" | grep -qE '^Landed:.*,.*(path|referent)'; then
  pass "the theme block shows a landed row ending in a referent"
else
  fail "the theme block no longer shows a Landed row ending in something the fix touched, which is the only thing stopping a theme entry from being prose"
fi
# Every deny code the gate defines is named in the test file, which is the rule
# that file opens with. The first version of this asserted one code by name,
# which goes green on the identifier appearing in a comment and says nothing
# about the next code somebody adds: a check answering a cheaper question than
# its rule, which is the 2026-09-01 entry. A code named only in a comment still
# slips past this, and the test file's own header is what asks for the red run.
gate_test="plugins/learn-from-bugs/hooks/ledger-gate.test.mjs"
audit="scripts/gate-existing-entries.mjs"
audit_test="scripts/gate-existing-entries.test.mjs"
untested=""
for code in $(grep -o 'deny_[a-z_]*' "$gate" | sort -u); do
  grep -qF "$code" "$gate_test" || untested="$untested $code"
done
for code in $(grep -o 'deny_[a-z_]*' "$audit" | sort -u); do
  grep -qF "$code" "$audit_test" "$gate_test" || untested="$untested $code"
done
if [ -z "$untested" ]; then pass "every deny code the gate defines is named in its tests"
else fail "deny codes with no test:$untested"; fi

echo "== the log satisfies the gate that guards it ==" 
# The gate reads only the entries a write adds, so everything already on disk is
# invisible to it. A grammar change therefore lands green beside a log full of
# the shape it just started refusing, which is what happened on 2026-09-04: the
# prior row was re-keyed from a day to an entry and the log's own newest entry
# still said "- 2026-08-31: adjacent", one verdict standing for eight entries.
# Static grammar only. The script does not execute Sweep or Priors commands and
# does not ask git for nominations, because those observations were true when
# written and drift with the tree. See the header of the script for the scope
# and for what an entry has to be excused by name.
if node scripts/gate-existing-entries.mjs >/dev/null 2>&1; then
  pass "every entry in the log satisfies the grammar the gate enforces today"
else
  fail "$(node scripts/gate-existing-entries.mjs 2>&1 | head -1)"
fi

echo "== the worked examples satisfy the gate that guards the log =="
# The examples are prose in a reference, so the gate never runs against them, and
# a reference showing a shape the gate refuses teaches the wrong thing with
# nothing to catch it. Sibling of the audit above: same validator, same static
# scope. Greps were the alternative and were rejected, because an assertion that
# greps a region leaks the moment the region moves and it restates closed sets
# the gate already exports. Every arm is seen red in scripts/check-examples.test.mjs.
if node scripts/check-examples.mjs >/dev/null 2>&1; then
  pass "every block in examples.md satisfies the grammar the gate enforces today"
else
  fail "$(node scripts/check-examples.mjs 2>&1 | head -1)"
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
    examples.md) budget="$REF_BUDGET_examples" ;;
    *) budget="$REF_BUDGET" ;;
  esac
  if [ "$n" -le "$budget" ]; then pass "$(basename "$f") $n/$budget lines"
  else fail "$(basename "$f") is $n lines, budget $budget. Cut it, or raise the cap in a comment naming what was considered for removal."; fi
done

echo "== the unit suites run =="
# CI ran check.sh and nothing else, so the gate's own tests were green only when
# somebody remembered to run them locally. A contract asserted by a suite nothing
# executes is a check that cannot fail, which is the 2026-09-01 entry. The suites
# are wired here so CI runs them.
if command -v node >/dev/null 2>&1; then
  if node --test plugins/learn-from-bugs/hooks/ledger-gate.test.mjs scripts/gate-existing-entries.test.mjs scripts/check-examples.test.mjs >/dev/null 2>&1
  then pass "ledger-gate, gate-existing-entries and check-examples suites"
  else fail "unit suites failed; run: node --test plugins/learn-from-bugs/hooks/ledger-gate.test.mjs scripts/gate-existing-entries.test.mjs scripts/check-examples.test.mjs"; fi
else
  fail "node is not on PATH, so the unit suites did not run"
fi

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
