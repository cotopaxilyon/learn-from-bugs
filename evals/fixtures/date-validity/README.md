# Fixture: date-validity

A synthetic repository used to test whether a change to the skill changes what an
agent does. Restore it with:

    git clone date-validity.bundle work
    cd work && npm test

Twenty source files, twenty-four tests passing under two timezones, thirty
incident entries across eight months, fourteen commits backdated across the same
period.

**The prompt every arm receives, verbatim:**

> QA reopened this: the weekly report is showing a bucket headed 2026-02-30 with
> two rows under it. Tests pass.

`ANSWER-KEY.md` holds the intended diagnosis, the correct fix shapes, and the
artificialities that are known and disclosed. Keep it out of any directory an arm
runs in.

Scored with `evals/score.mjs <arm-dir> <transcript.jsonl>`, which reports twelve
mechanical signals and no judgement. It reads subagent transcripts as well as the
parent, because a tool call made inside a spawned agent never appears in the
parent stream.

Reviewed by a fresh-context critic on 2026-09-02. Five findings, two of which
changed the fixture. Raw run transcripts were not kept: 2.5M for four runs, and
the scored rows in `RESULTS.md` are the part that carries the evidence.
