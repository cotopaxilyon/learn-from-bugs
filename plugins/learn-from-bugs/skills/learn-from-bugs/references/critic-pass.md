# The critic pass

Companion to `SKILL.md` step 7. Five questions, put to the artifacts after the
incident is recorded and before it goes back for verification. Late enough that
there is something concrete to interrogate, early enough that a failure is still
cheap to act on.

**It runs in a subagent, dispatched now.** Every other destination is a deferral
wearing a procedure's clothes: a person to ask, a session to open later, a note
to pick it up next time. A pass owed to a later reader is one this run did not
have, and the honest form of that is the fallback at the end of this file rather
than an option in the step. The author answering these at the end of their own
turn is not this pass, it is the same-reader self-audit this skill rejects
everywhere else: same reader, same misreading, green suite. That argument does
not stop applying because the artifact is a write-up rather than a test.

**It is also not "review this analysis."** A general critic handed the reasoning
adopts the frame that reasoning was written in and blesses it. So the brief is
the artifacts and not the narrative: the change, every check it introduces, the
incident entry, and the commands the sweep actually ran. Every question below is
answerable from those alone, without re-deriving the analysis, which is what
makes the pass cheap and what makes it hard to rubber-stamp.

**1. Which factual claim here was not measured?** Name the command that would
measure it, or restate the claim with its scope attached. "Nothing uses X" and
"this is the only place" are the usual suspects, and they gain authority at
every hop: a scoped grep becomes a code comment, becomes an acceptance
criterion, becomes a deletion, and is re-derived at none of them.

**2. Has each check this change introduces been observed failing against the
defect it exists to catch?** Every check, not only the one that fixes the
reported bug, since a new generator or fixture is exactly where this hides. If
not, it is a hypothesis, and `checks-that-cannot-fail.md` has the follow-up
question and the shapes.

**3. Is anything here destructive, and does its premise hold?** Deletions,
migrations, overwrites, and any acceptance criterion that authorizes one. Check
the premise rather than the action.

**4. Is this finding new, or an instance of one already in the log?** This guards
against the failure mode the skill creates by working. Several entries out of
one sitting is its own problem, and the fix is a consolidation pass rather than
another entry.

**5. What environment would make this class invisible, and is that the only one we
run in?** The list is in `checks-that-cannot-fail.md` under the matrix shape.

**Give it read access, or a copy.** Re-running the evidence is the most valuable
thing this pass does and the most dangerous, because a reader with write access in
a live tree can destroy the work it was sent to check. `git checkout -- <file>`
restores from the index, so it silently discards uncommitted changes, and an
experiment that ends with one has destroyed the artifact it was sent to check. Put it in the
brief: experiments run on a copy, the tree is left as found, and report
`git status --porcelain` from before and after.

The output is a short list or nothing. A critic that always finds something is
one nobody reads.

Where no fresh reader is available, record that the pass did not run. An
unrunnable step recorded as skipped stays visible, while one answered by the
author reads as done and is the outcome this step exists to prevent.

## What it will not catch

An unexercised artifact that has drifted needs an actual diff against the copy
that ships, and no question here surfaces that, only the mechanical comparison.
