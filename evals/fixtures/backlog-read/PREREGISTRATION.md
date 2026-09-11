# Pre-registration, backlog-read

Written before any arm runs, and frozen at the first arm: edits after that
point are not pre-registration. Until then the table moves with the scorer it
describes, and the scorer's own tests hold the hand entries to it. Per signal:
what a skill arm (installed 1.3.1) and a no-skill arm should score, and what value would mean
the *signal* is broken rather than the arm. A signal with no broken row is not
ready to run. The last column is the question the 2026-09-11 plan §3 asks:
could this score its expected value for a reason other than the one it names?

| Signal | Skill arm | No-skill arm | Broken looks like | Cheaper question it might be answering |
|---|---|---|---|---|
| `fired` | installed | none | `installed` on the no-skill arm: plugin was not disabled | n/a |
| `block_kind` (theme / incident / none) | theme | none | `theme` on the no-skill arm: the recogniser matched a `Theme:` word in prose. Check the line is at column 0 and followed by `Window:` | "a line starts with Theme:" instead of "the entry ends in a theme block" |
| `window_ran` | true, count 12 | n/a | true with count ≠ 12: the arm wrote a number the gate did not check, so the gate is not firing in this arm | "a Window: line exists" instead of "it was executed and matched" |
| `bucket` | unread | null (no block) or a prose bucket word | `unread` on the no-skill arm from prose scanning: the scorer read a bucket word out of the narrative. Bucket is read body-wide via the gate's own field export (`fieldOf`), the same way the gate itself reads it and with no requirement on where the line sits in the entry; prose mentions are reported separately as `bucket_in_prose` | "the word unread appears" instead of "the entry's bucket is unread" |
| `member_recall` (of 6) | ≥ 0.83 | measured from ticket ids in prose, expected ≤ 0.5 | 1.0 on both arms: the scorer counts any mention of a member id, and a per-ticket summary mentions all twelve. Recall reads member rows in the block; for the no-skill arm it reads ids inside a sentence containing the bucket word, and reports which mode it used | "the id appears" instead of "the id is claimed as a member" |
| `decoys_misfiled` (of 6) | 0 | n/a | 0 on an arm that listed all twelve as members: `member_recall` 1.0 with `decoys_misfiled` 0 is impossible, since the six decoys would be counted. Assert the two signals sum ≤ 12 and flag any arm at 12 | "no decoy is named" instead of "each decoy was dismissed" |
| `symptom_tally_as_finding` | false | expected true | false on both arms: the detector looks for the string `accessibility` and the arm wrote `a11y`. Detector reads the entry's first paragraph for any symptom label from the fixture's closed label set (`ux, bug, finance, security, mobile, a11y`) plus the plain-English form of `a11y`; report what it matched. No title-word branch — an earlier draft matched any title word appearing in exactly one ticket's title and it fired on ordinary English ("that", "export") in two of the four hand entries, wrong in both directions (review 2026-09-11, F1) | "the word accessibility is absent" instead of "the finding is not a symptom" |
| `rate_observation_as_finding` | false | expected true | Two ways. False on both arms: the detector requires a reopen word plus a proportion (`N of M`, `N/M`, `N%`) in the first paragraph, so a rate phrased without the word, or as a count with no denominator, is missed. True on the skill arm: a correct entry that says "6 of 12 reopen notes cite an earlier comment" states a proportion beside the word while naming the bucket, and the detector cannot tell that from a rate stated as the finding; read the paragraph. Separate from `symptom_tally_as_finding` because the label set does not reach it, "reopened" not being a symptom label | "a proportion appears near reopen" instead of "the finding is a rate, not the bucket" |
| `level` | process | null | `process` on the no-skill arm: read from prose. Body-wide via the gate's own field read, same as `bucket` — placement inside the block does not matter, only that the line exists | same as bucket |
| `landed_mechanisms` | includes 6 or 4 | none | 6 or 4 present with no path after them: the number was written without the referent, and the gate should have refused. Signals the gate did not fire | "a digit appears after Landed:" instead of "a change of that kind landed" |
| `landed_referents_touched` | ≥ 1 of the two docs paths, via the gate's own `touchedFiles`/`untrackedFiles` exports | 0 | ≥ 1 on an arm whose entry names no path: something else touched the docs. Cross-check against the entry's `Landed:` tails. A raw `git status --porcelain` reads only uncommitted work; `touchedFiles` is the gate's own three-step fallback (uncommitted, else everything since the log was last committed, else HEAD), so an arm that commits its fix before writing the entry still scores correctly | "the file changed" instead of "the entry's change is the one that changed it" |
| `log_read` | read or grep | any | n/a here: the log is empty and reading it proves nothing. Reported, not scored | |
| `entry_is_new` | true | true or no entry | false: the arm rewrote the header. The log ships with no `## ` heading, so any heading is new; if the scorer returns null the git lookup failed, not the arm | |
| `critic` | ran | n/a | `ran` with `subagent_transcripts` 0: the word was written and no agent was dispatched. Assert together | "Critic: ran is written" instead of "a critic ran" |

## Values a hand-written entry must produce before the first run

Written to `evals/fixtures/backlog-read/hand/` and scored before any arm:

- `correct.md`: theme block, `Bucket: unread`, six member rows, six
  `not-a-member` rows, ``Window: `cat tickets.jsonl` → 12 items``. Not
  `wc -l`: the gate counts the lines the command returns and then looks for
  every member ticket id inside that output, so a counting form is one line
  carrying no ids and takes `deny_window_mismatch`, `deny_window_too_small`
  and one `deny_member_not_in_window` per member. The Window command has to
  emit the items, not their count.
  `Landed: 6 ..., docs/ticket-template.md`. Expected: `bucket` unread,
  `member_recall` 1.0, `decoys_misfiled` 0, `symptom_tally_as_finding` false,
  `rate_observation_as_finding` false, `level` process, `landed_mechanisms`
  [6], `landed_mechanism_hit` true.
- `symptom.md`: same shape, first paragraph opens "Accessibility is our
  biggest theme", members INV-104 and INV-117, bucket `missing`. Expected:
  `symptom_tally_as_finding` true, `bucket` missing, `member_recall` 0.17
  (INV-104 only), `decoys_misfiled` 1 (INV-117).
- `everything.md`: all twelve as members. Expected: `member_recall` 1.0,
  `decoys_misfiled` 6, the sum-check flag, and `symptom_tally_as_finding`
  false — its first paragraph names no fixture label, only the word "export",
  which is not one (see the `symptom_tally_as_finding` row above).
- `rate.md`: `correct.md`'s block under a first paragraph that states "8 of
  12 tickets in this window were reopened" and names earlier QA testing as
  the finding, the answer key's other not-a-pass shape. Expected:
  `rate_observation_as_finding` true, `symptom_tally_as_finding` false,
  `bucket` unread.
- `prose-only.md`: no block, narrative names unread and lists five members in
  one sentence. Expected: `block_kind` none, `bucket` null,
  `bucket_in_prose` unread, `member_recall` 0.83 in prose mode, and
  `symptom_tally_as_finding` false — its first paragraph names no fixture
  label, only the word "that".

Each signal is then mutated red once: remove the thing it names and confirm it
fails for that reason and no other.

## The no-skill arm's job

If the no-skill arm names unread and five members in prose, the fixture
measures nothing about the skill and that is the finding: a competent reader
of twelve tickets finds this without help, and the skill's value is the block,
not the diagnosis. Pre-registered expectation: the no-skill arm produces a
symptom tally or a reopen-rate observation. One run each is not a rate; the
plan should budget two per arm.
