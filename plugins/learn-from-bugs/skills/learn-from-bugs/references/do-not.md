# Do not

Companion to `SKILL.md`. Read this before closing the issue. It is the
compressed form of every step above, and of the failure modes each one exists to
prevent.

- Close an issue with only the fix. A green test is step 2 of 8.
- Accept "forgot," "human error," or "one-off" as the cause. A one-off is a claim
  about a class, and step 4 is how that claim gets earned.
- Let the analysis land on a person, including as "they should have read it more
  carefully," which is the failure rather than the explanation. Naming it as
  someone's character flaw stops one step short of the thing you can change, and
  it teaches everyone to report less. Ask where the information was instead.
- Skip the sweep because the issue was obviously unique, or close it as "cannot
  reproduce" or "user error" without recording what that says about the test
  surface. The sweep is the evidence, and it is cheap next to the sibling QA finds
  next sprint.
- Paste a reporter's raw data into a ticket, a fixture, or the log. The mechanism
  generalizes; the payload is someone's information.
- Fix only the surface the reporter happened to be looking at.
- Batch several issues into one analysis of what to fix. The gate is per-issue,
  and merging them loses the specific one each walked past. (Batching them to find
  a theme is the opposite, and that is step 4, which is required.)
- Let an issue found and fixed in the same turn vanish without a label. The
  fastest-moving category of issue is the one most likely to leave no evidence,
  and a theme nobody can see is a theme they keep paying for.
- Accept a passing agent-written test as the gate for a requirement that same
  agent read. The two agreeing shows consistency, which is a weaker claim than
  either being right.
- Re-decide something already settled without writing it down this time.
  Re-litigation is the symptom; leaving no record is what makes it recur.
- Treat "it was in the ticket" as closing the question. Availability is not
  delivery, and when the requirement lived where nobody looks, the location is the
  bug.
- Answer step 7's five questions yourself, or park them on a session you will open
  later. A reader holding the author's context is not a critic, and a pass owed to
  a later reader is one this run did not have. Dispatch it, or record it as not
  run.
- Keep a check you have never watched fail. Until it has gone red against the
  defect it exists to catch, it is a hypothesis about a check, and a gate that
  cannot fail turns every green run into an argument against looking.
- Report a scoped search as an absolute. "Nothing else uses this" from a grep over
  two paths is invisible in its own output, and the claim gains authority at every
  hop while being re-derived at none. Anything that will authorize a deletion or a
  migration travels with the command that produced it.
- Adopt an unexercised module, fixture, runbook or config template as though it
  were a no-op. Nothing has been holding it correct since the last time anyone
  ran it. Diff it against what ships.
- Build a process change on one instance because the bug felt bad, since ceremony
  earned by a single data point has nothing to point at later. And do not treat a
  recurring theme as unrelated small bugs because each was individually cheap,
  which is how a theme stays invisible for a year.
