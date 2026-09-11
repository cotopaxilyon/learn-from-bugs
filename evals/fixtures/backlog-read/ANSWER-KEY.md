# Answer key, backlog-read

Kept outside the fixture so no run can read it.

## The finding

Twelve tickets, twelve different symptoms, one process failure under six of
them. In INV-101, INV-104, INV-107, INV-110, INV-113 and INV-116 a product or
design comment added a requirement to the ticket after the description was
written, the developer built to the description's AC, QA or a user found the
gap, and the dev's reopen comment says the comment was not seen. That is the
skill's bucket 2, **unread**: the requirement existed, was correct, and sat in
a place the builder had no reason to return to. All six comments precede
`in_progress_at`, so the information was on the ticket before work started:
this is the "in comment 14 rather than the description" shape, not the
"edited mid-flight" shape. Both are unread and a run naming either is
correct on the bucket; the landed change differs (promotion versus
announcing edits) and the key accepts either mechanism 6 form.

The change to make first is to the ticket lifecycle, not to any feature: a
requirement that arrives in a comment is promoted into the description before
the ticket can be picked up, and the ticket template asks whether any comment
changes a requirement. `docs/ticket-template.md` and `docs/definition-of-done.md`
are the paths a landed change touches. Per `land-a-change.md` that is
mechanism 6 (relocation) with 4 (a template question) as the companion, at
`Level: process`.

## What counts as correct

The entry names `unread` as the bucket, lists at least five of the six member
tickets, dismisses the decoys, lands at process level, and touches the ticket
template or the definition of done. It uses the theme block, not the incident
block, because there is no fix diff.

Partial credit: naming the bucket with fewer than five members, or naming all
six members under a symptom label ("requirements gaps") without the bucket
word. Not a pass: a symptom tally as the finding ("accessibility, 2 tickets";
"8 of 12 reopened, QA needs to test earlier"), or a per-ticket list of fixes
with no upstream change, or a change landing on QA scope when every one of
the six was caught by QA or a user *after* the information was already on the
ticket.

## The decoys, and why each is not a member

- INV-102 (archive) and INV-114 (active users): **misunderstood**. No comment
  added a requirement; the two sides read one sentence differently and both
  say so after the fact. The fix there is a readback, mechanism 8.
- INV-105 (offline draft) and INV-117 (keyboard): **missing**. Nothing on the
  ticket, in a comment, or in the design named the case. Product says so on
  INV-105; dev says so on INV-117.
- INV-108 (empty CSV): **none**. A test existed, ran, and passed the defect
  because it asserted status rather than rows.
- INV-111 (rounding): **unrecorded**. A decision made on a call, honored by the
  first implementer, and unavailable to the second.

A correct read can name misunderstood as a secondary theme with two members;
it cannot rank it first with six unread tickets on the table.

## Routes to the finding

Every member ticket has a comment from product or design dated between
`created_at` and the dev's "PR up" comment, and a later reopen comment citing
that comment by date. The mechanical form:

    grep -c '"role":"product"\|"role":"design"' tickets.jsonl

is not sufficient on its own (decoys have product comments too); the
discriminator is the reopen comment citing an earlier comment by date, which
appears in all six members and no decoy. Reading the twelve tickets end to end
also finds it; twelve is small enough that the fixture does not require a
clever query, only that the arm asks the bucket question rather than the
symptom one.

## Known artificialities, disclosed

See `README.md`. In addition: real unread failures are rarely confessed in the
reopen comment as neatly as "did not see that comment". The confession is here
so the finding is decidable from the export; a harder fixture would remove it
and leave only the dates.

## Machine-checkable answer

```json
{
  "kind": "theme",
  "expected_bucket": "unread",
  "expected_bucket_members": ["INV-101", "INV-104", "INV-107", "INV-110", "INV-113", "INV-116"],
  "expected_decoys": {
    "INV-102": "misunderstood",
    "INV-114": "misunderstood",
    "INV-105": "missing",
    "INV-117": "missing",
    "INV-108": "none",
    "INV-111": "unrecorded"
  },
  "expected_symptom_themes_max_size": 2,
  "expected_landed_mechanism": [6, 4],
  "expected_level": "process",
  "expected_block": "theme",
  "expected_window_count": 12,
  "expected_landed_referents": ["docs/ticket-template.md", "docs/definition-of-done.md"],
  "expected_same_theme": [],
  "expected_instance": null
}
```

`kind: "theme"` tells `evals/score.mjs` to grade this key against the theme
block's required fields (`expected_bucket`, `expected_bucket_members`,
`expected_decoys`, `expected_window_count`, `expected_block`, `expected_level`)
instead of the incident block's (`expected_same_theme`, `expected_instance`),
since a periodic read carries member rows and a `Window:` line rather than
prior rows and an instance count.

`expected_bucket` and `expected_level` are closed-set values from `BUCKETS`
and `LEVELS` in `ledger-gate.mjs`; re-read before grading. `expected_same_theme`
is empty and `expected_instance` null because a theme entry carries member
rows, not prior rows, and the shared scorer must not fail on their absence
(today it exits non-zero on a key without `expected_instance`; the scorer
change is part of the fixture's build step). `expected_landed_referents` is
satisfied by either path, not both. `expected_symptom_themes_max_size` is a
property of the fixture, asserted by the build, so that a later edit adding a
third ticket to one symptom does not silently make the symptom tally a valid
answer.
