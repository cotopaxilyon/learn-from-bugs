# Answer key, backlog-read-dates

Kept outside the fixture so no run can read it.

## The finding

Twelve tickets, twelve different symptoms, one process failure under six of
them. In INV-101, INV-104, INV-107, INV-110, INV-113 and INV-116 a product or
design comment added a requirement to the ticket after the description was
written, the developer built to the description's AC, and QA or a user found
the gap. The reopen comment and the developer's reply name the symptom only;
nothing in the export says where the developer built from or that the comment
went unseen, and the only evidence that the requirement was on the ticket
before work started is the comment's date against `in_progress_at`. That is the
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
"9 of 12 reopened, QA needs to test earlier"), or a per-ticket list of fixes
with no upstream change, or a change landing on QA scope when every one of
the six was caught by QA or a user *after* the information was already on the
ticket.

## The decoys, and why each is not a member

- INV-102 (archive) and INV-114 (active users): **misunderstood**. No comment
  added a requirement; the two sides read one sentence differently, and the
  export shows the divergent behaviour without either side naming the
  misunderstanding. The fix there is a readback, mechanism 8.
- INV-105 (offline draft) and INV-117 (keyboard): **missing**. Nothing on the
  ticket, in a comment, or in the design named the case, on either ticket.
- INV-108 (empty CSV): **none**. A test existed, ran, and passed the defect
  because it asserted status rather than rows.
- INV-111 (rounding): **unrecorded**. A decision made on a call, honored by the
  first implementer, and unavailable to the second.

Each of these is the key's own diagnosis of the export's behaviour, not
something a comment states about itself (2026-09-11 second review, R2): this
fixture's build removes any wording that would let a decoy announce its own
bucket, matching the "no ticket, member or decoy, states its bucket" rule
below.

A correct read can name misunderstood as a secondary theme with two members;
it cannot rank it first with six unread tickets on the table.

## Routes to the finding

Every member ticket carries a comment from product or design dated strictly
between `created_at` and `in_progress_at`, carrying requirement-bearing
vocabulary (should, must, needs to, expected, instead, actually, or an
AC-shaped sentence), and the description is never edited afterward. That
date window is the route for the six members. No reopen comment and no
developer reply on a member ticket names the earlier comment or says where
the developer built from: the reopen comments and the replies there name the
symptom only ("the list is alphabetical for this account", "the badge has no
text" and their kind).

That is not, by itself, enough to call the date window the only route. The
sibling fixture's decoys are not silent: in `backlog-read`, all six state
their own bucket outright, in the closing comment, in plain language — the
archive ticket's "Both readings fit the sentence" (misunderstood), the
offline-draft ticket's "Nothing in the ticket, nothing in the design"
(missing), the empty-CSV ticket's "it checks the status, not the rows"
(none), and so on for the other three. An arm that dismisses six decoys on
their own words and stops there is left holding the six members, without
ever comparing a date to `in_progress_at`. That is a second, cheaper route,
and it is exactly as much a confession as a reopen comment naming an earlier
comment by date. This fixture closes it at the build step: no ticket, member
or decoy, states its bucket in a comment, and `evals/score.test.mjs` checks
every comment on every ticket against a closed, per-bucket phrase list
(`confession_phrases` below) to hold that closed. With both routes closed,
the mechanical form:

    grep -c '"role":"product"\|"role":"design"' tickets.jsonl

is not sufficient on its own — INV-102, INV-105, INV-108, INV-114 and INV-117
have product or design comments too, all of them after work started. Nor is
thread position: since 2026-09-22 three decoys open with such a comment, so
nine of the twelve do, and "the product comment is first" no longer selects
the members (added after a fresh review found that it did, exactly, which was
a route to the six needing no dates at all; `evals/score.test.mjs` now asserts
that it does not). The discriminator is the timestamp window: a product or
design comment between creation and in-progress selects the six members and no
decoy, over all twelve tickets.
Finding the bucket means doing what `bucket-signals.md`'s unread row says:
sort each ticket's comments by time, take those between description and
in-progress, and read them for the requirement vocabulary. Reading the
twelve tickets end to end also finds it; twelve is small enough that the
fixture does not require a clever query, only that the arm asks the bucket
question rather than the symptom one, and does the date comparison instead
of looking for a comment that names, or gives away, another comment's
bucket.

That said, the mechanical check built for this fixture has a boundary worth
stating plainly (2026-09-11 second review, R4): it closes the phrasings
enumerated in `confession_phrases` and the date citations `dateCitations()`
finds, and nothing beyond them. A reopen thread that points back at an
earlier comment in prose using neither — "Design's note the day after filing
already called this out," naming no date and none of the listed phrases —
is not mechanically caught here. That gap is the cold reader's layer, not
this check's: `PREREGISTRATION.md`'s cold-reader row fails the fixture when a
person names the six without reporting the date comparison as their route,
which is exactly what a read that leans on an uncaught prose back-reference
would do. The fixture is built to keep the enumerated wordings and citations
out of the export; a broader net that catches every way of pointing back at
a comment was considered and set aside as the cold reader's job, not this
check's, so the two layers are not doing the same work twice.

## Hand-graded

`evals/score.mjs` reports, rather than scores, `bucket_in_prose` and
prose-mode `member_recall` (under `result.reported`), and does not score
`symptom_tally_as_finding` or `rate_observation_as_finding` at all (2026-09-11
re-verdict: three separate probes, B1, B2 and B3, each refuted a heuristic fix
attempted on one of these within five minutes of rewording a sentence in the
same register as the one the fix was written against — see
`PREREGISTRATION.md`'s `member_recall`, `bucket_in_prose` and
`symptom_tally_as_finding` rows for each). This mainly bears on entries with
no block — the block-less arm's usual shape (`base` and `base-0` in this
drive's naming) — since that is the only case
`member_recall` and `bucket_in_prose` are computed from prose at all.

For any arm whose entry carries no block, a person reads it against this key
and records two values:

- `bucket_named`: the bucket (from `BUCKETS` in `ledger-gate.mjs`) the entry
  states as its finding, read in this order and stopping at the first that
  answers: the heading; then the first paragraph; then the sentence that
  names the change to make. A bucket is "stated" when the entry says the
  cluster happened because information was in that state (never written,
  written and not read, understood and not recorded, read two ways, or
  passed by a gate), whatever word it uses; a bucket word used to describe a
  ticket's symptom ("the empty state was missing") does not count. Where the
  heading states one bucket and the first paragraph another, the heading
  wins, and the grader records both in the notes column. `none` only when
  no level of that order states any bucket. Worked: `prose-only.md` is
  `unread`; `prose-missing.md` is `missing`, because its heading states the
  requirement was missing and the read stops at the heading. Its first
  sentence then says the requirement reached the ticket later in a comment,
  which is the written-and-not-read state, so heading and paragraph
  disagree: `missing` is recorded, `unread` goes in the notes column, and
  that disagreement is the finding about the entry. It exists to sit on this
  boundary and the read order is the rule that settles it.
- `members_named`: how many of the six members (`expected_bucket_members`
  below) the entry names as members of that bucket, excluding any it names
  explicitly as not a member.

`RESULTS.md`'s table for this fixture's drive (run 12; run 11, the
`backlog-read` drive this fixture answers, is already recorded there) carries
both columns for every arm, alongside whatever `score.mjs` reports, with the
grader's initials against each row.

On partial credit specifically: a symptom label named without the bucket word
("requirements gaps are our biggest cluster") is partial credit here, not a
not-a-pass, and partial credit is separated from a pass by `bucket` and
`bucket_correct` — a block-mode, scored signal — not by
`symptom_tally_as_finding`, which cannot see vocabulary outside the fixture's
own label set (probe P2c). An entry scoring `symptom_tally_as_finding: false`
has not thereby passed; read `bucket`/`bucket_correct` (block mode) or
`bucket_named` (hand-graded, no block) before crediting it.

## Known artificialities, disclosed

See `README.md`. This is the harder variant of `backlog-read`, whose reopen
comments confessed ("did not see that comment") and whose finding an arm with
nothing loaded read off the export in ninety seconds. Here the six members'
reopen comments and developer replies no longer confess, and neither do the
six decoys: a 2026-09-11 review of the sibling found that every one of its
decoys states its own bucket outright in a closing comment (the archive
ticket's "Both readings fit the sentence", the rounding ticket's "it was only
in the call", and so on for the rest), which is a second route to the same
six members that the confession fix alone does not close. This fixture's
decoys are rewritten so neither the six members nor the six decoys state a
bucket anywhere; only the date window remains, which is still an
artificiality in the other direction: `in_progress_at` is a clean field,
where a real tracker carries it as a status-history row or not at all.

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
  "expected_block": "theme",
  "expected_window_count": 12,
  "expected_landed_referents": ["docs/ticket-template.md", "docs/definition-of-done.md"],
  "expected_same_theme": [],
  "expected_instance": null,
  "expected_reopen_points": 9,
  "confession_phrases": {
    "unread": [
      "(?=.*\\b(?:did not|didn't) see\\b)(?=.*\\b(?:comment|note|ticket|description|AC|design(?:\\s+file)?|frame\\s*\\d+)\\b)",
      "(?=.*\\bnever saw\\b)(?=.*\\b(?:comment|note|ticket|description|AC|design(?:\\s+file)?|frame\\s*\\d+)\\b)",
      "\\bbuilt (?:to|from) the (?:AC|description)\\b",
      "\\bcomment covered\\b",
      "\\bworked from\\b.*\\bAC\\b",
      "\\b(?:product|design)(?:'s)? note from\\b",
      "\\bworked off the ticket\\b"
    ],
    "missing": [
      "(?=.*\\bwe\\b)(?=.*\\bnever specified\\b)",
      "(?=.*\\bnothing in the\\b)(?=.*\\bticket\\b)(?=.*\\bdesign\\b)",
      "(?=.*\\bno\\b)(?=.*\\brequirement\\b)(?=.*\\banywhere\\b)(?=.*\\bbuilt\\b)"
    ],
    "unrecorded": [
      "\\bonly in the call\\b",
      "(?=.*\\bno way to know\\b)(?=.*\\b(?:comment|note|ticket|description|AC|call|decision)\\b)",
      "\\bagreed on\\b.*\\bcall\\b(?!-)"
    ],
    "misunderstood": [
      "\\bboth readings fit\\b",
      "\\bwe assumed the other one\\b",
      "\\bneither was written\\b"
    ],
    "none": [
      "(?=.*\\bchecks? the status,? not the rows\\b)(?=.*\\btest\\b)"
    ]
  }
}
```

`kind: "theme"` tells `evals/score.mjs` to grade this key against the theme
block's required fields (`expected_bucket`, `expected_bucket_members`,
`expected_decoys`, `expected_window_count`, `expected_block`) instead of the
incident block's (`expected_same_theme`, `expected_instance`), since a
periodic read carries member rows and a `Window:` line rather than prior rows
and an instance count. There is no `expected_level`: the theme block carries
no `Level:` line, and run 11's two correct skill arms both scored `level`
null, so the level is stated in prose above and is not machine-graded.

`expected_bucket` is a closed-set value from `BUCKETS` in `ledger-gate.mjs`;
re-read before grading. `expected_same_theme`
is empty and `expected_instance` null because a theme entry carries member
rows, not prior rows, and the shared scorer must not fail on their absence
(today it exits non-zero on a key without `expected_instance`; the scorer
change is part of the fixture's build step). `expected_landed_referents` is
satisfied by either path, not both. `expected_symptom_themes_max_size` is a
property of the fixture, asserted by the build, so that a later edit adding a
third ticket to one symptom does not silently make the symptom tally a valid
answer. `expected_reopen_points` (9, unchanged from `backlog-read`, since
this fixture edits comment wording rather than ticket structure) is the
number of tickets `reopenAt()` in `evals/score.test.mjs` finds a reopen point
for; `evals/score.test.mjs`'s governed-fixture test asserts the export still
hits this count, so a wording change to the tracker's own "Reopening."/"PR
up" vocabulary that quietly drops tickets out of the date-citation check is
caught rather than shipped (2026-09-11 second review, R1).

`confession_phrases` is keyed by bucket (`unread`, `missing`, `unrecorded`,
`misunderstood`, `none`) because a fixture may not state any bucket, not only
the planted one (2026-09-11 maintainer ruling, after a review found all six
of the sibling's decoys confessing their own bucket). Each bucket's list
holds regex source strings, not plain substrings, matched case-insensitively
against one sentence of a comment body at a time — sentence-scoped so a
compound entry (the `unread` list's two "did not see"/"never saw" entries)
only fires when the perception phrase and a record noun (comment, note,
ticket, description, AC, design file, frame N) share a sentence, which is
what separates INV-101's real confession from an ordinary bug report that
happens to use "never saw" about a UI element. The decoy lists (`missing`,
`unrecorded`, `none`) carry the same sentence-scoped gating, added after a
second review found the ungated versions matching ordinary bug-tracker
prose ("no way to know", "never specified", "checks the status, not the
rows" all read naturally outside a confession) and one plain regex defect
(`\bagreed on\b.*\bcall\b` matching inside "call-to-action" until bounded).

Most entries are drawn from wording that appears in `backlog-read`'s member
or decoy comments; two of the `unread` list's seven (`note from`, `worked
off the ticket`) were not — they were added after a 2026-09-11 review
demonstrated a prose-reference evasion the sibling's own wording did not
cover ("Product's note from early May had the locale requirement and I
worked off the ticket body" ships past the sibling-drawn entries and every
date check alike). They are kept, labelled here rather than presented as
sibling vocabulary, on the understanding that they close only the two exact
phrasings named; the broader prose-reference route (any wording that points
back at a comment without a listed phrase or a date) is not mechanically
closed by this list and is left to the cold reader, per the note in
"Routes to the finding" above. `evals/score.test.mjs`'s no-confession test
checks every list against every comment of every governed fixture, proves
the wording is absent here, and proves, against the sibling, that each list
fires.

The count is over `tickets.jsonl`'s `labels` field, not over titles or
subject matter. INV-104 and INV-117 read as the same accessibility problem in
their titles, but only INV-117 carries the `a11y` label — INV-104 carries no
labels at all — so a title-based grouping and a label-based grouping can
disagree, and this number bounds only the label-based one, which is what
`score.mjs` and `score.test.mjs` both actually read.
