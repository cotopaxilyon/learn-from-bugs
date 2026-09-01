# When the tester (or the author) is an agent

Companion to `SKILL.md`. Read this before step 3 whenever an agent wrote, tested,
found, or fixed any part of the work.

Increasingly the thing that wrote the code also wrote the tests, ran them, found
the bug, and fixed it, all before anyone looked. That's a real gain in speed and
it puts three specific holes in everything above.

### Hole 1: the fix can leave no trace

A human QA finding usually becomes a ticket. An agent finding can be a line in a
transcript that scrolls away. When nothing gets tagged, nothing accumulates, and
**step 4's backward sweep reads a history with the fastest-moving category of
issue missing from it**, so the themes look better than they are.

The rule: an issue found and fixed in the same turn still gets recorded.
Not a ticket, not ceremony, one line in the log with the theme label, enough
that the pattern is visible in three months. If you fixed six things while
building a feature and logged none of them, you have destroyed the evidence for
the one process change that would have prevented all six.

Cheap version, when the volume is high: a line per fix in the PR or commit body,
`fixed: empty-state crash on first load [empty-state]`, so the labels survive
somewhere greppable even when no tracker was involved.

### Hole 2: the tester shares the author's misunderstanding

A human tester brings an independent reading of the requirement. **An agent
testing its own work does not.** When the same reader writes the code and the
test, a misread requirement produces a green suite: the test asserts the wrong
behavior confidently, and the passing run is evidence of consistency, not of
correctness.

So when an agent-written test passed and the thing was still broken, that is
never "a missing test case", that's the finding, and it belongs in step 3 as its
own gate:

| Gate | The question |
|---|---|
| Context | Was the constraint ever in the agent's context at the moment it mattered, or had it compacted away, sat unread in a file that was never loaded, or been diluted by volume? A rule that only existed in an earlier turn was not a gate. |
| The agent's own verification | It ran the tests and they passed. So did the test encode the requirement, or the implementation? Was the assertion weakened until it went green? Was the *stated* behavior checked, or the behavior that was built? |

The durable change for this class is almost never another test written the same
way. It's an independent source of truth: the requirement quoted verbatim into
the assertion, a test written before the implementation, a fixture the agent
didn't generate, a second agent reviewing against the spec rather than the diff,
or a human reading the acceptance criteria out loud.

### What agent testing structurally cannot see

Treat these as always-unchecked until something else covers them:

- **Anything perceptual.** Layout, spacing, contrast, jank, "this looks wrong."
  Not seen unless the agent actually screenshots and *looks*, and even then not
  felt. Latency and confusion have no representation in a passing test.
- **The states nobody thought of.** An agent verifies the path it implemented.
  Empty, error, offline, partial, slow, permission-denied, very-long-content,
  these are missing from the tests for the same reason they're missing from the
  code: they were never in the reading of the requirement.
- **Fixtures shaped like the author's assumptions.** Generated test data is too
  clean, too small, too new, and too English. Real histories, real volumes, and
  real upgrade paths break things fixtures never will.
- **The assembly.** Unit tests prove the parts. A stale build, a cached shell, a
  bad deploy, and a broken integration all present as "the tests passed."
- **Its own environment.** A green run against a dev server proves less than the
  agent's confident summary implies. Verify against the deployed artifact.

### Hole 3: the context window is a lossy medium

"It's in the conversation" is not storage. A constraint can leave a live session
without anything being raised, and the ways it goes are not the ways human memory
goes:

- **Compaction is lossy in a specific direction.** A summary preserves the
  narrative of what was *done* and drops constraints that were never acted on.
  A rule that was correctly honored produces no visible action, so it is exactly
  the kind of thing a summary discards. *The better the agent followed it, the
  more likely it is to vanish.*
- **Attention is finite even when the tokens are present.** A 400-line
  `CLAUDE.md`, a large file dump, a long transcript: the load-bearing sentence is
  still technically in context and functionally diluted. More context is not more
  reliable, and a rule buried on page four of a rules file has the same failure
  mode as a requirement buried in comment #14, bucket 2 again, different
  artifact. Length is itself a failure mode.
- **Nothing is raised when it goes.** No error, no gap, no degraded-mode warning.
  The agent answers confidently from what remains and cannot tell you what it has
  lost. Same shape as the silent-failure lens: the absence of a complaint is not
  evidence of completeness.
- **The boundary is invisible from inside.** Neither you nor the agent can tell
  whether something you said 200k tokens ago is still influencing the work.

**The consequence for step 5: a durable change that depends on the model
remembering is not durable.** Rank candidate fixes by how little they depend on
context surviving:

1. **A hook or CI check**, mechanical, indifferent to what's in context.
2. **A test that fails**, travels with the code, not the conversation.
3. **A short, re-read file** (`CLAUDE.md`), survives compaction because it is
   re-loaded rather than remembered. Only while it stays short.
4. **A comment at the site it governs**, arrives exactly when it's needed,
   because it's in the file being edited.
5. **An instruction in the prompt**, lasts as long as the session's attention.
6. "We discussed this earlier", not a fix.

Anything at 5 or 6 that matters should be promoted to 1–4 as part of this
analysis. And when you add to 3, remember what you're trading: every line added
to a rules file dilutes the ones already in it.

### Where the escape actually lands

3b's four buckets apply unchanged, an agent is just a reader with unusual
failure modes. Translate rather than inventing a separate taxonomy:

- **Missing.** The convention lives in someone's head, or in a habit visible only
  in existing code, and not in any file the agent reads. Nothing could have told
  it.
- **Unread.** The strongest agent version, and the easy one to miss because the
  transcript looks so thorough. It worked from the context it was handed: the
  ticket body without the comment thread, the description without the linked
  design, the top of a long `CLAUDE.md` whose important line was on page four,
  a doc that was never loaded. It will not notice that what it read was partial,
  it has no felt sense of an unopened tab.
- **Unrecorded.** It understood the constraint, honored it, and the session
  ended. Nothing was written to a file, so the next session, or the next agent,
  or the same one after a context reset, starts without it and confidently
  redoes the thing that was ruled out. Transcripts are not storage. This is the
  most common cross-session failure there is, and it's invisible in the moment
  precisely because the work at the time was correct.
- **Misunderstood.** It resolved an ambiguity silently, plausibly, and
  confidently rather than asking. This is the same class as a developer picking
  one reading of an ambiguous ticket, with the volume turned up: it happens
  faster, at more places at once, and the output reads as certain. And nobody
  caught the mismatch downstream, because a diff that works is easy to approve
  and a diff that never considered something is hard to notice.

The practical consequence: **an agent's confidence carries no information about
whether it read everything.** If the requirement lived in a comment, an
attachment, or a conversation, assume it did not arrive, and fix that by moving
the requirement, not by asking the agent to try harder.

So step 5's durable change often belongs in a file you wouldn't expect: a line in
`CLAUDE.md` where the convention was only ever folklore, the requirement pasted
into the ticket description instead of left in a comment, a question added to a
skill, or a hook that blocks the thing mechanically. Those are the artifacts that
reach the agent *before* it writes the bug.

