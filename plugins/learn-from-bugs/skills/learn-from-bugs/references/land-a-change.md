# The menu, one mechanism per kind of gap

Companion to `SKILL.md` step 5, for the targeted end of its table. Ranked, so
take the first thing on this list that fits the gap:

- a runnable check wired into CI, which we prefer to everything below it
- a test at the boundary the class lives on, or a visual or interaction regression
  test where a unit test cannot reach
- a written-down rule where your project keeps rules, when no check is possible
- a question added to the ticket or plan template, when the gap was an unasked
  question ("which states does this have?", "what happens when it is empty?").
  This is the highest-leverage fix for the 3b classes
- a change to what "done" means, or to who reviews what, when the gap was a
  handoff or an unowned surface
- a relocation, so the requirement moved out of a comment and into the
  description, or the constraint moved out of a chat thread and into the file it
  governs, when the information existed and did not reach the reader
- a capture point (a decision log, a required "why not the obvious approach" line
  in the ticket, a comment at the constraint site, a `CLAUDE.md` entry) when the
  information was understood at the time and gone when it was needed. Judge it by
  whether someone who does not know it exists could find it
- a readback step, where whoever will build it restates the requirement in their
  own words or writes one acceptance criterion as a concrete scenario with values,
  and the author confirms, when two people were confidently misaligned
- a line where the agent will read it (`CLAUDE.md`, a skill, an agent instruction,
  or a hook that blocks it mechanically) when the gap was a convention that
  existed only in someone's head
- a signal (an assertion that throws, a log line, an alert) when the gap was that
  nothing would have told you. For anything a user reported, ship this as well as
  the prevention, since prevention and detection fail independently.

Whatever you pick from the top three, read `checks-that-cannot-fail.md` in the
same sitting, since a check nobody has observed failing is not yet a gate.
