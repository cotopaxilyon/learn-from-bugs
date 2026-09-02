# Lessons

The incident log this skill asks every project to keep, kept on the skill itself.
Each entry is what happened, why nothing caught it, and the rule it produced.

Heading format is `## YYYY-MM-DD — Consequence`, never a sequence number. The
entry on parallel writers explains why.

The rules these produced live in [`PRINCIPLES.md`](PRINCIPLES.md) where no
mechanical check is possible, and in `scripts/check.sh` where one is. That is the
point of the log: entries here are inputs, and the checks are the output.

---

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
