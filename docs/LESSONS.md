# Lessons

The incident log this skill asks every project to keep, kept on the skill itself.
Each entry is what happened, why nothing caught it, and the rule it produced.

Heading format is `## YYYY-MM-DD — Consequence`, never a sequence number. The
entry on parallel writers explains why.

The rules these produced live in [`PRINCIPLES.md`](PRINCIPLES.md) where no
mechanical check is possible, and in `scripts/check.sh` where one is. That is the
point of the log: entries here are inputs, and the checks are the output.

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
