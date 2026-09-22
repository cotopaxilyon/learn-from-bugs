# Fixture: backlog-read-dates

A tracker export and a thin docs folder, used to test whether an agent handed a
window of closed tickets finds the process finding under them rather than a
symptom tally. The harder variant of `backlog-read`: the same twelve tickets,
with every comment that stated a bucket rewritten, so no ticket announces what
state its information was in and the reader has to work out that the
requirement was on the ticket before the build. Unlike `date-validity` and
`convention-spread` there is no source code and no single incident. Restore it
with:

    git clone backlog-read-dates.bundle work
    cd work && wc -l tickets.jsonl

Twelve closed tickets, March to August 2026, for a small-business invoicing
product. One ticket per line in `tickets.jsonl`, so `wc -l` is the count and
`grep` works per field. Four docs: the ticket template, the definition of done,
a short conventions file one ticket cites, and an incident log with no entries
yet.

The bundle is built from the tracked `tickets.jsonl` and `docs/` by
`build-bundle.sh`, one commit dated 2026-08-10, the log's own start line.
`evals/score.test.mjs` clones the bundle and diffs it against those files, so
the two cannot drift: edit the files, rerun the script, commit both.

**The prompt every arm receives, verbatim** (the sibling's, unchanged, so the
two drives differ in the export and nothing else):

> Here is our closed-ticket export for the last six months. What are our bugs
> telling us about how we work? Pick the one change you would make first.

`ANSWER-KEY.md` holds the intended finding and the machine-checkable values.
This file, `PREREGISTRATION.md` and `hand/` carry the fixture's construction,
the values a hand-written entry must produce, and (this file) the verbatim
prompt and the artificiality list below, none of it what an arm should see
going in. All four, and `build-bundle.sh`, stay out of any directory an arm
runs in. The bundle an arm receives holds only `tickets.jsonl` and `docs/`.

## What this fixture changes, and why

Run 11 drove `backlog-read` and every arm that finished found the finding,
including the arm with nothing loaded, which read it off the export in eight
turns and ninety seconds. Two routes were open there.
Its six members confessed in the reopen thread ("did not see that comment",
"built to the AC"), and its six decoys each stated their own bucket outright
in a closing comment, which leaves an arm holding the six members without ever
comparing a date. A fixture that hands over its own finding cannot measure
whether the skill's procedure reaches it, which is now the rule in
`evals/README.md`: a fixture may not state its finding.

Here both routes are closed. Eighteen comment bodies differ from the sibling,
ten on the members and eight on the decoys. On four members it is the reopen
comment and the developer reply; on INV-104 and INV-110 only the reply, since
their reopen comments named nothing to remove. On the decoys it is whichever
comment stated a bucket, one each on INV-102, INV-105, INV-108 and INV-111 and
two each on INV-114 and INV-117. `evals/score.test.mjs` pins that set field by
field, so a later edit cannot quietly change a date, a role or a ticket's
structure. What is left is the date window: on every member a product or design
comment sits strictly between `created_at` and `in_progress_at` and carries a
requirement, and on no decoy does one.

A third route was open until 2026-09-22, and was closed by adding three
comments rather than by rewording any. A fresh review of the built fixture
found that every member's thread opened with a product or design comment while
every decoy's opened with a developer, so thread position alone selected the
six, with no date arithmetic and no reading of what any comment said. The
export now gives INV-102, INV-108 and INV-117 a product or design comment at
the head of the thread, each dated after that ticket's `in_progress_at`: nine
tickets open that way, six are members, and the position tells the reader
nothing. The date window is untouched, because none of the three sits between
creation and in-progress. `evals/score.test.mjs` asserts both halves of that,
the window selecting exactly the six and position selecting something else.

This is the fixture's own lesson applied to itself. The route was not in the
plan, not in the answer key and not in the first review's remit; it was found
by someone reading the built export cold and asking what else separates the
six.

A cold reader who received `tickets.jsonl`, `docs/` and the prompt, with the
skill not loaded, found the six by the date comparison (recorded in
`PREREGISTRATION.md`, re-run on this export after the three comments were
added). So the evidence is reachable without a confession, and reachable
without the skill.

## Why JSONL and not CSV or `gh` text

Comments carry a date, an author role and a body, and the finding lives in
those, so a flat `gh issue list` line cannot hold it. CSV with multi-line
comment bodies is unreadable to a person and fragile to `grep`. JSONL keeps one
ticket per line, which is what the theme block's `Window:` line count needs,
and every field is greppable by key.

## Why a bundle when there is no code

The ledger gate reads the repo holding the log: `Priors:` and `Sweep:` commands
run there and `Landed:` rows must end in a path this work touched. A fixture
with no repo cannot accept the entry it is testing for. The docs folder gives
the arm real paths to land on (`docs/ticket-template.md`,
`docs/definition-of-done.md`) and a log to append to. Verified the hard way on
the sibling: writing a log entry into a draft directory outside any repo was
refused with `deny_sweep_command_failed` on both sweep lines.

## Known artificialities, disclosed

- No comment on any ticket, member or decoy, states the state its information
  was in. That is the point of this variant, and it is itself artificial: real
  reopen threads sometimes do confess, and a real export would carry a mix.
  This fixture is the floor, not the average.
- Three decoys carry a product or design comment at the head of the thread
  that exists to break the ordering tell described above. They are ordinary
  context notes, dated after work started, and they add no requirement. A real
  export's ordering would be mixed for its own reasons; here it is mixed on
  purpose.
- `in_progress_at` is a clean field on every ticket, as are `found_by` and
  `reopen_count`. A real tracker carries the first as a status-history row or
  not at all. With the confessions gone this is the fixture's one remaining
  concession: the discriminating signal has to be mechanically decidable from
  the export alone, or no arm could be graded against it.
- The log is empty. A real client at this stage usually has no incident log at
  all, which the skill treats as the first finding; an empty file with a header
  keeps the gate's write path exercised without pre-answering the bucket.
- Comment authors are roles, never names.
- INV-104 and INV-117 both read as accessibility problems in their titles;
  only INV-117 carries the `a11y` label. A grouping that trusts labels alone
  would count one of the two, not both.
- Labels are sparse and inconsistent (`ux`, `bug`, `mobile`, `a11y`,
  `security`, `finance`, none), mirroring real trackers; no label sits on more
  than two tickets, so a label-only read finds nothing.
- Nine of twelve tickets were reopened. A reopen count alone does not
  distinguish why each ticket reopened.
- Every ticket is `fixed`. No wontfix, no duplicate, so close-reason
  clustering yields nothing either.

## Verification

Run against a fresh clone:

    wc -l tickets.jsonl
    # -> 12

    grep -c '"reopen_count":1' tickets.jsonl
    # -> 9

    grep -o '"labels":\[[^]]*\]' tickets.jsonl | sort | uniq -c
    # -> no label with more than 2 tickets

## Scoring

`evals/score.mjs` grades this fixture through `kind: theme`, unchanged from the
sibling; the pre-registered values, including what the arm with nothing loaded
is predicted to do, are in `PREREGISTRATION.md` and were written before any arm
ran.

The `Window:` line an arm writes must emit one line per ticket — `cat
tickets.jsonl`, or a `grep` over a per-ticket field. `wc -l` answers the count
question a reader has and is not a valid Window: the gate derives the count
from the command's own line count and binds every member row to a ticket id
appearing in that output, so a one-line summary fails both.
