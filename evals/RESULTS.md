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
