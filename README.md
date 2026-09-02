# learn-from-bugs

A Claude Code skill for the moment a bug comes back from testing.

It analyzes the process, using the bug as evidence. The fix is step 2 of 8.

The reflex is to fix a QA finding and move on. That fix is the cheap half. The
blind spot that produced it is still in place, and the bug you found is only the
instance that happened to be visible.

One bug rarely carries a diagnosis on its own, either. Nine accessibility bugs
across four features are not nine mistakes. They are one finding, which is that
accessibility never enters planning, and fixing them one at a time will not
change that. So the skill works the issue in front of you and reads it against
the issues that came before it.

## The eight steps

Before them there is intake: getting something reproducible out of a person,
without pulling their data into your repo along with it. "Cannot reproduce" and
"user error" are treated as findings about the test surface and the interface
rather than as ways to close a ticket.

1. **Capture, then reproduce.** Capture the evidence before the fix destroys it.
   Where a failing test is not possible, that is itself the finding: you have
   located a surface no gate can cover.
2. **Fix.** The part you were going to do anyway.
3. **Escape analysis.** Name the gate that should have caught it. First the
   artifact gates: spec, design, contract, tests, QA, detection. Then the
   information layer, the Lyon Product Quality Studio model, which asks whether
   the information was missing, unread, unrecorded, or misunderstood. Each has a
   different fix, and none of them is "read more carefully," since that is the
   thing that already failed.
4. **Sweep in two directions.** Sideways through the code for siblings of the
   same class, reporting what was searched even when nothing turns up. Backwards
   through the issue history for the theme this one belongs to.
5. **Land a change sized to the evidence.** A first-of-its-kind gets a test
   rather than a process. A third instance earns a check. A theme across features
   means the fix is not code at all: a missing phase, an unowned responsibility,
   a line in the definition of done. Whatever the change is, it gets run against
   the defect it exists to catch and watched failing, because a check nobody has
   seen go red is a hypothesis about a check.
6. **Record and tag.** What happened, why nothing caught it, the rule it
   produces. A pattern nobody labeled is one nobody will see.
7. **A short critic pass, in a fresh context.** Five questions, put to a subagent
   rather than answered by the author, since a reader holding the author's
   context is not a critic. They are answerable from the artifacts without
   re-deriving the analysis: which claim went unmeasured, which new check has
   never been watched failing, what is destructive and resting on an unchecked
   premise, whether the finding is already in the log, and which environment
   would hide the class.
8. **Re-verify.** Wherever the work actually gets exercised.

## Built for workflows where Claude runs the tests too

When the thing that wrote the code also wrote the tests, ran them, and fixed what
it found, three holes open up:

- **Same-turn fixes can leave no trace.** Found and fixed inside one turn, so
  unless something records it, your history is missing the fastest-moving
  category of problem and the themes look better than they are. The skill asks
  for a label even when there was no ticket.
- **The tester shares the author's misunderstanding.** A misread requirement
  produces a green suite, where the test asserts the wrong behavior confidently.
  So "the tests passed but it is broken" is its own gate, not a missing case.
- **The context window is a lossy medium.** A constraint honored early can
  compact away mid-task, with nothing raised when it goes. So the skill ranks
  fixes by how little they depend on context surviving: a hook or CI check, then
  a failing test, then a short re-read file, then a comment at the site it
  governs.

`references/agent-and-context.md` covers this in full, including what agent
testing structurally cannot see.

## It also runs over a whole backlog

Without a specific bug in hand:

> What are the last three months of QA findings telling us about how we work?

It tallies by theme rather than severity, notices which themes QA caught versus
which ones users found, flags categories that look clean only because nothing
exercises them, and picks one upstream change with the issue count as its
argument.

## Install

Two steps, one at a time. The second only works once the first has finished.
These are slash commands typed inside Claude Code, not shell commands.

```text
/plugin marketplace add cotopaxilyon/learn-from-bugs
```

```text
/plugin install learn-from-bugs@cotopaxilyon
```

Prefer the terminal? These are shell commands and are safe to copy together:

```bash
claude plugin marketplace add cotopaxilyon/learn-from-bugs
claude plugin install learn-from-bugs@cotopaxilyon
```

Restart Claude Code. The skill triggers on its own when you describe a bug, a QA
failure, or a regression, and you can invoke it directly with `/learn-from-bugs`.

## Use it

> QA failed #204, the dashboard shows "undefined" instead of a name when the
> profile has not loaded yet.

Or point it at a report:

> A user says the export button does nothing on their phone.

## Which issues get this

Every issue: bugs, UX problems, UI regressions, accessibility issues, confusing
copy, and anything else testing surfaces. The only exemption is a change with no
behavioral cause to explain, so a typo, a formatting change, or a rename.

A five-minute fix is often the best evidence of a theme, so cheap issues are in
scope too. The weight scales with the evidence: on a first-of-its-kind issue the
last three steps are three lines and a label.

## What it needs from your project

Nothing, to start. It names four artifacts (an incident log, mechanically-checked
invariants, written principles, and testing conventions) and expects you to
substitute whatever you already keep, so a postmortem folder, a CI config, a
CONTRIBUTING file, or a wiki. If you keep none of them, that is the finding, and
it starts the log with your current issue.

Day one gives you the gate, the bucket, the sideways sweep, and a first labeled
entry, because three sources of evidence exist before any tracker does: the issue
itself, your git history, and your Claude Code project's own configuration. What
day one does not give you is the theme. That needs several issues to compare, and
only arrives if you labelled the earlier ones.

## How it is structured

`SKILL.md` holds the eight steps and the information layer. The conditional
material sits in `references/` and loads only when it applies: `intake.md`,
`agent-and-context.md`, `classes.md`, `history-sources.md`, `backlog-read.md`,
`land-a-change.md`, `checks-that-cannot-fail.md`, `critic-pass.md`, `do-not.md`,
and `examples.md`, which runs five issues end to end so the output shape is
visible rather than described.

That split is the skill taking its own advice. A rule buried on page four of a
long file fails the same way a requirement buried in comment #14 does.

## License

MIT
