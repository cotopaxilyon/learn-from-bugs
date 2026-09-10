# Lessons

The incident log this skill asks every project to keep, kept on the skill itself.
Each entry is what happened, why nothing caught it, and the rule it produced.

Heading format is `## YYYY-MM-DD — Consequence`, never a sequence number. The
entry on parallel writers explains why.

The rules these produced live in [`PRINCIPLES.md`](PRINCIPLES.md) where no
mechanical check is possible, and in `scripts/check.sh` where one is. That is the
point of the log: entries here are inputs, and the checks are the output.

---

## 2026-09-04 — Thirteen entries in, the log had never once been able to reuse a label

**What happened.** Writing the entry below, the class that fitted was the one the
2026-09-03 entry had minted, "a wired check that cannot fire". The gate refused
it: `deny_class_unknown`, no such label in the log. `classLabelsIn` dropped every
`Class: new — ...` line before building the set, so a mint registered nothing.
The set could only ever grow from a bare label, and the gate refuses a bare label
unless it is already in the set. Unreachable by construction. Every entry the log
will ever hold has to mint again, and step 4's backward sweep, which runs on
labels being reused, had never had a label to find.

**Why nothing caught it.** Four unit tests covered the `Class:` field: an unknown
label is denied, a bare reused label passes, a justified mint passes, an empty
mint is denied. All four are true and the feature is still broken, because each
of them reads a set that the fixture had already been written with bare labels
in. The mint half and the reuse half were never run against each other. The
grammar had the same hole one level up: `Class: new — <why no existing label
fits>` names a reason and never a label, so even with the code fixed there was
nothing to register. Nobody wrote down that a mint owes the log a reusable label,
so no test could be missing. The other entry from this sitting is marked adjacent
rather than same-theme, and the line is thin: its class describes this escape
well, four checks each true inside its own stated scope. The defect itself is the
other one, a path that could never take effect, so the class names that.

**The rule.** Where a feature is a round trip, the test runs the trip. A test
that seeds the state the feature is supposed to produce cannot see that the
feature never produces it, and it reads exactly like a test that can.
`ledger-gate.test.mjs` now puts the minting entry through the gate and appends it
only once accepted, then reuses its label bare from a second entry. `SKILL.md`
step 6 asks for `new — <the label>; <why no existing label fits>`, and the gate
refuses a mint whose label is empty as well as one with no separator.
`scripts/check.sh` asserts that the block still shows that shape, and that every
deny code the gate defines is named in its tests. This entry is the first label
reuse the log has performed.

The first version of this fix carried the defect it closes. A mint written
`new — ; <reason>` cleared a separator-only check and still registered nothing,
and the test seeded the minted line by hand, so it could not see that. The
check.sh half asserted that one deny code appeared somewhere in the gate source,
which goes green on a comment. A fresh critic found all three. Third fix at this
level, too, which is the finding under the finding: 2026-09-01 and 2026-09-03
both landed this class at convention and so does this one, and step 4's altitude
check reads a run like that as the level being wrong rather than the fix.

A violation that would still pass: a mint whose label is a sentence nobody would
type again, which the gate cannot judge and the critic can, and a deny code named
only in a test file's comment.

The 2026-08-31 row below was migrated on 2026-09-09 from a day-keyed row that
named no entry at all. Eight entries share that day and the original said only
"2026-08-31", so the entry named here is a reconstruction on class similarity,
not a record of what was read. That is what a day-keyed row costs after the
fact, and it is why the key changed.

Class: a wired check that cannot fire
Instance: 3
Level: convention
Bucket: missing
Not one up: process would be a review step or a role over the test suite, and the surface that binds here is the test file itself
Sweep: `grep -n 'const v = \|onDisk: log' plugins/learn-from-bugs/hooks/ledger-gate.test.mjs` → 2 sites, the shared helper every Class test reads from a hand-written fixture, and the one log a test now produces
Sweep: `grep -n 'classLabelsIn' plugins/learn-from-bugs/hooks/ledger-gate.mjs` → 2 sites, one building the set and one reading it
Priors: `git log --date=short --format=%ad -- plugins/learn-from-bugs/hooks/ledger-gate.mjs plugins/learn-from-bugs/hooks/ledger-gate.test.mjs plugins/learn-from-bugs/skills/learn-from-bugs/SKILL.md scripts/check.sh` → 3 nominated
- 2026-08-31 Three trigger tests: adjacent
- 2026-09-01 Three gates failed while green: same-theme
- 2026-09-03 A gate shipped green: same-theme
- 2026-09-04 A command run to answer: adjacent
Landed: 2 ledger-gate.test.mjs runs the mint-then-reuse trip through the gate and refuses an empty-label mint, red: both fail against the gate as shipped, and the empty-label case fails again against the separator-only check this fix first shipped with
Landed: 1 scripts/check.sh asserts step 6's block shows the mint shape and that every deny code the gate defines is named in its tests, red: each half watched failing separately on a copy, the second against a renamed deny code
Landed: 3 SKILL.md step 6 states that a mint names its label before its reason, and why the order matters
Critic: ran

---

## 2026-09-04 — A command run to answer a readable question discarded two sessions of uncommitted work

**What happened.** A question came up about what `SKILL.md` had said earlier in
the day. Answering it needed a read. What ran instead was
`git checkout -- SKILL.md`, which restores the file from the index and discards
uncommitted changes without printing anything, and two sessions of edits to that
file went with it. They were recovered in full from a copy made earlier for an
unrelated run, and verified by diff: only the three intended edits differed. Git
reported success and said nothing about what it had overwritten.

**Why nothing caught it.** Two controls covered this and both were narrower than
the hazard. `references/critic-pass.md` named that exact command and that exact
consequence, in a paragraph addressed to the critic dispatched at step 7. The
author was not the critic, and the paragraph did not speak to them. The session's
own permission deny list enumerated the destructive git commands it knew about,
`reset --hard`, `clean -f`, `push --force`, `branch -D`, `filter-branch`, and
stopped there. `git checkout -- <file>` and `git restore <file>` were not on it,
so the command ran with no refusal; probed again in a throwaway repo, the form
still runs unrefused and still discards the uncommitted line. Neither control was
missing and neither was misread. Each stated its scope plainly, each scope
excluded this case, and a stated scope reads as deliberate, so a reader who meets
one has no reason to check it against the category of hazard it names. That is
the 2026-09-01 scoped-grep entry in a second form: there a two-path grep
authorized an absolute sentence, here a five-command list and a one-role
paragraph authorized a general sense of being covered. The other 2026-09-01 rule,
that a check is not landed until it has been watched red against its defect,
would have found both. It is written about the checks you land in step 5, and
these were controls already in place, inherited and relied on.

**The rule.** A control is only as wide as the case you have watched it refuse,
and that holds for controls somebody else wrote. The command list and the copy
rule now live in `SKILL.md` step 1, addressed to whoever is holding the work, and
`references/critic-pass.md` points at them rather than owning them.
`scripts/check.sh` asserts that step 1 names all six command forms and the copy
rule, and that none of the published markdown and hook sources it searches
restates the list, with its exemptions named in the check and its file count
asserted so a renamed path fails loudly instead of going green. Both assertions
were written first with this entry's own defect in them: one grepped for a single
form of the six, the other searched two paths and read as repo-wide. A fresh
critic measured that, which is the only reason they are stated correctly here. A
violation that would still pass: a restatement in a file outside that search, or
one that contradicts step 1 rather than repeating its commands. The deny-list
hole is not closed here, because an agent cannot edit its own permission list, by
design, so that patch belongs to whoever maintains the settings file.

Class: new — a control or a claim whose stated scope is narrower than the hazard it names; the 2026-09-01 scoped-grep entry is this class, which carried no label when this was written
Instance: 2
Level: convention
Bucket: unread
Not one up: process would be a standing audit of every inherited control against its hazard category, and two instances do not buy a recurring phase
Sweep: `grep -rn 'git checkout' plugins/learn-from-bugs/skills/learn-from-bugs` → 1 line, in SKILL.md step 1
Sweep: `grep -rn 'run on a copy' plugins/learn-from-bugs/skills/learn-from-bugs README.md docs/PRINCIPLES.md` → 1 line, in SKILL.md step 1
Priors: `git log --date=short --format=%ad -- plugins/learn-from-bugs/skills/learn-from-bugs/SKILL.md plugins/learn-from-bugs/skills/learn-from-bugs/references/critic-pass.md scripts/check.sh` → 2 nominated
- 2026-08-31 Correct install instructions: adjacent
- 2026-09-01 A scoped grep: same-theme
- 2026-09-04 Thirteen entries in: adjacent
Landed: 1 scripts/check.sh asserts step 1 names all six command forms and that no published file restates the list, red: with the step 1 paragraph deleted, with two of the six forms deleted, against a reconstruction of the original critic-pass wording, against a restatement in a file the first version did not search, and against a renamed search path that the first version would have passed, all on a copy
Landed: 6 the command list and the copy rule moved out of references/critic-pass.md, where they addressed the critic, into SKILL.md step 1, where they address whoever holds the work
Critic: ran

---

## 2026-09-03 — A gate shipped green and could not fire, because its filter was not a permission rule

**What happened.** The first version of `hooks/ledger-gate.mjs` landed with one
`hooks.json` handler filtered by `"if": "Write|Edit(**/LESSONS.md)"`. Fourteen
unit tests passed, `check.sh` passed, and the script refused a bare entry on
stdin. Driven through Claude Code, the handler never ran: the `if` field holds
exactly one permission rule, `Write|Edit(...)` is not one, and a handler whose
rule does not parse is skipped without a message. A bare entry landed in the log
with an empty `permission_denials` list. A fresh-context critic found it by
running four arms that differed in the `if` value alone.

**Why nothing caught it.** Every check exercised the script and none exercised
the wiring. The tests drive `decide()` and stdin; `check.sh` reads files; the
replay of this log's newest entry went through stdin too. A hook that cannot
fire produces the same output as a hook with nothing to refuse, so green was the
only colour available. The 2026-09-01 entry names this class for other people's
checks and the repo did not apply it to its own first hook.

**The rule.** A hook is not landed until it has been driven through the harness
that runs it and seen to refuse. `evals/drive-ledger-gate.sh` does that in four
arms, Write and Edit, bare and complete, and `LFB_PLUGIN_DIR` points it at a copy
carrying the original wiring so the red run stays reproducible. The wiring is now
two handlers, one rule each.

Class: new — a wired check that cannot fire; the 2026-09-01 entry is this class, which carried no label when this was written
Instance: 2
Level: convention
Bucket: unread
Not one up: process would be a release checklist line, and a line can only point at the drive script, which is the convention itself
Sweep: `grep -n '"if"' plugins/learn-from-bugs/hooks/hooks.json` → 2 handlers, one rule each
Priors: `git log --date=short --format=%ad -- plugins/learn-from-bugs/hooks scripts/check.sh` → 2 nominated
- 2026-09-01 Three gates failed while green: same-theme
- 2026-08-31 Three trigger tests: adjacent
Landed: 2 evals/drive-ledger-gate.sh, red: with the original single handler both bare arms land and permission_denials is empty (drive-red, 2026-09-03)
Landed: 3 SKILL.md step 6 now lists what the gate checks and what it leaves to the critic
Critic: ran

## 2026-09-02 — A cap nobody had earned moved three times in one day

**What happened.** `SKILL.md` had a line cap in `check.sh` from the first commit.
It fired four times on 2026-09-02 and was raised every time: 440 to 470 for a
class-minting block, to 476 when an earlier cut was reverted, to 480 for the
mechanism rank. Each raise was argued in a comment. All four were allowed.

**Why nothing caught it.** The cap was 430 when the file was 423 lines, so the
number was the current length plus seven, and the commit that added it cited a
PLAN section in a document that has since been deleted. No entry in this log
records a time `SKILL.md` was too long, and `PRINCIPLES.md` makes no argument for
a ceiling. Every other check here was written after something went wrong. This one
was written after nothing, so there was no failure behind it to hold a raise
against, and the review it forced was always going to end in yes.

**The rule.** A check in `check.sh` owes an entry in this log. Where the entry
would be blank, the check is guessing at a cost nobody has paid, and it will teach
whoever meets it that the rule is negotiable, which is worse than the absence of a
rule. The `SKILL.md` cap is deleted. The reference caps stay, because references
exist to hold what `SKILL.md` pushed out and a 200-line reference is a failed
split rather than a long file.

The real concern the cap was reaching for is stated better in
`references/agent-and-context.md`: attention is finite even when the tokens are
present, and a rule buried on page four has the failure mode of a requirement
buried in comment fourteen. That is about what competes for attention, which a
line count does not measure.

**A note on this entry's own Sweep.** The sweep was not run, and it was written up
as though it had been. `check.sh` has 15 check sections and this log had 11
entries before this one, so whether each check traces to an entry is open and is
the first thing to settle. Recording it this way rather than deleting it, because
a fabricated sweep in the entry that argues checks must be earned is the more
useful artifact. Mechanism 3, a written-down rule, because a check asserting that
every check cites an incident would have to parse prose that this file does not
write in a fixed shape.

Class: a check with no incident behind it

## 2026-09-01 — The critic proposed for step 7 was the self-audit this skill rejects

**What happened.** The session write-up that produced today's other two entries
also proposed a critic pass, and argued for it well: a general "review this
analysis" read shares the author's frame and blesses it, so the questions have to
be answerable without re-deriving the analysis. It landed as five questions at the
end of the author's own turn, which is the same reader auditing their own work,
and that is the exact argument the skill makes about a suite written by the author
of the code. Three of the five also re-ask rules
that steps 3, 4 and 5 now carry upstream, so a self-answered version adds
ceremony without adding a reader.

**Why nothing caught it.** The proposal made the same-reader argument about tests
and exempted itself from it, and nothing in the skill asked where a new step runs.
Every existing structural check reads what a step says, not who executes it, so a
step that names no executor passes every one of them.

**The rule.** A critic pass runs in a context that does not have the author's, so
a subagent, a separate session, or a person who was not in the work, and its brief
is the artifacts rather than the reasoning. Where no fresh reader is available,
record that the pass did not run, since a step answered by the author reads as
done. `scripts/check.sh` asserts that step 7 still names where it runs, and the
assertion was watched failing against a step 7 with that wording removed.

Class: new — a review run by the same author it is meant to check; no existing label names a control invalidated by sharing the author's context rather than by scope or wiring

---

## 2026-09-01 — Three gates failed while green, and the skill never asked whether they could fail

**What happened.** One session ran eleven tickets through this skill in a day.
Three of the day's defects were guarded by checks that were
written deliberately, ran in CI, and were green for the entire life of the defect
they existed to catch. A grep asking "does any file re-derive a day inline" could
not see two accessors inside the exempt file disagreeing with each other. A grep
asking "does fetch appear before the cache read" could not see that
`fetch(req).catch(...)` has that exact shape and still serves a 401. A unit suite
grew by twenty-two tests in the same commit as a fix, and one of them asserted the
reported symptom as expected behavior. A fourth sat beside them: the suite had
only ever executed in the author's timezone and CI's, one of which is UTC, the one
timezone in which a UTC-versus-local defect cannot exist. Run elsewhere it failed
in five zones of ten, and one of those failures was a live defect misfiling data
for every user east of London.

**Why nothing caught it.** Step 5 ranked a runnable check above everything else
and warned that a guideline where a check was possible is folklore. Both are about
whether a check exists. Nothing in the skill asked whether the check that exists
can fail, so a check that answered a cheaper question than its rule asked read
as the
strongest fix available. Step 1's failing test is a different
artifact from the gate kept afterwards, and the skill never separated them.

**The rule.** A check is not landed until it has been run against the defect it
exists to catch and observed red; until then it is a hypothesis about a check.
Then describe a violation that would still pass it, because that sentence
specifies the next bug. Step 5 carries the rule,
`references/checks-that-cannot-fail.md`
carries the shapes, and step 5's history table now names "enforced by a check that
answers a cheaper question than the rule asks" as the first thing to test when a
rule already exists and is not working. `scripts/check.sh` cannot assert this for
other people's checks, so it asserts what it can here: this repo's own new count
check was written, watched failing against a deleted question, and only then kept.

Class: a wired check that cannot fire

---

## 2026-09-01 — A scoped grep became an absolute claim, then an acceptance criterion, then nearly a deletion

**What happened.** During a sideways sweep in the same session, a note recorded
that a module was "imported only by X" and that "nothing uses it." Neither had
been checked. What had actually run was a grep scoped to two paths, reported as an
absolute. The claim became a code comment, then an acceptance criterion offering
deletion, then the deletion. A failing import resolution stopped it, not a gate.

**Why nothing caught it.** Step 4 asked for the search to be named, but framed it
as a reporting convention ("'I did not find others' carries weight only when it
names the search"), which reads as a courtesy to the reader rather than as the
thing that keeps the claim true. And a scoped search reported as an absolute is
invisible in its own output, since a grep that excluded the answer looks exactly
like one that did not. The skill also had no line about what happens downstream: a
sweep finding that becomes a ticket loses its provenance and keeps its confidence,
gaining authority at each hop and being re-derived at none.

**The rule.** Report the search, not the conclusion, as a correctness rule in step
4 rather than a reporting one. Where the question is mechanically decidable,
compute it (the compiler, the import graph, a test run) instead of searching for
it. Anything that will authorize a deletion, a migration or an overwrite travels
with the command that produced it and not with the sentence it produced. The
critic pass added at step 7 asks it twice over, once as "which factual claim here
was not measured" and once as "is anything here destructive, and does its premise
hold."

Class: a control or a claim whose stated scope is narrower than the hazard it names

---

## 2026-08-31 — A fix recorded in this log had never reached the file it named

**What happened.** An earlier entry today recorded the rule that a trigger test
is invalid unless the registry is confirmed first, and stated that
`evals/README.md` "now opens with that check." It did not. The word registry
appeared nowhere in that file. The manual procedure still told a reader to open a
fresh session, type the four prompts, and record the result, with nothing
confirming the skill was in that session at all. Anyone following it would have
reproduced the exact invalid run the entry was written to prevent.

**Why nothing caught it.** The entry and the procedure are different artifacts,
and only the entry was written. Recording the rule felt like landing it, and the
entry's own past tense then stood as evidence that it had landed. Nothing reads
this log, so "a change landed" is the one class of claim in this repo with no
check behind it, in a repo whose entire argument is that unchecked claims drift.
It is the third bucket of its own information model: understood, agreed, and
captured somewhere other than where the work happens.

**The rule.** An entry may not claim a change landed unless the change is present
in the file it names, and where that is mechanical the check lands in the same
sitting. `scripts/check.sh` now asserts that `evals/README.md` carries the
registry precondition, so this particular claim cannot quietly become false
again. The general form is already in this file's own header: entries here are
inputs, and the checks are the output. An entry with neither a check nor a
verified file reference is a note, not a landing.

**A note on how it surfaced.** It was found by checking the log against the file
it cited, which nobody had done, because the log is the artifact everyone trusts
by construction. Both of today's late entries came from running or grepping
rather than reading. Reading this repo finds classes. Only running it finds
instances.

Class: new — a landed claim never checked against the file it names; no existing label names a claim of completed work that was never checked against the artifact it claims to have changed

---

## 2026-08-31 — A documented step vanished during a refactor and nothing noticed

**What happened.** The skill opened with "capture the failure before you touch
code," because steps 3 and 4 depend on evidence that step 2 destroys. During a
restructure that moved reference material into separate files, the step sat next
to a moved block and left with it. It was written, agreed, and simply gone.

**Why nothing caught it.** The document's structure was a convention, not an
assertion. Nothing could fail when it changed. It was found by a human reading
the file, which is not a gate.

**The rule.** If a document has a structure other things depend on, assert the
structure mechanically. `scripts/check.sh` now requires the step headings to be
exactly 1–7, in order. Prose cannot guard prose.

Class: new — structure guarded only by prose; no existing label names an implicit document structure that broke silently because nothing asserted it mechanically

---

## 2026-08-31 — The skill did not trigger on the case it claims to be best at

**What happened.** Given "QA Fail, it works exactly as built, it just shouldn't
be there for them," the skill did not activate. Its own body calls that case *"the
most valuable case here, because it usually means the issue never had a gate at
all."*

**Why nothing caught it.** The body and the `description` are different artifacts
maintained at different times, and only the description decides whether the skill
runs. Every structural check in the repo passes on a skill that never fires, so
the gap was invisible to all of them. The body's claim was never checked against
the trigger surface, because nothing connected the two.

**The rule.** Whatever the body claims the skill is best at, the description must
name in the words a user would type. A capability the trigger surface can't reach
does not exist. Verified behaviourally, not structurally, see `evals/`.

Class: new — a capability its own trigger surface can't reach; no existing label names two artifacts describing the same capability where only the narrower one is load-bearing and neither was checked against the other

---

## 2026-08-31 — Three trigger tests returned false negatives, and one read as a pass

**What happened.** Three agents were asked to run trigger cases. All three
reported the skill did not fire. The skill was not in their registry at all: it
had been created four hours into the session, and a session inherits its skill
list from startup. Nothing was being measured.

**Why nothing caught it.** The result looked exactly like a real result. Worse,
the negative case (the one that must *not* fire) reads as a pass when the
skill is simply absent, so the most reassuring number in the run was the emptiest.
The runs were only caught because each agent had been asked to report its skill
inventory *after* answering, where it couldn't prime the response.

**The rule.** A trigger test is invalid unless the registry is confirmed first.
`evals/README.md` now opens with that check. More generally: **when an absent
capability and a correct refusal produce identical output, the test measures
nothing**, go and confirm the capability was present.

Class: new — an absent capability and a correct refusal producing the same output; no existing label names a negative test result that reads as a pass whether or not the capability under test was even present

---

## 2026-08-31 — One agent's unreviewed conclusion came back looking like corroboration

**What happened.** An agent analysing a backlog reported a seven-ticket theme,
citing an incident-log entry as evidence. That entry was another agent's own
output, written during the same test round and never merged or reviewed. One
unverified claim had acquired the appearance of a second source.

**Why nothing caught it.** An agent-written artifact is indistinguishable from a
reviewed one (same file, same format, same conviction) and the backward sweep
read whatever was in the tree. Nothing said which branch counted as history.

**The rule.** **Unmerged work is not history.** Sweep the branch that ships;
anything unmerged is a proposal. Now stated in step 4 and in
`references/history-sources.md`.

Class: new — unmerged or unreviewed work treated as independent corroboration; no existing label names a second source that turns out to share the first source's own unreviewed origin

---

## 2026-08-31 — Sequential section numbers collided three ways in one day

**What happened.** Three agents each appended `## 2.` to the same incident log, at
the same line, in three different branches. Merging any two produces a conflict;
merging carelessly produces duplicate numbers with stable-looking references
pointing at different incidents.

**Why nothing caught it.** The convention said "append a numbered section, never
renumber existing ones", which assumes a single writer appending in turn. That
assumption was never stated, so it was never questioned, and it fails silently the
first time work runs in parallel.

**The rule.** Head entries with `## YYYY-MM-DD — Consequence`. A date and a
consequence collide only when two entries describe the same incident, which is a
collision worth seeing. Fixed here and in the upstream `craft:lesson` convention
this skill inherited it from.

Class: new — a convention that assumed a single writer, broken by concurrent ones; no existing label names an unstated single-writer assumption in a shared convention

---

## 2026-08-31 — The front page claimed provenance the artifact itself disclaimed

**What happened.** An external review of the published repo found `README.md`
advertising that `examples.md` "runs five real issues end to end," while
`examples.md` states plainly that the fifth is illustrative because no real
instance existed, and that "inventing history and presenting it as real is the
failure this skill exists to prevent." The landing page made exactly the claim the
skill forbids. `SKILL.md` had it right, saying only "five issues."

The same review found five drifted counts, "the fourteen ways" over a list of
twelve, "three holes" against "two specific holes" in two other files, "3b's three
buckets" directly above four of them, "ten accessibility bugs" in one paragraph
and nine in another, and a banned population claim, "Most teams handle a QA
finding by fixing it and moving on," sitting in the README's second paragraph.

**Why nothing caught it.** Two scoping gaps, same shape. The population-claim grep
was scoped to `SKILL.md` and `references/`, excluding the README, the file most
readers see and the one written in the most persuasive register, which is where
that kind of claim is most likely to appear and most damaging. And of roughly
twenty countable claims, exactly one (the step headings) had a mechanical
assertion behind it. The rest were trusted.

The repo's own rule, in `examples.md`, is "if a document has a structure other
things depend on, assert the structure mechanically." It was applied to step
headings and to nothing else.

**The rule.** Only assert counts that are load-bearing, and **for every other
count, do not write the number at all**, a number duplicating a list elsewhere is
a promise to update two things forever. `check.sh` now asserts the bucket count,
the hole count, and the example-provenance wording, and the population guard
covers the README. The first run of the new bucket check flagged a legitimate
sentence in `examples.md`; the fix was to delete the count, not to weaken the
check.

**A note on where this came from.** Five of today's entries were found by reading;
this one was found by an outside reviewer running the checks rather than reading
around them, and it killed nine of its own twelve candidates before reporting.
Self-review found the classes. It did not find the instances on the page everyone
reads first.

Class: new — a fact copied instead of computed; no existing label names a fact copied into a second document that then drifts from the source instead of being computed from it

---

## 2026-08-31 — Correct install instructions failed because two commands looked like one

**What happened.** Someone installing the plugin got *"'cotopaxilyon/learn-from-bugs
/plugin install learn-from-bugs@cotopaxilyon' is not a valid GitHub owner/repo
shorthand."* Both commands had arrived as a single argument. The address was
right, the commands were right, and the install failed.

**Why nothing caught it.** The README showed the two steps as adjacent fenced
blocks with nothing between them. A reader copying "the install commands" copies
both, and the first prompt swallows the pair. Nothing in the format said these run
one at a time, and the blocks were tagged `bash` although they are Claude Code
slash commands, so the other likely misread was pasting them into a terminal.

Every mechanical check in this repo passed, because the text was accurate. This is
the information layer's second bucket in its own right: correct, available, and
not surviving the route to the reader. "Paste more carefully" re-runs the thing
that already failed.

**The rule.** Sequential steps get **numbered labels and an explicit one-at-a-time
warning**, and a fence's language tag must match where the command actually runs.
Where copying a whole block *is* correct (the shell form) put the lines in one
block and say so. Format is part of the instruction, not decoration around it.

Class: new — correct content lost in the delivery route; no existing label names correct content that fails only in the format or delivery path to the reader

---

## 2026-09-09 — A test helper called the gate a way the gate is never called

**What happened.** `validateEntry` took `cwd` and an optional `logPath`. Given a
`cwd` and no `logPath`, it did not fail: `touchedFiles` fell back to the HEAD
commit, so the set of files "this fix touched" became whatever the last commit
held. A test helper omitted `logPath`, and in that fixture HEAD is the scaffold
commit carrying every file, so the touched set was never empty. Every assertion
about which files a `Landed:` row may point at ran green against a set that
could not be empty. The rule those assertions exist to enforce, that a referent
names something this work changed, was never exercised. A reviewer found the
underlying hole by construction: on a clean tree with no fix at all, creating one
empty file bought a passing row.

**Why nothing caught it.** The helper was written to be convenient rather than
faithful, and nothing compared it to the only production caller. `decide()`
always passes both arguments, so the configuration the tests exercised does not
occur in the shipped path at all. The fallback made this invisible in both
directions: it produced no error, and it produced a plausible answer, so the
suite was green and the green meant nothing. This is the 2026-09-04 entry's shape
one level out. There the tests seeded the label set the feature was supposed to
produce; here the helper seeded the argument that decides what gets checked. In
both, the test constructs the state it is meant to verify, and no count of
passing assertions can see it.

**The rule.** An optional argument that changes what a check examines is not
optional. `validateEntry` now throws when given a `cwd` without a `logPath`,
because the honest answers are the real path or `cwd: null`, which skips every
check that reads the repo and says so. Five call sites were on the fallback and
failed the moment the guard landed, which is the measurement. The general form:
a default that answers a different question instead of failing is where a check
goes to hide, and it hides from the suite as well as from the reader.

A violation that would still pass: a helper that passes a `logPath` pointing at
the wrong file, which the gate cannot tell from the right one.

Class: new — a silent fallback that answers a different question; the closest existing label, an absent capability and a correct refusal producing the same output, names a capability that was missing, and here the check is present and answering about an input nobody ships
Instance: 4
Level: contract
Bucket: missing
Not one up: convention was owed rather than rejected, and it landed the same day in the entry below, where every repo-reading export declares a cwd contract asserted against a list derived from the module's own source. This entry stays at contract because what it landed is one call-site guard; the sweep that generalised it belongs to that entry, which also records that this guard was written in the shape of the class it was written to kill.
Sweep: `grep -n 'catch { return \[\]' plugins/learn-from-bugs/hooks/ledger-gate.mjs` → 2 sites, both returning an empty set when git does not answer
Sweep: `grep -n 'cwd: dir, logPath' plugins/learn-from-bugs/hooks/ledger-gate.test.mjs` → 23 call sites now carry the log path beside the cwd
Priors: `git log --date=short --format=%ad -- plugins/learn-from-bugs/hooks plugins/learn-from-bugs/skills scripts/check.sh evals/drive-ledger-gate.sh` → 13 nominated
- 2026-08-31 A fix recorded in this log: adjacent
- 2026-08-31 A documented step vanished: unrelated
- 2026-08-31 The skill did not trigger: unrelated
- 2026-08-31 Three trigger tests: same-theme
- 2026-08-31 One agent's unreviewed conclusion: unrelated
- 2026-08-31 Sequential section numbers: unrelated
- 2026-08-31 The front page claimed provenance: unrelated
- 2026-08-31 Correct install instructions: unrelated
- 2026-09-01 The critic proposed for step 7: unrelated
- 2026-09-01 Three gates failed while green: same-theme
- 2026-09-01 A scoped grep: adjacent
- 2026-09-04 Thirteen entries in: same-theme
- 2026-09-04 A command run to answer: unrelated
Landed: 2 ledger-gate.test.mjs asserts the pair is refused and that cwd null still passes, red: five existing call sites were on the fallback and failed the moment the guard landed
Landed: 3 ledger-gate.mjs throws on cwd without logPath, naming both honest alternatives in the message
Critic: ran

---

## 2026-09-09 — The guard written to kill a class was written in the shape of the class

**What happened.** The morning's entry landed a guard: `validateEntry` throws when
given a `cwd` without a `logPath`, so a helper can no longer test a configuration
production never produces. The guard was a truthiness test, `if (cwd && !logPath)`.
`''` is falsy, so an empty `cwd` skipped the guard and then read as the documented
`cwd: null` safe mode, and every check that reads the repo was skipped in silence.
A real path, `"."` and an omitted `cwd` all denied. `''` and `null` were allowed,
and `cwd` is a payload field, so this was reachable from the only production
caller. Two more of the same shape sat beside it. `LFB_LOG_NAME=""` survived a
`??` default, no basename ever equalled it, and every write returned null with the
gate saying nothing at all. And `touchedFiles`, `untrackedFiles`, `nominate` and
`runCommand` each answered `[]` or `false` for a `cwd` they could not use, which
is the answer to "what did this fix touch" rather than "the repo could not be
read". The container failed open too: the `throw` had no top-level catch, and a
PreToolUse hook exiting non-zero and non-2 is a non-blocking error, so any
internal exception was a permit.

**Why nothing caught it.** The fix was written against the class it names and then
written in that class's own shape, and nothing asked whether it was. A truthiness
test is itself a silent fallback: it answers "is this usable" with "is this
present", a cheaper question, and the two agree on every value anybody tries by
hand. The morning entry did what the skill asks and described a violation that
would still pass, a `logPath` pointing at the wrong file, so the exercise ran and
pointed away from the nearer instance. Every suite stayed green because `decide()`
is the only caller that supplies these values and no test drove `decide()` with
anything but a real path. CI compounded it: `check.sh` was the whole of CI and
never ran `node --test`, so the suites were green only when somebody remembered to
run them.

**The rule.** A fix for a class is read back against its own class before it lands,
and the reading is mechanical wherever it can be. Every export that reads the repo
now declares its `cwd` contract, and the list of those exports is derived from the
module's own source rather than restated in the test, so an export added later
fails the assertion until somebody gives it a contract. That list caught two
exports this fix had missed on its first run. Only `null` means skip, spelled
`cwd === null` at every site rather than `!cwd`. The suites are wired into
`check.sh` so CI runs them.

A violation that would still pass: a `cwd` that is a real path in no git repo.
`touchedFiles` returns `[]` there, `nominate` nominates nothing, and an entry that
ignores every prior is allowed. `gitReachable` exists and answers exactly this, and
`landedRows` consults it, but the nomination path does not.

Class: a silent fallback that answers a different question
Instance: 5
Level: convention
Bucket: none
Not one up: process would be a review step asking of every fix whether it is written in the shape of the class it fixes, and a step answered by its own author is the 2026-09-01 step 7 finding over again; the derived contract asserts the mechanical form without needing a reader
Sweep: `grep -n 'requireCwd(' plugins/learn-from-bugs/hooks/ledger-gate.mjs` → 6
Sweep: `grep -n 'cwd === null' plugins/learn-from-bugs/hooks/ledger-gate.mjs` → 2
Priors: `git log --date=short --format=%ad -- plugins/learn-from-bugs/hooks plugins/learn-from-bugs/skills scripts/check.sh evals` → 14 nominated
- 2026-08-31 A documented step vanished: unrelated
- 2026-08-31 A fix recorded in this log: adjacent
- 2026-08-31 Correct install instructions: unrelated
- 2026-08-31 One agent's unreviewed conclusion: unrelated
- 2026-08-31 Sequential section numbers: unrelated
- 2026-08-31 The front page claimed provenance: unrelated
- 2026-08-31 The skill did not trigger: adjacent
- 2026-08-31 Three trigger tests: same-theme
- 2026-09-01 A scoped grep: adjacent
- 2026-09-01 The critic proposed for step 7: same-theme
- 2026-09-01 Three gates failed while green: same-theme
- 2026-09-04 A command run to answer: unrelated
- 2026-09-04 Thirteen entries in: adjacent
- 2026-09-09 A test helper called the gate: same-theme
Landed: 1 check.sh runs the unit suites, so CI executes the contract instead of trusting somebody ran it, red: a deliberately thrown test made check.sh report the suite failing, scripts/check.sh
Landed: 2 the cwd contract is asserted against the module's own export list, red: adding an unguarded repo-reading export failed it, and on its first run it caught runCommand and validateEntry, plugins/learn-from-bugs/hooks/ledger-gate.test.mjs
Landed: 6 the contract moved out of six separate truthiness tests into requireCwd and logNameFrom, plugins/learn-from-bugs/hooks/ledger-gate.mjs
Critic: not-run
