# Reading the bucket off a tracker

Companion to `backlog-read.md` step 1 and `SKILL.md` 3b. Per incident, the
bucket is read from the artifacts in hand. Over a window it has to be read from
what the tracker exported, which means each bucket needs a signal that appears
in an export or a connector query, a way to retrieve it, a statement of what
else would make it fire, and the step 5 mechanism it points at. A bucket with
no tracker signal cannot be tallied and says so below rather than pretending.

Every signal here is a lead, not a verdict. The tally counts leads; the read
then opens a sample of each cluster and confirms the bucket by hand before it
enters a theme entry, the way step 4 opens the sweep's nominations rather than
citing them all. Every row carries the case that fires it for the wrong
reason. A signal whose wrong-reason case is the common one in your tracker is
not a signal there, and the row says so rather than leaving you to find out on
the sample.

A tracker with a connector answers structured questions directly; say which
connector and note the fidelity from `history-sources.md`. Without one, export
the window to CSV or JSON with comments. Every move below is a `grep` or a
`sort | uniq -c` over that file, both of which the gate's `vetCommand` accepts.
A counting form is not what a `Window:` line takes, though: `grep -c` and
`sort | uniq -c` collapse the output to fewer lines than there are members,
which the gate refuses for the same reason it refuses `--json`. Count with them
in the read, and give `Window:` the listing command the count was taken over.
An export that omits comments cannot read the unread or unrecorded rows at
all; ask for one that includes them before counting.

Ask, per issue, for comments with their timestamps and the author's role
(product, engineering, QA, support, never the name), description revision
history where the tracker exposes it, and reopen and works-as-designed status
transitions: the unread, unrecorded, and misunderstood buckets leave their
evidence there and nowhere else.

| Bucket | Signal in the export | Retrieval | Fires for another reason when | Points at |
|---|---|---|---|---|
| **Missing** (never written down) | The ticket carries no description, or a description with no acceptance section, and the fix commit or PR names a state the ticket never mentions: empty, error, offline, long content, small screen, a locale. Second form: the same state word appears in the close comment of tickets across unrelated features. | Grep the export for tickets whose description field is empty or under a length floor, then grep their linked PR titles and close comments for the state vocabulary. `grep -c` per state word over close comments gives the tally. With a connector: query issues where the description lacks the AC heading your template uses, join to their PR titles. | A project that keeps AC in a linked doc rather than the ticket, so every ticket reads as missing when nothing is; a team whose close comments name the state because the template asks them to, so the word appears on every ticket. Check the template first. | 4, a question in the ticket template. 5 when the state belongs to a surface no role owns. |
| **Unread** (existed, not read) | Requirement-bearing text in a comment whose timestamp is after the description's last edit and before the first commit or status move to in-progress. Requirement-bearing means it contains should, must, needs to, expected, instead, actually, or an AC-shaped sentence. Second form: AC count above a floor, with the defect traced to an item in the bottom third. Third form: a linked design file or doc whose link was added or edited after work started. | Export comments with author, timestamp, and body. Sort each ticket's comments by time, take those between description-edited and in-progress, grep the bodies for the requirement vocabulary. With a connector: query comment timestamps against the status history directly. AC count is a line count of the AC section per ticket. | A team that discusses requirements in comments by habit and then promotes them into the description, so the comment exists and was read; the comment vocabulary appearing in a reply that quotes the description back. Both look identical in the export. Confirm on the sample by checking whether the description was ever edited after the comment, which separates the first case. The second needs the comment read: a reply quoting the description back carries the vocabulary and no requirement. Where the export has no description edit history, as a GitHub CLI export does not, neither case can be separated without reading the sample. | 6, relocation, when the comment holds a requirement the description lacks. 4 when the template never asked. 3 for a rule that requirements go in the description. |
| **Unrecorded** (understood, then lost) | The same question asked in comments on two tickets more than a sprint apart, or asked once and answered in a comment on the wrong ticket. Second form: a reopen whose fix reverses an earlier fix on the same file or surface, with no ticket citing the earlier one. Third form: a PR body containing we decided, as discussed, per the call, or per chat, with no link. | Grep comment bodies for the question marks and cluster by the noun after why, how, which, what. Grep PR bodies for the conversation vocabulary and count those with no URL in the same body. Reopen reversals need the fix commits: `git log --format=%s` over the window grepped for revert, undo, back to. | Standup notes pasted into tickets as comments, which carry the vocabulary and none of the loss; a team that links conversations by habit so the phrase is present and the link is too. The second is the easy one to check, since the link is or is not in the export. | 7, a capture point. 6 when the answer exists on the wrong ticket and needs moving. |
| **Misunderstood** (read, understood differently) | A ticket closed and reopened with a comment from a product-role author restating intent, or closed as works as designed or as specified followed within the window by a new ticket on the same surface from the same reporter. Second form: an AC term appearing in the description and in a dev-role comment with different qualifiers around it. Third form: a bug whose fix PR changes the description or AC text as well as the code. | Export status history with the role or team of each author. Count reopens whose first comment after reopen is product-role. Grep close reasons for works as designed, as specified, not a bug, then join to later tickets by component or surface label and reporter. Description edits after close are in the change history if the export carries it. | Product changing its mind after seeing the build, which is a design gap rather than a misreading and lands under missing; a reporter who files everything twice. The tell that separates a changed mind from a misreading is whether the reopen comment cites a requirement that existed before the build or a preference formed after. Read the sample for that. | 8, a readback. 4 when the ambiguity is one the template could have asked about, for instance which states a filter word covers. |
| **None** (a gate ran and passed it) | The ticket cites a passing test, a QA pass, or a review approval on the exact behavior that then failed. Reads in the export as a linked test file or a QA-passed status transition before the reopen. | Grep status history for QA-passed or approved transitions that precede a reopen on the same ticket. Grep PR bodies for a test file path that the reopen's fix PR then edits. | A QA pass on a different build than the one that shipped, which is an environment gate rather than none; a test that was skipped rather than passed, which exports the same way in some trackers. Check the CI record for the sample. | 1 or 2, a check that asks the question the rule asks. Read `checks-that-cannot-fail.md`. |

## A sixth signal that is not a bucket

A rule, a design system, a checklist, a DoD line that is present and never
cited is a class rather than a bucket, the Decay family in `SKILL.md` step 4,
so it never goes in a `Bucket:` line.
It is worth tallying in the same pass because the retrieval is the same one.
Signal: the artifact exists in the repo or the wiki and the window's tickets,
PRs and reviews never mention it, a citation count of zero across the window
however good the artifact. Second form: components hand-built in a feature
where the design system has the same component. Retrieval: name the artifact's
citation tokens, then `grep -c` each over the exported PR bodies, review
comments and ticket comments. For the design system, set
`grep -rl "<system import>" src` against `find src -name "*Button*"` and the
like, so a hand-built component the system already ships is a file in the
second list and not the first. Fires for another reason when a bot or a
template line cites it on every PR, separable by author, and when a team
follows the checklist without naming it, which is not separable from the
tracker at all. It points at step 5's mechanism 5 when the artifact is
unowned, 1 when a check can hold it to the code, and 9 when the reader is an
agent and the artifact is not where it reads.

## Signals that could not be made mechanically retrievable

Two, disclosed rather than dressed up.

The unread bucket's third form, a design file changed after the implementer
read it, needs the design tool's version history and a read timestamp the
tracker does not carry. `SKILL.md` 3b names it as one of the few bucket-2
failures confirmable mechanically, and that is true per incident with the file
open. Over a window there is no export that joins design versions to ticket
status, so it stays a per-incident check and the table's row says so.

The sixth signal's second wrong-reason case, a team following a checklist
without naming it, has no tracker signal at all. A zero citation count there
is consistent with both full adoption and none, and only a read of the sample
against the checklist separates them. That section carries the sentence because a count that cannot distinguish its two readings is the exact
shape `checks-that-cannot-fail.md` warns about.

A third is partial. Author role, which the misunderstood row leans on, is not
a standard export field; it has to come from a team roster mapped onto author
names, which the read must build before counting and must keep out of the
entry, since the analysis never lands on a person.
