# Intake, when the issue arrives from someone else

Companion to `SKILL.md`. Read this when the issue came from a person (a QA
tester, a teammate, or a user) rather than from your own run.

A reporter is an instrument we cannot re-run, so we get it right the first time.

**Extract in one message.** What they did, what they saw, what they expected
instead, when, and on what, so device, browser, version, screen size, network. For
a UX or UI issue also get the screenshot and the state they were in, since "it
looked broken" is not reproducible and the reporter usually cannot tell which
detail mattered. Ask for all of it at once, because someone who did you the favor
of reporting should not be drip-fed questions.

**The reporter's framing is a hypothesis rather than a diagnosis.** They describe
the surface where they noticed it. Confirm the mechanism yourself before accepting
their causal story, and before fixing only where they happened to be looking.

**Copy the mechanism, never the payload.** Reports arrive carrying things a repo
is not allowed to hold: real names, real customer or health data, tokens,
full-screen captures. Reproduce the shape with synthetic values, and let only the
shape reach the ticket, the fixture, and the incident log. In a repo with a data
gate, run it before any of that is committed.

**Classify before fixing.** Four verdicts, and all four still owe you step 3:

| Verdict | Where the escape lives |
|---|---|
| Defect | The usual gates. |
| Works as specified, and the spec was wrong | The plan gate. The spec is the bug. |
| "Environment" or "user error" | A design or docs gap. "User error" is a finding about the interface, not a dismissal. |
| Duplicate of something already logged | The last durable change did not work. Fix the check rather than the instance. |

**"Cannot reproduce" is a finding, not a close.** It means the state that produces
it (a device, a data history, an upgrade path, a race, a screen size) is not in
the test surface at all. Record that and widen the surface. Closing it
unreproduced only schedules the second report.

**Record time-to-detect.** How long was it live before anyone said anything? That
number is the whole argument for the detection change in step 5.
