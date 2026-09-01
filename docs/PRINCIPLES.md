# Principles

Three tenets, each earned by an incident recorded in [`LESSONS.md`](LESSONS.md).
Rules with a runnable check live in `scripts/check.sh` instead; these are the ones
no grep can enforce, which is exactly why they are written down.

---

## 1. Assert mechanisms, not statistics

Where we know why something happens, say the why. Never dress it as a survey
finding.

"Most teams sweep what was reported to them" is data we do not have. "A read built
only on what was reported to you is a sample of what people bothered to file" is a
mechanism, is checkable by reasoning, and is a stronger claim.

A skill that instructs readers to state the fidelity of their evidence cannot
assert statistics it does not have. Partially checked: `scripts/check.sh` greps a
narrow phrase list, which catches the lazy forms and not the careful ones.

## 2. Prose cannot guard prose

Any structure another artifact depends on, so step numbers, cross-references, file
names, and section counts, gets a mechanical assertion or it will rot. Not because
people are careless, but because a document's structure is invisible to everything
except a reader who happens to check.

A heading that says "three kinds" after a fourth is added is caught by a grep or
it is not caught at all.

## 3. A capability the trigger surface cannot reach does not exist

For a skill, the `description` is not documentation, it is the product. Whatever
the body claims to be best at, the description has to name in the words a user
would actually type, and that has to be verified by running it rather than by
reading it.

Every structural check can pass on a skill that never fires, which is why the
trigger surface gets its own tests in [`evals/`](../evals/README.md).
