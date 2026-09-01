# Trigger test results

Recorded per `README.md`: a trigger result is only true for the model that
produced it, and only if the skill was actually in that session's registry.

**The registry precondition is not optional.** A session started before the skill
directory existed inherits a registry without it, and every case then returns a
false negative, including the negative case, which reads as a *pass*. Three runs
were voided this way on 2026-08-31 before the inventory check was added.

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
