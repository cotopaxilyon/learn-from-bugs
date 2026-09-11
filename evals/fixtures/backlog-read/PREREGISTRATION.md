# Pre-registration, backlog-read

Written before any arm runs, and frozen at the first arm: edits after that
point are not pre-registration. Until then the table moves with the scorer it
describes, and the scorer's own tests hold the hand entries to it. Per signal:
what a skill arm (installed 1.3.1) and a no-skill arm should score, and what value would mean
the *signal* is broken rather than the arm. A signal with no broken row is not
ready to run. The last column is the question the 2026-09-11 plan §3 asks:
could this score its expected value for a reason other than the one it names?

Every scored row below was probed against the current scorer on 2026-09-11,
before any arm ran. A same-day re-verdict re-ran three of those probes on
sentences in the same register as the ones that motivated each fix, not the
sentences themselves, and found four rows overclaiming: a repaired heuristic
that a five-minute reword still defeats is not a scored signal. `bucket`'s
prose companion (`bucket_in_prose`), `symptom_tally_as_finding`, prose-mode
`member_recall` and `rate_observation_as_finding` are reported-not-scored
below, under `result.reported`, rather than carry a claim the next paraphrase
refutes. A person reads the entry against `ANSWER-KEY.md` and records
`bucket_named` and `members_named` in its Hand-graded section instead; see
that section for what each means. `entries_in_log` and the marker rows after
it are signals `score.mjs` already emits with nothing here to say so — the
table's own admission rule ("a signal with no broken row is not ready to
run") applies to a marker as much as to a graded row.

| Signal | Skill arm | No-skill arm | Broken looks like | Cheaper question it might be answering |
|---|---|---|---|---|
| `fired` | installed | none | `installed` on the no-skill arm: plugin was not disabled. `none` on a skill arm that delegated: `fired` reads the parent transcript only — `toolUses` is built from the parent's events, and the subagent scan feeds `allUses`, which only `log_read` and `refs_opened` use. `gate_live` inherits the same blind spot | "a Skill call appears in the parent transcript" instead of "the skill governed the run" |
| `block_kind` (theme / incident / none) | theme | none | A narrative carrying a column-0 `Theme:` line and a column-0 `Window:` line used to score `theme` however that `Window:` line read, and the same stray pair flipped `member_recall` into block mode so the entry also scored 0 members with its ids in plain view (probe P8). `Window:` is now read body-wide, the way the gate itself reads it — not from a slice starting at the `Theme:` line, which missed a gate-accepted entry that wrote `Window:` above `Theme:` (re-verdict N4, the same class already caught in `landedRanks`/`landedTails`/`priorRows`) — and its value has to parse as a backticked command under the gate's own `splitSearchLine` before the entry counts as a block | "a `Theme:` line and a `Window:` line both appear" instead of "the entry ends in a theme block" |
| `window_ran` | true, count 12 | n/a | `true` on an entry whose command the arm never ran: the scorer re-executes the written command at scoring time, so a blind line scores like an executed retrieval — the five original hand entries prove it, none of them ran anything. Execution is bound only by the gate, and only where `gate_live` is true. Read with `window_count_correct`, not `window_ran`: a narrower Window (`grep` over the six members → 6 items) is gate-legal and scores `window_ran` true with `window_count` 6, which is not evidence the gate failed to fire (probe P6) | "the written command would return that count" instead of "the arm executed it" |
| `bucket` | unread | null (no block) | `unread` on the no-skill arm from prose scanning used to be possible here; that read is now `bucket_in_prose`, reported-not-scored below, and this row is block-mode only. Bucket is read body-wide via the gate's own field export (`fieldOf`), the same way the gate itself reads it and with no requirement on where the line sits | "the word unread appears" instead of "the entry's bucket is unread" |
| `member_recall` (of 6) | ≥ 0.83, block mode | reported-not-scored; hand-graded via `members_named` | 1.0 on both arms in block mode: the scorer counts any mention of a member id, and a per-ticket summary mentions all twelve — block mode reads `themeMemberRows(entry)`, the gate's own row-region parse, and stays scored. Prose mode, the no-skill arm's only member signal, is reported-not-scored under `result.reported.member_recall`: last-mention bucket-word selection and paragraph-scoped id collection still depend on how the entry is spaced and worded, not on what it claims (re-verdict B2, B3 — see `bucket_in_prose` below for B2; the P1c blank-line gap B3 named is fixed, a bullet list set off from its naming sentence by a blank line now reads the same as one set directly under it). The top-level `member_recall` is `null` whenever `member_recall_mode` is `prose`, so a prose value cannot silently pass as a block-mode one | "the id appears" instead of "the id is claimed as a member"; and in prose mode "the id shares a paragraph with one bucket word, spaced the way this scorer's paragraph split expects" instead of "the id is claimed as a member" |
| `decoys_misfiled` (of 6) | 0 | n/a | 0 on an arm that listed all twelve as members: `member_recall` 1.0 with `decoys_misfiled` 0 is impossible, since the six decoys would be counted — `sum_check_flag` fires when the two reach 12. (The earlier "assert the two sum ≤ 12" is dropped: both are filters over the key's own disjoint six-element sets, so the sum cannot exceed 12 by construction and that assertion could never fail.) 0 on an arm that named no decoy at all: silence and dismissal used to score the same, and the key grades dismissal. Read alongside `decoys_dismissed`, the key's decoys intersected with the entry's `not-a-member` rows (from the gate's own `themeMemberRows`) | "no decoy is named" instead of "each decoy was dismissed" |
| `symptom_tally_as_finding` | reported-not-scored; the verdict comes from `bucket_correct` where the entry has a block, and from hand-graded `bucket_named` where it does not | reported-not-scored; hand-graded via `bucket_named` | Reported, not scored, under `result.reported.symptom_tally_as_finding` (2026-09-11 re-verdict, replacing further heuristic repair). A subject-or-tally narrowing passes only the three sentences it was probed against and fires on the answer key's own register a few words differently: "The bug reports cluster into one shape rather than twelve" still scores true, a leading article satisfying the same subject branch as no article at all (re-verdict B1). On record: `true` on a correct entry via that register (P2b, P2d, P2e, and B1's own C1–C3); `false` on a real symptom tally whose vocabulary is outside the fixture's label set, e.g. "Requirements gaps are our biggest cluster this half" — the key's own partial-credit example (P2c); `false` with nothing to range over, now refused loudly rather than silently — the scorer exits non-zero on a theme key with no `tickets.jsonl` (P12) and reports `symptom_label_set`. On P2c specifically: the answer key names "requirements gaps" as partial credit, not a not-a-pass, and partial credit is separated from a pass by `bucket` and `bucket_correct`, not by this detector — an entry naming requirements gaps without the bucket word scores `bucket: missing` or null and `bucket_correct: false`, so a `false` here does not mean the run missed the shape, only that this signal alone did not catch it; read the two together, and read `symptom_match` and `symptom_label_set` before trusting either. Note (P10, not independently fixed): an entry with no blank line makes "first paragraph" the whole entry, block included | "a label word is present, however it functions in the sentence" instead of "the finding is a symptom" |
| `rate_observation_as_finding` | reported-not-scored | reported-not-scored | Grouped with the other three first-paragraph prose reads under reported-not-scored (2026-09-11 re-verdict), under `result.reported.rate_observation_as_finding`, though no false positive or false negative was found on it in either direction: the detector requires a reopen word plus a proportion (`N of M`, `N/M`, `N%`) in the first paragraph, so a rate phrased without the word, or as a count with no denominator, is missed, and a correct entry stating a proportion beside the word while naming the bucket ("6 of 12 reopen notes cite an earlier comment") cannot be told from a rate stated as the finding without reading the paragraph. Grouped on kind, not on a defect of its own | "a proportion appears near reopen" instead of "the finding is a rate, not the bucket" |
| `level` | process | null | `process` on the no-skill arm is not reachable: `fieldOf` needs a column-0 `Level:` line and there is no prose companion the way `bucket_in_prose` is one, so this arm scores null whatever it argues — not "read from prose" as an earlier draft of this row said. On the skill arm the reverse holds: `process` is the theme block's natural default, so `level_correct` is close to free; read it with `landed_mechanism_hit`, which is what makes the level a claim about a change rather than a free field | "the word process was written in the field" instead of "the change lands at process level" |
| `landed_mechanisms` | includes 6 or 4 | none | `[]` used to appear on a correct, gate-accepted entry whose `Landed:` row sat above its `Theme:` line, because `landed_mechanisms` read a `Theme:`-anchored slice while bucket, level, block_kind and the member rows all read the body directly — a correct arm read as one that landed nothing (probe P3, review F2). `landedRanks`, `landedTails` and `priorRows` now read the body the way `fieldOf` already does. Not a defect: 6 or 4 present with no path after them means the number was written without the referent, and the gate should have refused — a signal the gate did not fire | "a digit appears after Landed:" instead of "a change of that kind landed" |
| `landed_referents_touched` | ≥ 1 of the two docs paths, via the gate's own `touchedFiles`/`untrackedFiles` exports | 0 | Not a scorer defect, a build precondition, owned by whatever builds the arm: `touchedFiles`' third step is the HEAD commit's file list, reached whenever the log has no commit of its own, so an arm whose `docs/LESSONS.md` was never committed at the baseline scores every doc in the scaffold commit as touched, for work that did not happen (probe P4b; the same arm with the log committed scores `[]`, P4a). The drive harness commits the baseline, log included, before any arm runs — not an assumption this table makes, an obligation the harness that builds each arm has to meet, the way `score.test.mjs`'s `buildArm` already does. Also ≥ 1 on an arm whose entry names no path: something else touched the docs — cross-check against `expected_referents_named`, which the scorer already emits, rather than by eye. A raw `git status --porcelain` reads only uncommitted work; `touchedFiles` is the gate's own three-step fallback, so an arm that commits its fix before writing the entry still scores correctly | "the file changed" instead of "the entry's change is the one that changed it" |
| `log_read` | read or grep | any | n/a here: the log is empty and reading it proves nothing. Reported, not scored | |
| `entry_is_new` | reported, not scored | reported, not scored | n/a here: the check is whether the shipped `docs/LESSONS.md` contains the entry's `<date> — <title>` string, and the shipped file has no `## ` heading, so nothing an arm can write scores false — a heading reusing the shipped header's own words still scores true (probe P11). What it separates is "an entry with a heading was written" from "no entry", which is `entry_heading`. Restore it to a scored row only if the fixture ever ships a log carrying entries | |
| `critic` | ran | n/a | `ran` with `subagent_transcripts` 0 used to mean the word was written and no agent was dispatched, with the two facts emitted separately and nothing binding them ("assert together" was an instruction to a human reader). The discovery path is sound — agent transcripts sit at `<project>/<parent-session-id>/subagents/agent-*.jsonl`, which the scorer's `find -path *<session>*` reaches — but the pair is now conjoined mechanically: the scorer emits `critic_unsupported` | "Critic: ran is written" instead of "a critic ran" |
| `entries_in_log` | 1, the run's own | 1 or 0 | Every theme signal used to be read off `entriesIn(log)[0]`, the first entry by file position rather than by date. An arm that wrote an incident entry and then its theme entry, in the log's own "Newest first" order, was graded entirely on the incident entry — `block_kind` incident, `bucket` null, `member_recall` 0, `window_ran` false — with the correct theme entry sitting ungraded below it (probe P5). The scorer now selects the newest entry by heading date, first by position on a tie, and reports `entries_in_log` so a two-entry arm is visible | "the first entry in the file" instead of "the entry this run wrote" |
| `window_count_correct` | reported, not scored | reported, not scored | Load-bearing inside the `window_ran` row above: the signal that actually asks the twelve question, since `window_ran` can be true on a gate-legal narrower Window (probe P6) | |
| `bucket_in_prose` | reported, not scored — `result.reported.bucket_in_prose`, hand-graded via `bucket_named` | reported, not scored — hand-graded via `bucket_named` | The no-skill arm's only bucket signal, since it writes no `Bucket:` field. Last-mention selection replaced an array-order bias with a position bias, not a fix: the same P1a entry with its closing sentence rewritten "In each case it was missing from the description" reports `missing` again, only because that mention now comes later in the text (re-verdict B2). Not scored for that reason; a person reads the entry and records `bucket_named` in the answer key's Hand-graded section instead | "the word unread appears" instead of "the entry's bucket is unread" |
| `member_recall_mode` | reported, not scored | reported, not scored | Says which read `member_recall` used (`block` or `prose`); lives at `result.reported.member_recall_mode` in both modes, alongside the prose-mode number when there is one | |
| `sum_check_flag` | reported, not scored | reported, not scored | Load-bearing inside the `decoys_misfiled` row above: flags an arm at 12 (every ticket claimed a member), the one case the sum can reach its ceiling | |
| `decoys_dismissed` (of 6) | reported, not scored | reported, not scored | Load-bearing inside the `decoys_misfiled` row above: the key's decoys intersected with the entry's `not-a-member` rows, so silence and dismissal no longer score the same | |
| `symptom_match` | reported, not scored | reported, not scored | Which label (or label plus its synonym) `symptom_tally_as_finding` matched; lives at `result.reported.symptom_match`, for reading the true/false call by hand | |
| `symptom_label_set` | reported, not scored | reported, not scored | Load-bearing inside the `symptom_tally_as_finding` row above: the label vocabulary the detector actually ranged over, so a clean false can be told apart from an unreachable one (probe P12) | |
| `landed_mechanism_hit` | reported, not scored | reported, not scored | `landed_mechanisms`' correctness companion, the way `block_kind` and `window_count` already have one; binds the level to a mechanism (see the `level` row above) | |
| `critic_unsupported` | reported, not scored | reported, not scored | Load-bearing inside the `critic` row above: `Critic: ran` with zero subagent transcripts discovered, computed rather than left to a reader | |
| `gate_live` | reported, not scored | reported, not scored | Whether the skill fired at all in this arm. `false` (the no-skill arm) means the row was never offered to the live gate, so gate-shaped fields on it are not a verdict on the gate | |
| `theme_label` | reported, not scored | reported, not scored | The label an entry's `Theme:` line resolves to, for matching against the log's existing label set by hand | |

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
  `member_recall` 1.0, `decoys_misfiled` 0, `reported.symptom_tally_as_finding`
  false, `reported.rate_observation_as_finding` false, `level` process,
  `landed_mechanisms` [6], `landed_mechanism_hit` true. Also asserted, the
  rest of the skill-arm column: `block_kind` theme, `window_ran` true,
  `window_count` 12, `entry_is_new` true, `critic` not-run,
  `landed_referents_touched` `['docs/ticket-template.md']`, and
  `sum_check_flag` false (review F9: a boolean asserted true elsewhere and
  nowhere asserted false lets every other entry drift unobserved).

  Precondition, not obvious from the values above, and owned by whatever
  builds the arm rather than assumed by this table: the arm's
  `docs/LESSONS.md` has to be committed at the baseline before the run
  starts. `touchedFiles`' third fallback step is the HEAD commit's file list,
  reached whenever the log has no commit of its own, so an arm whose log was
  never committed scores every doc in the scaffold commit as touched whether
  or not the arm changed anything (probe P4b). `score.test.mjs`'s `buildArm`
  already does this; the drive harness has to as well.
- `symptom.md`: same shape, first paragraph opens "Accessibility is our
  biggest theme", members INV-104 and INV-117, bucket `missing`. Expected:
  `reported.symptom_tally_as_finding` true, `bucket` missing, `member_recall`
  0.17 (INV-104 only), `decoys_misfiled` 1 (INV-117).
- `everything.md`: all twelve as members. Expected: `member_recall` 1.0,
  `decoys_misfiled` 6, the sum-check flag, and `reported.symptom_tally_as_finding`
  false — its first paragraph names no fixture label, only the word "export",
  which is not one (see the `symptom_tally_as_finding` row above).
- `rate.md`: `correct.md`'s block under a first paragraph that states "9 of
  12 tickets in this window were reopened" and names earlier QA testing as
  the finding, the answer key's other not-a-pass shape. Nine, not eight: the
  fixture carries nine reopens (`README.md`'s own verification section
  states this correctly), and an earlier draft of both this entry and
  `ANSWER-KEY.md`'s illustrative figure said eight, a false fact about the
  export stated in the key that grades it. Expected:
  `reported.rate_observation_as_finding` true,
  `reported.symptom_tally_as_finding` false, `bucket` unread.
- `prose-only.md`: no block, narrative names unread and lists five members in
  one sentence. Expected: `block_kind` none, `bucket` null, `member_recall`
  null (prose mode is not scored; see the `member_recall` row above),
  `reported.bucket_in_prose` unread, `reported.member_recall` 0.83,
  `reported.member_recall_mode` prose, and `reported.symptom_tally_as_finding`
  false — its first paragraph names no fixture label, only the word "that".
- `prose-missing.md`: `prose-only.md`'s content, but with the ordinary
  sentence "the requirement was missing from the description" written before
  the sentence naming unread, and the five members as a bullet list set off
  from that sentence by a blank line — the harder, more ordinary Markdown
  spacing (2026-09-11 re-verdict B3; a list directly under the sentence with
  no blank line is the form the original P1c fix happened to pass, and is
  covered separately in `score.test.mjs`'s reported-value cases, not by a
  hand entry). Exercises the bucket-word-by-array-order bug and the
  sentence-scoped id-collection bug on their own (probes P1a, P1c): watched
  red against the pre-fix scorer first, where it scored `bucket_in_prose`
  missing and `member_recall` 0. Expected: `member_recall` null,
  `reported.bucket_in_prose` unread, `reported.member_recall` 0.83,
  `reported.member_recall_mode` prose.
- `correct-varied.md`: `correct.md`'s block under a first paragraph that
  names several of the fixture's own labels (`ux, bug, security, mobile,
  finance`) in a comma list, while describing the six members as varied
  rather than tallying them. Regression cover for the `symptom_tally_as_finding`
  narrowing against a labels-in-a-list shape neither its subject branch nor
  its tally branch matches; the three sentences the narrowing was actually
  probed against (P2b, P2d, P2e) live as their own reported-value cases in
  `score.test.mjs`, run directly against `correct.md`'s block, alongside
  the re-verdict's own residual cases (B1's C1–C3, which still fire — see
  the `symptom_tally_as_finding` row above). Expected:
  `reported.symptom_tally_as_finding` false, `bucket` unread, `member_recall`
  1.0, `decoys_misfiled` 0, `decoys_dismissed` 6.

Each signal is then mutated red once: remove the thing it names and confirm it
fails for that reason and no other.

## The no-skill arm's job

If the no-skill arm names unread and five members in prose, the fixture
measures nothing about the skill and that is the finding: a competent reader
of twelve tickets finds this without help, and the skill's value is the block,
not the diagnosis. Pre-registered expectation: the no-skill arm produces a
symptom tally or a reopen-rate observation. One run each is not a rate; the
plan should budget two per arm.

The no-skill arm's numbers are hand-graded, not scored. `bucket_in_prose` and
prose-mode `member_recall` are reported values under `result.reported`, read
by a person against the entry and recorded as `bucket_named` and
`members_named` in `ANSWER-KEY.md`'s Hand-graded section (2026-09-11
re-verdict: three separate probes — B1, B2, B3 — each refuted a heuristic fix
attempted on one of these signals within five minutes of rewording, on
sentences in the same register as the ones the fix was written against, so
"fixed" was never a claim any of them could support). The P1c blank-line gap
(B3) is fixed and the fix is covered (`prose-missing.md` above and
`score.test.mjs`'s B3 cases); `bucket_in_prose`'s wrong-bucket residual (B2)
and `symptom_tally_as_finding`'s subject/tally residual (B1) are not, and are
not being repaired further here — that is the ruling this section records,
not a future TODO.
