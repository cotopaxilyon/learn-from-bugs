# Pre-registration, backlog-read-dates

Written before any arm runs, committed alone before any of the fixture's own
files exist, and frozen at the first arm of run 12: edits after that point
are not pre-registration. Until then the table moves with the scorer it
describes, and the scorer's own tests hold the hand entries to it. Run 12
budgets two runs per arm across three arms: `cand` (the installed skill),
`base` (the 1.1.0 copy, block-less), and `base-0` (nothing loaded). Per
signal: what each arm should score, and what value would mean the *signal*
is broken rather than the arm. A signal with no broken row is not ready to
run. The last column is the question the plan's third decision asks: could
this score its expected value for a reason other than the one it names?

The no-confession rule covers every ticket's bucket, not only the six
members: the export may not state the bucket of any ticket, decoys
included, and the confession check ranges over per-bucket phrase lists
carried in the answer key, not a single member-shaped list.

Every scored row below was probed against the current scorer before this
table was written. The scorer is unchanged from the sibling fixture
(`backlog-read`), so its own probe history carries over unchanged: a same-day
re-verdict once re-ran three probes on sentences in the same register as the
ones that motivated each fix, not the sentences themselves, and found four
rows overclaiming. `bucket`'s prose companion (`bucket_in_prose`),
`symptom_tally_as_finding`, prose-mode `member_recall` and
`rate_observation_as_finding` are reported-not-scored below, under
`result.reported`, rather than carry a claim the next paraphrase refutes. A
person reads the entry against `ANSWER-KEY.md` and records `bucket_named`
and `members_named` in its Hand-graded section instead; see that section for
what each means. `entries_in_log` and the marker rows after it are signals
`score.mjs` already emits with nothing here to say so: the table's own
admission rule ("a signal with no broken row is not ready to run") applies to
a marker as much as to a graded row.

| Signal | cand | base | base-0 | Broken looks like | Cheaper question it might be answering |
|---|---|---|---|---|---|
| `fired` | installed | candidate (1.1.0) | none | `installed` on a base or base-0 arm: plugin was not disabled. `none` on a skill arm that delegated: `fired` reads the parent transcript only, since `toolUses` is built from the parent's events, and the subagent scan feeds `allUses`, which only `log_read` and `refs_opened` use. `gate_live` inherits the same blind spot | "a Skill call appears in the parent transcript" instead of "the skill governed the run" |
| `block_kind` (theme / incident / none) | theme | none | none | A narrative carrying a column-0 `Theme:` line and a column-0 `Window:` line used to score `theme` however that `Window:` line read, and the same stray pair flipped `member_recall` into block mode so the entry also scored 0 members with its ids in plain view (probe P8). `Window:` is now read body-wide, the way the gate itself reads it, not from a slice starting at the `Theme:` line, which missed a gate-accepted entry that wrote `Window:` above `Theme:` (re-verdict N4, the same class already caught in `landedRanks`/`landedTails`/`priorRows`), and its value has to parse as a backticked command under the gate's own `splitSearchLine` before the entry counts as a block | "a `Theme:` line and a `Window:` line both appear" instead of "the entry ends in a theme block" |
| `window_ran` | true, count 12 | n/a | n/a | `true` on an entry whose command the arm never ran: the scorer re-executes the written command at scoring time, so a blind line scores like an executed retrieval: the five original hand entries prove it, none of them ran anything. Execution is bound only by the gate, and only where `gate_live` is true. Read with `window_count_correct`, not `window_ran`: a narrower Window (`grep` over the six members → 6 items) is gate-legal and scores `window_ran` true with `window_count` 6, which is not evidence the gate failed to fire (probe P6) | "the written command would return that count" instead of "the arm executed it" |
| `bucket` | unread | null (no block) | null (no block) | `unread` on a block-less arm from prose scanning used to be possible here; that read is now `bucket_in_prose`, reported-not-scored below, and this row is block-mode only. Bucket is read body-wide via the gate's own field export (`fieldOf`), the same way the gate itself reads it and with no requirement on where the line sits | "the word unread appears" instead of "the entry's bucket is unread" |
| `member_recall` (of 6) | ≥ 0.83, block mode | reported-not-scored; hand-graded via `members_named` | reported-not-scored; hand-graded via `members_named` | 1.0 on both arms in block mode: the scorer counts any mention of a member id, and a per-ticket summary mentions all twelve; block mode reads `themeMemberRows(entry)`, the gate's own row-region parse, and stays scored. Prose mode, a block-less arm's only member signal, is reported-not-scored under `result.reported.member_recall`: last-mention bucket-word selection and paragraph-scoped id collection still depend on how the entry is spaced and worded, not on what it claims (re-verdict B2, B3; see `bucket_in_prose` below for B2; the P1c blank-line gap B3 named is fixed, a bullet list set off from its naming sentence by a blank line now reads the same as one set directly under it). The top-level `member_recall` is `null` whenever `member_recall_mode` is `prose`, so a prose value cannot silently pass as a block-mode one | "the id appears" instead of "the id is claimed as a member"; and in prose mode "the id shares a paragraph with one bucket word, spaced the way this scorer's paragraph split expects" instead of "the id is claimed as a member" |
| `decoys_misfiled` (of 6) | 0 | n/a | n/a | 0 on an arm that listed all twelve as members: `member_recall` 1.0 with `decoys_misfiled` 0 is impossible, since the six decoys would be counted; `sum_check_flag` fires when the two reach 12. (The earlier "assert the two sum ≤ 12" is dropped: both are filters over the key's own disjoint six-element sets, so the sum cannot exceed 12 by construction and that assertion could never fail.) 0 on an arm that named no decoy at all: silence and dismissal used to score the same, and the key grades dismissal. Read alongside `decoys_dismissed`, the key's decoys intersected with the entry's `not-a-member` rows (from the gate's own `themeMemberRows`) | "no decoy is named" instead of "each decoy was dismissed" |
| `symptom_tally_as_finding` | reported-not-scored; the verdict comes from `bucket_correct` where the entry has a block, and from hand-graded `bucket_named` where it does not | reported-not-scored; hand-graded via `bucket_named` | reported-not-scored; hand-graded via `bucket_named` | Reported, not scored. A subject-or-tally narrowing passes only the three sentences it was probed against and fires on the answer key's own register a few words differently: "The bug reports cluster into one shape rather than twelve" still scores true, a leading article satisfying the same subject branch as no article at all (re-verdict B1). On record: `true` on a correct entry via that register (P2b, P2d, P2e, and B1's own C1–C3); `false` on a real symptom tally whose vocabulary is outside the fixture's label set, e.g. "Requirements gaps are our biggest cluster this half"; `false` with nothing to range over, refused loudly rather than silently: the scorer exits non-zero on a theme key with no `tickets.jsonl` (P12) and reports `symptom_label_set`. A `false` here does not mean the run missed the shape, only that this signal alone did not catch it; read `bucket`/`bucket_correct` (block mode) or `bucket_named` (hand-graded) before trusting either. Note (P10, not independently fixed): an entry with no blank line makes "first paragraph" the whole entry, block included | "a label word is present, however it functions in the sentence" instead of "the finding is a symptom" |
| `rate_observation_as_finding` | reported-not-scored | reported-not-scored | reported-not-scored | Grouped with the other three first-paragraph prose reads under reported-not-scored, under `result.reported.rate_observation_as_finding`, though no false positive or false negative was found on it in either direction: the detector requires a reopen word plus a proportion (`N of M`, `N/M`, `N%`) in the first paragraph, so a rate phrased without the word, or as a count with no denominator, is missed, and a correct entry stating a proportion beside the word while naming the bucket cannot be told from a rate stated as the finding without reading the paragraph | "a proportion appears near reopen" instead of "the finding is a rate, not the bucket" |
| `level` | reported, not scored (the theme block has no `Level:` line, both skill arms scored null on correct entries in the sibling fixture's run, and `expected_level` left the theme key; this row's pre-registered `process` is the incident shape carried over) | null | null | `process` on a block-less arm is not reachable: `fieldOf` needs a column-0 `Level:` line and there is no prose companion the way `bucket_in_prose` is one, so this arm scores null whatever it argues, not "read from prose" as an earlier draft of this row said. On the cand arm the reverse holds: `process` is the theme block's natural default, so `level_correct` is close to free; read it with `landed_mechanism_hit`, which is what makes the level a claim about a change rather than a free field | "the word process was written in the field" instead of "the change lands at process level" |
| `landed_mechanisms` | includes 6 or 4 | none | none | `[]` used to appear on a correct, gate-accepted entry whose `Landed:` row sat above its `Theme:` line, because `landed_mechanisms` read a `Theme:`-anchored slice while bucket, level, block_kind and the member rows all read the body directly, so a correct arm read as one that landed nothing (probe P3, review F2). `landedRanks`, `landedTails` and `priorRows` now read the body the way `fieldOf` already does. Not a defect: 6 or 4 present with no path after them means the number was written without the referent, and the gate should have refused: a signal the gate did not fire | "a digit appears after Landed:" instead of "a change of that kind landed" |
| `landed_referents_touched` | ≥ 1 of the two docs paths, via the gate's own `touchedFiles`/`untrackedFiles` exports | 0 | 0 | Not a scorer defect, a build precondition, owned by whatever builds the arm: `touchedFiles`' third step is the HEAD commit's file list, reached whenever the log has no commit of its own, so an arm whose `docs/LESSONS.md` was never committed at the baseline scores every doc in the scaffold commit as touched, for work that did not happen (probe P4b; the same arm with the log committed scores `[]`, P4a). The drive harness commits the baseline, log included, before any arm runs; not an assumption this table makes, an obligation the harness that builds each arm has to meet, the way `score.test.mjs`'s `buildArm` already does. Also ≥ 1 on an arm whose entry names no path: something else touched the docs; cross-check against `expected_referents_named`, which the scorer already emits, rather than by eye. A raw `git status --porcelain` reads only uncommitted work; `touchedFiles` is the gate's own three-step fallback, so an arm that commits its fix before writing the entry still scores correctly | "the file changed" instead of "the entry's change is the one that changed it" |
| `log_read` | read or grep | any | any | n/a here: the log is empty and reading it proves nothing. Reported, not scored | |
| `entry_is_new` | reported, not scored | reported, not scored | reported, not scored | n/a here: the check is whether the shipped `docs/LESSONS.md` contains the entry's full heading string (date and title together), and the shipped file has no `## ` heading, so nothing an arm can write scores false; a heading reusing the shipped header's own words still scores true (probe P11). What it separates is "an entry with a heading was written" from "no entry", which is `entry_heading`. Restore it to a scored row only if the fixture ever ships a log carrying entries | |
| `critic` | ran | n/a | n/a | `ran` with `subagent_transcripts` 0 used to mean the word was written and no agent was dispatched, with the two facts emitted separately and nothing binding them ("assert together" was an instruction to a human reader). The discovery path is sound: agent transcripts sit at `<project>/<parent-session-id>/subagents/agent-*.jsonl`, which the scorer's `find -path *<session>*` reaches, but the pair is now conjoined mechanically: the scorer emits `critic_unsupported` | "Critic: ran is written" instead of "a critic ran" |
| `entries_in_log` | 1, the run's own | 1 or 0 | 1 or 0 | Every theme signal used to be read off `entriesIn(log)[0]`, the first entry by file position rather than by date. An arm that wrote an incident entry and then its theme entry, in the log's own "Newest first" order, was graded entirely on the incident entry (`block_kind` incident, `bucket` null, `member_recall` 0, `window_ran` false), with the correct theme entry sitting ungraded below it (probe P5). The scorer now selects the newest entry by heading date, first by position on a tie, and reports `entries_in_log` so a two-entry arm is visible | "the first entry in the file" instead of "the entry this run wrote" |
| `window_count_correct` | reported, not scored | reported, not scored | reported, not scored | Load-bearing inside the `window_ran` row above: the signal that actually asks the twelve question, since `window_ran` can be true on a gate-legal narrower Window (probe P6) | |
| `bucket_in_prose` | reported, not scored (`result.reported.bucket_in_prose`), hand-graded via `bucket_named` | reported, not scored, hand-graded via `bucket_named` | reported, not scored, hand-graded via `bucket_named` | A block-less arm's only bucket signal, since it writes no `Bucket:` field. Last-mention selection replaced an array-order bias with a position bias, not a fix: the same P1a entry with its closing sentence rewritten "In each case it was missing from the description" reports `missing` again, only because that mention now comes later in the text (re-verdict B2). Not scored for that reason; a person reads the entry and records `bucket_named` in the answer key's Hand-graded section instead | "the word unread appears" instead of "the entry's bucket is unread" |
| `member_recall_mode` | reported, not scored | reported, not scored | reported, not scored | Says which read `member_recall` used (`block` or `prose`); lives at `result.reported.member_recall_mode` in both modes, alongside the prose-mode number when there is one | |
| `sum_check_flag` | reported, not scored | reported, not scored | reported, not scored | Load-bearing inside the `decoys_misfiled` row above: flags an arm at 12 (every ticket claimed a member), the one case the sum can reach its ceiling | |
| `decoys_dismissed` (of 6) | reported, not scored | reported, not scored | reported, not scored | Load-bearing inside the `decoys_misfiled` row above: the key's decoys intersected with the entry's `not-a-member` rows, so silence and dismissal no longer score the same | |
| `symptom_match` | reported, not scored | reported, not scored | reported, not scored | Which label (or label plus its synonym) `symptom_tally_as_finding` matched; lives at `result.reported.symptom_match`, for reading the true/false call by hand | |
| `symptom_label_set` | reported, not scored | reported, not scored | reported, not scored | Load-bearing inside the `symptom_tally_as_finding` row above: the label vocabulary the detector actually ranged over, so a clean false can be told apart from an unreachable one (probe P12) | |
| `landed_mechanism_hit` | reported, not scored | reported, not scored | reported, not scored | `landed_mechanisms`' correctness companion, the way `block_kind` and `window_count` already have one; binds the level to a mechanism (see the `level` row above) | |
| `critic_unsupported` | reported, not scored | reported, not scored | reported, not scored | Load-bearing inside the `critic` row above: `Critic: ran` with zero subagent transcripts discovered, computed rather than left to a reader | |
| `gate_live` | reported, not scored | reported, not scored | reported, not scored | Whether the skill fired at all in this arm. `false` (a base or base-0 arm) means the row was never offered to the live gate, so gate-shaped fields on it are not a verdict on the gate | |
| `theme_label` | reported, not scored | reported, not scored | reported, not scored | The label an entry's `Theme:` line resolves to, for matching against the log's existing label set by hand | |
| `cold_reader_answer` | Recorded 2026-09-11, before the bundle was built, by a fresh agent reader (Opus, nothing loaded) given only the draft export, `docs/` and the prompt. One change: before In Progress, whoever picks up a ticket rewrites the AC block to cover every requirement raised in comments and the raiser confirms; amend the definition of done. Groups: requirement stated pre-work and never folded into the AC, INV-101, 104, 107, 110, 113, 116; undefined AC term, INV-102, 114; cross-path inconsistency, INV-111; ordinary defects QA caught, INV-105, 108, 117. Cause stated outright by any comment: no, inferred. Route: a flat metadata table first (labels, found_by, reopen_count, close_reason, cycle time), a dead end, then comment dates compared against `in_progress_at`. Verdict under the rule: the fixture is working, the six were found by the date comparison. Note for the arm run: this reader is the base-0 arm's shape and it succeeded, so the base-0 prediction below is expected to fail and its stated consequence is expected to apply | same | same | The reader records the route it used alongside the answer, before the grade is entered. Not ready is when the reader names the six members under the planted bucket without reporting a comparison of comment dates against `in_progress_at` or the description as its route, or when it names any decoy's bucket from that decoy's own words. A reader who finds the six by the date comparison is the fixture working, and the row says so | "the reader guessed from general familiarity with tracker exports" instead of "the reader derived the six from comparing each ticket's comment dates against its description and in-progress timestamps" |

## Values a hand-written entry must produce before the first run

Written to `evals/fixtures/backlog-read-dates/hand/` and scored before any
arm. Copied from the sibling fixture's hand entries, since the block and the
prose shape do not depend on confessions:

- `correct.md`: theme block, `Bucket: unread`, six member rows, six
  `not-a-member` rows, ``Window: `cat tickets.jsonl` → 12 items``. Not
  `wc -l`: the gate counts the lines the command returns and then looks for
  every member ticket id inside that output, so a counting form is one line
  carrying no ids and takes `deny_window_mismatch`, `deny_window_too_small`
  and one `deny_member_not_in_window` per member. The Window command has to
  emit the items, not their count.
  `Landed: 6 ..., docs/ticket-template.md`. Expected: `bucket` unread,
  `member_recall` 1.0, `decoys_misfiled` 0, `reported.symptom_tally_as_finding`
  false, `reported.rate_observation_as_finding` false, `level` process,
  `landed_mechanisms` [6], `landed_mechanism_hit` true. Also asserted, the
  rest of the cand column: `block_kind` theme, `window_ran` true,
  `window_count` 12, `entry_is_new` true, `critic` not-run,
  `landed_referents_touched` `['docs/ticket-template.md']`, and
  `sum_check_flag` false (a boolean asserted true elsewhere and nowhere
  asserted false lets every other entry drift unobserved).

  Precondition, not obvious from the values above, and owned by whatever
  builds the arm rather than assumed by this table: the arm's
  `docs/LESSONS.md` has to be committed at the baseline before the run
  starts. `touchedFiles`' third fallback step is the HEAD commit's file list,
  reached whenever the log has no commit of its own, so an arm whose log was
  never committed scores every doc in the scaffold commit as touched whether
  or not the arm changed anything (probe P4b). `score.test.mjs`'s `buildArm`
  already does this; the drive harness has to as well.
- `prose-only.md`: no block, narrative names unread and lists five members in
  one sentence. Expected: `block_kind` none, `bucket` null, `member_recall`
  null (prose mode is not scored; see the `member_recall` row above),
  `reported.bucket_in_prose` unread, `reported.member_recall` 0.83,
  `reported.member_recall_mode` prose, and `reported.symptom_tally_as_finding`
  false, since its first paragraph names no fixture label, only the word "that".

Each signal is then mutated red once: remove the thing it names and confirm it
fails for that reason and no other.

## Run 12 hand-graded columns

Two columns, read on every arm whose entry carries no block (`base` and
`base-0` on this fixture, since `cand` is expected to write the theme block):
`bucket_named` and `members_named`, both defined in `ANSWER-KEY.md`'s
Hand-graded section and read against it by the agent running the run-12
drive session, initials recorded in `RESULTS.md` at grading time. Both
`base-0` runs are expected to write no file at all, per the pre-registered
prediction below, so their two columns are graded from the chat answer
itself: the `result` field of the run's own transcript, the same field
run 11's `base-0` was read from, rather than from a log entry on disk. If a
`base-0` run writes a file anyway, that file is read instead and the
departure from the pre-registered no-file prediction is noted alongside the
grade.

## The base and base-0 arms' job

Pre-registered expectation, per the plan's third decision: `base-0` fails.
`bucket_named` for `base-0` is expected to be something other than `unread`
(a symptom label, a reopen-rate reading, or `none`), and `members_named` is
expected to fall below five. If `base-0` still names `unread` with five or
more members, the fixture measures nothing about the skill at this scale,
and that is the finding: the diagnosis question closes for this fixture
family, and the skill's case for improving diagnosis moves to the artifact,
which run 11 already measured.

`base` carries the retrieval procedure without the block, so it is expected
to succeed where `base-0` fails: `bucket_named` `unread` with five or more
members. A `base` failure alongside a `cand` success is the result that
would credit the block itself, not the procedure underneath it. A `base`
success alongside a `base-0` failure is the result that credits the
procedure, whether or not the block that packages it also lands; the two
arms exist to tell those apart. One run each is not a rate; the plan budgets
two per arm.

`bucket_in_prose` and prose-mode `member_recall` are reported values under
`result.reported`, read by a person against the entry and recorded as
`bucket_named` and `members_named` in `ANSWER-KEY.md`'s Hand-graded section
(three separate probes on the sibling fixture, B1, B2, B3, each refuted a
heuristic fix attempted on one of these signals within five minutes of
rewording, on sentences in the same register as the ones the fix was written
against, so "fixed" was never a claim any of them could support). The P1c
blank-line gap (B3) is fixed and the fix is covered by `score.test.mjs`'s B3
cases; `bucket_in_prose`'s wrong-bucket residual (B2) and
`symptom_tally_as_finding`'s subject/tally residual (B1) are not, and are not
being repaired further here; that is the ruling this section records, not a
future TODO.
