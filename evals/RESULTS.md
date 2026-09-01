# Trigger test results

Recorded per `README.md`: a trigger result is only true for the model that
produced it, and only if the skill was actually in that session's registry.

**The registry precondition is not optional.** A session started before the skill
directory existed inherits a registry without it, and every case then returns a
false negative — including the negative case, which reads as a *pass*. Three runs
were voided this way on 2026-08-31 before the inventory check was added.

## Run 2 — 2026-08-31, after the description was widened

Description widened in `d5770dd` to cover works-as-specified issues ("it works as
built but it shouldn't be there") and process retrospectives, after run 1 missed
D3 and D4.

| Case | Registry confirmed | Fired | Expected | Result |
|---|---|---|---|---|
| T4 — "Add a dark mode toggle to the settings page" | yes | no | must not fire | **pass** |
| D3 — works-as-specified QA fail | yes | yes | must fire | **pass** |
| D4 — aggregate read, staging Jul 1–Aug 28 | yes | yes (inferred) | must fire | **pass** |
| T1 — control, plain QA fail | yes | yes | must fire | **pass** |

**4/4.** The widening fixed the D3/D4 under-trigger without causing an
over-trigger on T4. Success criterion 2 is met for Opus 5.

D4's invocation was not visible in the transcript the way the others' were; it is
inferred from vocabulary only it uses ("bucket-3", "the evidence table"). Treat as
pass-with-an-asterisk until someone sees the invocation directly.

### What the cases produced beyond firing

- **D3** beat its own rubric. The rubric said bucket *missing* — the rule was
  never stated. The run found it *was* stated, three times, and that the ticket's
  `## Decision` still asserted the superseded requirement above the amendment
  retracting it: bucket **unread**. It also routed the *duplicate* verdict
  correctly ("your last durable change didn't work") and declined to write code.
- **D4** caught a defect in the prompt itself — the window conflated a date range
  with a branch state — flagged it, and made the discrepancy a finding. Every
  count it gave was verified against the repo. It executed step 5's hardest row:
  found a rule that already existed, ran that rule's own check, found it clean,
  and concluded the rule was structurally ignorable rather than restating it.
- **T1 refused a fabricated premise.** The prompt was synthetic and collided with
  a real, unrelated ticket. Rather than analyse a bug that does not exist, it
  checked, found the mismatch, and stopped — the analysis equivalent of the
  invented-count hard fail, and it did not take it.

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
conflict with a settled design doc — a near-miss framing that could plausibly have
pulled the skill in. It stayed out.

One prompt is not proof the widening is safe in general.

## Run 1 — 2026-08-31, before the widening

T1, T2, T3 fired; T4 correctly did not; D1 and D2 fired and produced gate, bucket,
sweep and a correctly-sized change; **D3 and D4 did not fire**. Those two misses
are what `d5770dd` addresses.

D4's theme in run 1 was sourced from an unmerged worktree branch — see
`SKILL.md` step 4, "Unmerged work is not history," which that run produced.
