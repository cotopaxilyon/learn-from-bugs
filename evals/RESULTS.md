# Trigger test results

Recorded per `README.md`: a trigger result is only true for the model that
produced it, and only if the skill was actually in that session's registry.

**The registry precondition is not optional.** A session started before the skill
directory existed inherits a registry without it, and every case then returns a
false negative, including the negative case, which reads as a *pass*. Three runs
were voided this way on 2026-08-31 before the inventory check was added.

## Run 6, 2026-09-01, Opus, the reworded description

A voice check rewrote the new clause into complete imperative clauses, same
meaning, different bytes. The trigger surface is the description, so run 5 stopped
covering what ships and all four cases were re-run. All four pass again, each turn
confirmed complete before the verdict was read.

| Case | Fired | Expected | Result |
|---|---|---|---|
| `relayed` | yes, turn one | must fire | **pass** |
| `land-the-approved-fix` | yes, turn two | must fire | **pass** |
| `negative-with-context` | no | must not fire | **pass** |
| `negative` | no | must not fire | **pass** |

The baseline arm from run 5 was not repeated, since the published description did
not change between the two runs and it is the published side that arm measures.

## Run 5, 2026-09-01, Opus, against an unpublished candidate

The description gained a clause for two shapes that carry no defect vocabulary,
after a session reported missing both. Run against the candidate rather than the
installed plugin, by the local method in `README.md`. Every verdict is read from
the transcript, not from the prose.

| Case | Fired | Expected | Result |
|---|---|---|---|
| `relayed` | yes | must fire | **pass** |
| `land-the-approved-fix` | yes, on turn two | must fire | **pass** |
| `negative-with-context` | no | must not fire | **pass** |
| `negative` | no | must not fire | **pass** |

The guards are what make this a result rather than a demonstration.
`negative-with-context` put two turns of real defect discussion directly before an
ordinary feature request and the skill stayed quiet, so what pulls it in is the
message instructing the agreed fix, not a defect being present in the session at
all. `land-the-approved-fix` fired on a message that is
word for word the shape of a build instruction.

**Baseline arm.** `land-the-approved-fix` was re-run with only the installed
1.0.0 in the registry, same two turns, same fixture. Turn two edited the validator
and never invoked the skill, and the turn ran to a natural close. With the clause
loaded it fires on turn two and writes a test before touching the file. So
the difference comes from the clause, not from the setup. A
first attempt at this arm was inconclusive and nearly recorded as a result: a
two-minute limit cut the assistant off mid-sentence at "Making the change:",
which is exactly the shape a late invocation would hide behind.

**A correction to the report this clause came from.** It described two misses. The
first holds: the session's opening message relayed two standing findings and
nothing fired before the next user turn. The second does not. The transcript shows
seven file writes, then the skill invoked unprompted, then two more writes, all
inside that turn, with the user's next message much later. So it fired late rather
than not at all, and the clause buys earlier firing on that shape rather than any
firing. The baseline arm above is what makes the clause defensible without it.

**Four caveats, and the second is the one that could bite.** These ran as
`claude -p` sessions rather than interactive ones, and the
candidate sat in the registry alongside the installed 1.0.0, so attribution rests
on the bare-name distinction. One run per case per arm rather than three. Of run
4's cases, only `negative` was repeated against the new description.

## Run 4, 2026-09-01, Sonnet

All four cases, dispatched as fresh Sonnet subagents with the registry confirmed
first by a separate agent that ran no case. Each case was sent as the bare prompt;
the "which skill did you invoke" question was asked only afterwards, as a second
message, never in the prompt.

| Case | Registry confirmed | Fired | Expected | Result |
|---|---|---|---|---|
| `negative`: "Add a dark mode toggle to the settings page" | yes | no, reported none invoked | must not fire | **pass** |
| `qa-fail`: dashboard shows undefined before load | yes | yes | must fire | **pass** |
| `agent-found`: "the tests you wrote pass but it's broken in the browser" | yes | yes | must fire | **pass** |
| `backlog`: "what are the last three months of QA findings telling us?" | yes | yes, aggregate mode | must fire | **pass** |

`qa-fail` named the gate as the spec and design layer and placed it in bucket 1,
and did not stop at the fix. `agent-found` asked an intake question rather than
treating it as a missing test case. `backlog` read `backlog-read.md` and
`history-sources.md` and went to the actual history rather than assuming a tracker
it could not read.

**Three caveats, and they matter more than the table.**

The run measured the *installed* copy, which is the plugin cache at 1.0.0, not the
1.1.0 working tree. Sessions load the cache, so nothing on a machine can exercise
a release candidate before it is installed. `qa-fail` reported back a reference
list of seven files, which is how this was noticed. The result is still valid for
what these cases measure, since the frontmatter was byte identical between the two
when this ran, and triggering is the only property they test. That last clause
expired within the hour: run 5 changed the description, so this run measures a
trigger surface the release no longer ships.

The subagents ran inside another repo's working directory, so that repo's
`CLAUDE.md` was loaded and `qa-fail` cited decisions belonging to it. That is not
a neutral environment, and it makes these weaker evidence than a run in an empty
directory would be.

`agent-found` is specified to read `references/agent-and-context.md`. It was asked
which skills it invoked but not which references, so that half of the case is
unverified rather than passed.

## Run 3, 2026-08-31, Sonnet

Run 2's four cases plus `agent-found` from `README.md`, dispatched as fresh
subagents on **Sonnet** with the registry confirmed first by a separate agent that
ran no case.

| Case | Registry confirmed | Fired | Expected | Result |
|---|---|---|---|---|
| `negative`: "Add a dark mode toggle to the settings page" | yes | no | must not fire | **pass** |
| `qa-fail`: control, plain QA fail | yes | yes | must fire | **pass** |
| works-as-specified: a filter built to spec, wrong for free-tier accounts | yes | yes | must fire | **pass** |
| `agent-found`: "the tests you wrote pass but it's broken in the browser" | yes | yes | must fire | **pass** |
| `backlog`: aggregate read over 149 closed items | yes | yes | must fire | **pass** |

**5/5, and none of it inferred.** Each case reported the skill it invoked after
answering, so every row is a direct report rather than a reading of vocabulary.
That closes run 2's D4 asterisk for this model.

Beyond firing. `qa-fail` named a gate, named a bucket, swept sideways and asked
whether the shape had recurred. works-as-specified put the miss in the spec rather
than in QA, and refused to claim a sweep it could not run, calling that "a real
limitation on this analysis, not a clean bill of health." `agent-found` hit its
stated pass condition, treating the green suite as consistency rather than
correctness instead of as a missing test case. `backlog` read all 149 closed items
in a real tracker, found that roughly a third describe a gate that looked like it
was working and was not, connected that to a rule already amended six times,
concluded the rule itself was the finding, and then named its own fidelity limits
unprompted.

**Two caveats, both real.** These ran as subagents, whose context differs from a
top-level session, so this is not the same test as a person typing into a fresh
Sonnet window. And asking each case to log the skill it used is itself a mild nudge
toward invoking one: that makes the negative pass conservative and puts a small
asterisk on the four positives. A manual run per `README.md` would settle both.

## Run 2, 2026-08-31, after the description was widened

Description widened, after run 1, to cover works-as-specified issues ("it works as
built but it shouldn't be there") and process retrospectives, after run 1 missed
D3 and D4.

| Case | Registry confirmed | Fired | Expected | Result |
|---|---|---|---|---|
| T4: "Add a dark mode toggle to the settings page" | yes | no | must not fire | **pass** |
| D3: works-as-specified QA fail | yes | yes | must fire | **pass** |
| D4: aggregate read, staging Jul 1–Aug 28 | yes | yes (inferred) | must fire | **pass** |
| T1: control, plain QA fail | yes | yes | must fire | **pass** |

**4/4.** The widening fixed the D3/D4 under-trigger without causing an
over-trigger on T4. Success criterion 2 is met for Opus 5.

D4's invocation was not visible in the transcript the way the others' were; it is
inferred from vocabulary only it uses ("bucket-3", "the evidence table"). Treat as
pass-with-an-asterisk until someone sees the invocation directly.

### What the cases produced beyond firing

- **D3** beat its own rubric. The rubric said bucket *missing*: the rule was
  never stated. The run found it *was* stated, three times, and that the ticket's
  `## Decision` still asserted the superseded requirement above the amendment
  retracting it: bucket **unread**. It also routed the *duplicate* verdict
  correctly ("your last durable change didn't work") and declined to write code.
- **D4** caught a defect in the prompt itself, where the window conflated a date
  range with a branch state. It flagged that and made the discrepancy a finding.
  Every count it gave was verified against the repo. It executed step 5's hardest
  row: found a rule that already existed, ran that rule's own check, found it
  clean, and concluded the rule was structurally ignorable rather than restating
  it.
- **T1 refused a fabricated premise.** The prompt was synthetic and collided with
  a real, unrelated ticket. Rather than analyse a bug that does not exist, it
  checked, found the mismatch, and stopped. That is the analysis equivalent of
  the invented-count hard fail, and it did not take it.

### Cross-checks that held

The `display_name` write-with-no-reader found by T1 and the "ARCHITECTURE §3 is
scoped too narrowly" conclusion reached by D4 are the same structural finding from
two sessions with no shared source. That is what corroboration looks like, and it
is worth contrasting with run 1's seven-ticket theme, where a second agent citing
the first agent's unmerged file only made one claim look like two.

Model: **Opus 5**. Results below hold for Opus 5 only; a smaller or newer model
needs its own run, because the trigger decision is the model's judgment about the
description, not a rule the harness applies.

**T4 is the load-bearing one.** Widening a trigger surface to fix an under-trigger
is the change most likely to cause an over-trigger, and T4 passed against the
*old* description, so it carried no information about the new one until now. The
prompt is also adversarial by construction: the widened description contains
"works as built but it shouldn't be there," and a dark-mode request surfaced a
conflict with a settled design doc, a near-miss framing that could plausibly have
pulled the skill in. It stayed out.

One prompt is not proof the widening is safe in general.

## Run 1, 2026-08-31, before the widening

T1, T2, T3 fired; T4 correctly did not; D1 and D2 fired and produced gate, bucket,
sweep and a correctly-sized change; **D3 and D4 did not fire**. Those two misses
are what that widening addresses.

D4's theme in run 1 was sourced from an unmerged worktree branch. See
`SKILL.md` step 4, "Unmerged work is not history," which that run produced.

## Run 7, 2026-09-02, Opus, four runs on the date-validity fixture

First run of any kind against an outcome rather than a trigger, and the first with
two runs per arm. Candidate is the working tree, baseline is the installed 1.1.0.
Scored by `evals/score.mjs`, twelve mechanical signals, no prose read.

| Signal | cand-1 | cand-2 | base-1 | base-2 |
|---|---|---|---|---|
| references opened | 3 | 2 | 0 | 0 |
| mechanism rank cited | no | yes (3, 2, 10) | no | no |
| all three prior incidents cited | yes | yes | yes | yes |
| symptom fixed | yes | yes | yes | yes |
| suite green | yes | yes | yes | yes |
| round-trip fix | no | yes | no | no |

**The reference read replicated and nothing else did.** Both candidate runs opened
references, both baseline runs opened none. That is the mechanism where step 6
requires a number the reference alone defines, so the entry cannot be completed
without opening it.

**Everything else is a null result.** All four arms found the theme, fixed the
symptom and kept the suite green. On outcome the arms are indistinguishable, so
the class-minting block added to step 4 the same day is unmeasured, and the stock
skill reaches the theme on this fixture without it.

**The rank fires unreliably.** One candidate run in two produced a number. The
read is caused; the number is not.

**Two corrections.** The answer key claimed only a round-trip check both fixes the
symptom and keeps the suite green. Three arms fixed it without one. And within the
candidate arm two runs disagreed on two of twelve signals, so every single-run
comparison recorded earlier that day was not evidence.

## Run 8, 2026-09-03, Opus, the ledger gate driven through Claude Code

First run against a hook rather than the skill text. `evals/drive-ledger-gate.sh`,
four `claude -p` arms in a two-entry fixture repo, each asked to add a
2026-09-03 entry to `docs/LESSONS.md` with Write or Edit, once bare and once with
the step 6 block. Verdicts read from `permission_denials` in the result JSON and
from the file on disk, not from prose.

| Arm | Original wiring (`Write\|Edit(...)`, one handler) | Shipped wiring (two handlers) |
|---|---|---|
| write-bare | landed, no denial | **denied**, nothing landed |
| write-good | landed | landed |
| edit-bare | landed, no denial | **denied**, nothing landed |
| edit-good | landed | landed |

**The original wiring never fired.** A fresh-context critic found it first, in a
four-arm drive of its own on the same day; this run reproduces it with the
script that now ships. The `if` field holds one permission rule, and
`Write|Edit(**/LESSONS.md)` is skipped without a message. Unit tests and
`check.sh` were green throughout, which is the 2026-09-01 entry's class applied
to this repo's own hook.

**The drive script's first version also read the wrong signal.** It grepped the
result JSON for the deny reason, which is shown to the model and not written to
the result, so a working gate scored as two failed arms. Fixed to read
`permission_denials`. One run per arm; the deny and land outcomes are categorical
enough that a second run would add little, but that is a judgment and not a
measurement.

## Run 9, 2026-09-09, Opus, the theme block driven through Claude Code

`evals/drive-ledger-gate.sh` gains two Write arms for the theme block, whose gate
path shares no field with the incident block. Six arms, one `claude -p` each, in
a two-entry fixture repo. Verdicts read from `permission_denials` and from the
file on disk, as in run 8.

| Arm | Result |
|---|---|
| write-bare | denied, nothing landed |
| write-good | landed |
| edit-bare | denied, nothing landed |
| edit-good | landed |
| theme-bare | denied, nothing landed |
| theme-good | landed, all six block fields present |

**The theme arms needed a repo shaped like reality.** `mkrepo` committed the log
and the source in one commit, so nothing had changed since the log was last
committed, the touched-file set was legitimately empty, and no path referent
could resolve. That is the gate working and it is not a shape an author is ever
in: the fix lands, then the entry gets written. `mkrepo` gained a `with-fix`
mode that commits a change after the scaffold. The four pre-existing arms pass no
`prep` and are unaffected.

**The first `theme-bare` could not fail differently, and is the more useful
finding.** It named a theme and stopped, so it was refused whether dispatch
worked or was inverted, and the arm was green either way. That is this repo's own
"a check answering a cheaper question than its rule". It is now complete under
the incident block plus a `Theme:` line, which is the exact shape a review found
the gate allowing: an entry carrying both fields took the theme path and skipped
every incident rule, landing `Level: banana` and `Instance: 42` green. Under the
shipped gate that entry is refused `deny_two_blocks`; under the dispatch this arm
now exists to catch, it landed.

Both `theme-*` fixtures were dry-run through `decide()` before the drive, read
out of the script itself rather than retyped. That found two real defects at no
cost: the referent check going blind when handed no log path, and the fixture
shape above. One run per arm, on the same reasoning as run 8.

## Run 10, 2026-09-11, Opus, the theme block and the block-less baseline on convention-spread

Two arms, two runs each, on the convention-spread fixture. Candidate is the
installed 1.2.2. Baseline is the 1.1.0 copy out of
`~/.claude/plugins/cache`, dropped into each baseline clone's `.claude/skills/`,
with the installed plugin disabled for those two runs so only one copy could
fire. The plan wrote this arm as "candidate versus installed", which stopped
meaning anything once steps 1 to 4 shipped: the candidate is the installed copy
now, and the baseline had to be fetched out of the cache to keep the comparison
the plan described, a baseline that writes no block.

Scored by `evals/score.mjs` against
`evals/fixtures/convention-spread/ANSWER-KEY.md`. The scorer was run first on
three hand-written entries and reproduced every value the plan predicted: one
same-theme date scores 0.33 with `instance_correct` false, all three score 1.0
and true, and a block-less entry naming all three in prose scores 1.0 with
`block_present` false.

| Signal | cand-1 | cand-2 | base-1 | base-2 |
|---|---|---|---|---|
| fired | installed | installed | candidate | candidate |
| wrote a new entry | yes | **no** | yes | yes |
| read the log first | yes | yes | yes | yes |
| `Instance:` | 4 | void | none | none |
| `Level:` | contract | void | none | none |
| `Bucket:` | none | void | none | none |
| same-theme recall | 1.0 | void | 1.0 | 0 |
| `Landed:` ranks | 3, 3, 6 | void | none | none |
| created the expected referent | no | void | no | no |
| suite green | yes | yes | yes | yes |

**One candidate run wrote no entry at all.** cand-2 fired the skill, completed,
and left `docs/LESSONS.md` untouched. Every other signal for that arm is about
the fixture's own newest entry, which is what the scorer read in its place, so
the column is void rather than null. `entry_is_new` is the only reason this is
visible: it was added the day before, after a referent signal was found reading
a file that ships in the bundle. Without it this run would have recorded cand-2
as a block-carrying entry with 0.33 recall, and the whole column would have been
fiction.

**The block replicated once out of two, and that is the headline.** cand-1 wrote
the full block and got the instance arithmetic right. cand-2 wrote nothing. On
one run out of two the candidate produced no record at all, which is worse than
the baseline, which wrote an entry both times.

**`block_present` does not measure what its name says.** Both baseline arms score
true on it. The fixture's own four entries each carry a `Class:` line, so an arm
copying the house style writes one whatever skill it loaded, and the signal is
really "a `Class:` or `Theme:` line exists". It answers a cheaper question than
its name asks, which is the theme of the 2026-09-11 log entry, in the scorer
written to measure that entry's own release.

**Recall did not separate the arms.** base-1 reached all three priors without a
block, cand-1 reached all three with one, and base-2 reached none. Two of three
usable runs found the theme, one from each arm, which is the same null result run
7 reported on the other fixture.

**Nothing created `src/queue/lookup.js`.** No arm landed the convention-level fix
the answer key describes; every arm that wrote code guarded in place. On the
outcome the answer key actually grades, all three usable runs are partial credit.

**cand-1 wrote `Bucket: none` where the key says `unread`.** Worth watching
rather than concluding from one run: the 3a paragraph teaching `none` shipped the
day before, and a value that was previously unreachable is now reachable and was
reached on its first outing.

## Run 11, 2026-09-11, Opus, the periodic read on the backlog-read fixture

First run against the skill's stated goal, a process finding read off a
tracker export rather than a code fix read off a bug. Five arms, one `claude
-p` each in a fresh clone of `evals/fixtures/backlog-read/backlog-read.bundle`,
prompt verbatim from the fixture README. cand-1 and cand-2 with the installed
1.3.1. base-1 and base-2 with the plugin disabled and the 1.1.0 copy from the
cache in the clone's `.claude/skills`, run 10's baseline, which carries the
whole procedure minus the block. base-0 with nothing loaded at all, the arm the
plan's §6 asked for and the base arms could not answer. base-2's first attempt
hit the session rate limit (429) at turn 12, wrote nothing, and was rerun.

Two procedural differences from run 10, both recorded rather than hidden.
`--allowedTools` was widened to Bash, Read, Write, Edit, Grep, Glob, Task and
Skill, because run 10's arms were refused reading the skill's own references
from the cache path under a bare `acceptEdits`. And the model was
`claude-opus-5` rather than `claude-opus-5[1m]`.

Scored by `evals/score.mjs` against `ANSWER-KEY.md` with `kind: theme`, against
`PREREGISTRATION.md`, which froze at cand-1's start. Prose-derived signals are
reported, not scored; the two hand-graded columns are mine (the agent running
the session, initials AG), read under the answer key's rule, and the user did
not grade.

| Signal | cand-1 | cand-2 | base-1 | base-2 | base-0 |
|---|---|---|---|---|---|
| fired | installed | installed | candidate (1.1.0) | candidate (1.1.0) | none |
| completed | yes | yes | yes | yes (rerun) | yes |
| wrote an entry | yes | yes | yes | yes | **no** |
| references opened | 3 | 4 | 1 | 1 | 0 |
| `block_kind` | theme | theme | none | none | none |
| `Window:` ran, count | yes, 12 | yes, 12 | none | none | none |
| `Bucket:` (block) | unread | unread | none | none | none |
| member recall (block) | 1.0 | 1.0 | n/a | n/a | n/a |
| decoys misfiled (block) | 0 | 0 | n/a | n/a | n/a |
| `Landed:` mechanisms | 1, 2, 5, 6 | 5, 3 | none | none | none |
| expected referents touched | both | dod only | both | both | none |
| critic | ran | ran | none | none | none |
| hand-graded `bucket_named` (AG) | n/a, block | n/a, block | unread | unread | unread |
| hand-graded `members_named` (AG) | n/a, block | n/a, block | 6 | 6 | 6 |
| reported `bucket_in_prose` | unrecorded | missing | missing | missing | none |

**Every arm that finished found the finding.** Both skill arms wrote the theme
block with `unread`, six of six members, no decoy claimed, the `Window:`
executed at twelve. base-1, with no block to write, stated the same six and the
same cause in prose, "requirements sitting one field away from where we
build". base-0, with nothing loaded, said "6 of 12, the requirement was already
written on the ticket by the right person before work started", named the six
in a table, and picked a ready-to-start gate as the one change, in eight turns
and ninety seconds. The pre-registered contingency held: a competent reader of
twelve tickets finds this without help. The confessing reopen comments are why,
and the dates-only variant is the next fixture.

**So what the skill adds on this fixture is the artifact and the landed
change, not the diagnosis.** base-0 left nothing on disk. base-1 left a prose
entry and edited both docs. The skill arms left a gate-checked entry whose
members are bound to a retrieval, and landed changes with referents: cand-1 a
runnable check with a red-and-green fixture (mechanisms 1 and 2) plus both
docs, cand-2 a written check and one doc (3 and 5). That is where the arms
differ, and it is the axis the answer key grades as the fix.

**The prose leads say the wrong bucket on four of four correct entries.**
`reported.bucket_in_prose` read `unrecorded`, `missing`, `missing` and
`missing` on entries whose block or heading says unread, one of which names
"bucket 2" in so many words. This is the reader's B2 on live
arms, and the reason those signals are reported and not scored.

**`expected_level` is not measurable on a theme fixture.** The theme block has
no `Level:` line, so both skill arms score `level: null`. The key's
`expected_level: process` was carried over from the incident shape and should
be dropped from the theme key.

**The fixture has a defect the arms found and I did not.** INV-111's close
comment says the rounding rule ("per line, then summed") was written into
`docs/conventions.md`; the shipped `conventions.md` says the opposite. base-1
flagged it as unresolved. Fixed after this run, so every arm here saw the same
bundle; the next run sees the corrected one.

**One arm in five was void the first time, for a harness reason.** base-2's
first attempt was a 429, not a skill behaviour; the rerun completed and is the
column above. Run 10's cand-2 wrote no entry and completed; that shape did not
recur here. base-2's entry also names the two escapes and the reopen shape of
the decoys, and, like base-1, lands a ready gate in both docs; it added a
`tools/` directory the block does not reference, which a block would have had
to account for.

