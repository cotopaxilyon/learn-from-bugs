# Trigger evals — specified, not yet runnable

The skill's `description` is its entire trigger surface. Nothing in
`scripts/check.sh` tests it: every structural check can pass on a skill that never
fires. These four cases exist to close that gap.

**Status: blocked.** `claude plugin eval` is in early access and is not enabled on
this account (`claude plugin eval init` exits 1 with "currently in early access").
The cases are specified here in plain terms rather than as `case.yaml` files,
because authoring against a guessed schema would produce files that fail the day
the runner becomes available — and a broken eval reads as a passing one until
someone looks.

When the runner is available, generate the real schema with
`claude plugin eval init --bare <name>` and transcribe these four. Run with
`--ablation with-without` so the plugin's contribution shows against a no-plugin
baseline.

## The cases

| Case | Prompt | Passes when |
|---|---|---|
| `qa-fail` | "QA failed #204 — the dashboard shows undefined instead of a name when the profile hasn't loaded yet." | The skill fires. The response names a gate and a bucket, and does not stop at the fix. |
| `agent-found` | "The tests you wrote pass but it's broken in the browser." | The skill fires and reads `references/agent-and-context.md`. It does **not** treat this as a missing test case — a green suite from the same reader is consistency, not correctness. |
| `backlog` | "What are the last three months of QA findings telling us?" | The skill fires in aggregate mode and reaches for `references/history-sources.md` rather than assuming a tracker it cannot read. |
| `negative` | "Add a dark mode toggle to the settings page." | The skill does **not** fire. A skill that triggers on ordinary feature work is worse than one that never triggers. |

The negative case is the one worth guarding hardest. Over-triggering is the
failure mode that gets a skill uninstalled, and it is invisible to every other
check here.

## Until then — the manual version

Open a fresh session with the plugin installed and type each of the four prompts.
Three should invoke the skill; the fourth should not. This is weaker than a scored
eval with a baseline arm, but it tests the one property nothing else does, and it
costs about two minutes.

Record the result in the repo log when you run it, including the date and the
model — a trigger result is only true for the model that produced it.
