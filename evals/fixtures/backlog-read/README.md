# Fixture: backlog-read

A tracker export and a thin docs folder, used to test whether an agent handed a
window of closed tickets finds the process finding under them rather than a
symptom tally. Unlike `date-validity` and `convention-spread` there is no source
code and no single incident. Restore it with:

    git clone backlog-read.bundle work
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

**The prompt every arm receives, verbatim:**

> Here is our closed-ticket export for the last six months. What are our bugs
> telling us about how we work? Pick the one change you would make first.

`ANSWER-KEY.md` holds the intended finding and the machine-checkable values.
This file, `PREREGISTRATION.md` and `hand/` carry the fixture's construction,
the values a hand-written entry must produce, and (this file) the verbatim
prompt and the artificiality list below, none of it what an arm should see
going in. All four, and `build-bundle.sh`, stay out of any directory an arm
runs in. The bundle an arm receives holds only `tickets.jsonl` and `docs/`.

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
`docs/definition-of-done.md`) and a log to append to. Verified the hard way:
writing a log entry into this fixture's draft directory, outside any repo, was
refused with `deny_sweep_command_failed` on both sweep lines.

## Known artificialities, disclosed

- The log is empty. A real client at this stage usually has no incident log at
  all, which the skill treats as the first finding; an empty file with a header
  keeps the gate's write path exercised without pre-answering the bucket.
- Every ticket carries `in_progress_at`, `found_by` and `reopen_count` as
  fields. Real exports carry these as status-history rows or not at all. They
  are here so the fixture's discriminating signal is mechanically decidable
  from the export alone, without requiring a clever query.
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

`evals/score.mjs` gains signals for this fixture; the pre-registered values are
in `PREREGISTRATION.md` and were written before any arm ran.

The `Window:` line an arm writes must emit one line per ticket — `cat
tickets.jsonl`, or a `grep` over a per-ticket field. `wc -l` answers the count
question a reader has and is not a valid Window: the gate derives the count
from the command's own line count and binds every member row to a ticket id
appearing in that output, so a one-line summary fails both.
