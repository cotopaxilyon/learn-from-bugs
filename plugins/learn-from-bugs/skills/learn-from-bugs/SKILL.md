---
name: learn-from-bugs
description: Turn a bug, UX problem, UI regression, or QA finding into a process fix, not just a code fix — and read it against earlier issues, because a recurring theme is a planning failure, not a bug. Applies whether the tester was a human, a QA team, or Claude itself running the tests. Use on "QA failed this", "a user reported", "found a bug while testing", "the tests passed but it's broken", "you missed this", "this looks wrong", "this regressed", "reopened", "cannot reproduce". **Also use it when the code is correct and the requirement or design was wrong** — "it works as built but it shouldn't be there", "this shipped to the wrong users", "working as specified and still wrong", "not a bug, but it's wrong" — that case is the one this skill is most useful for, because it usually had no gate at all. And use it in aggregate to read a backlog for themes: "what are our bugs telling us", "why do we keep shipping accessibility issues", "what do our closed issues say about how we work", "look at the last few months of issues and tell me what they say about us".
user-invocable: true
---
# learn-from-bugs

Every issue carries two findings: the thing that is wrong, and the reason the
process let it get this far. Fixing only the first leaves the second in place, so
the same blind spot returns next sprint wearing a different symptom.

We treat a bug as a sample rather than an event. Something about how the work got
done produced it, and that something is still there after the fix ships. The
instance in front of us is the cheapest evidence we will ever get about it,
because somebody already paid to find it.

One issue rarely carries a diagnosis on its own, though. A single bug tells us
what broke; it takes several to tell us what a team is systematically bad at.
Nine accessibility bugs across four features are not nine mistakes. They are one
finding, which is that accessibility never enters planning, and fixing them one at
a time will not change that. So this skill does two things at once. It works the
issue in front of us, and it reads that issue against the ones before it.
Diagnosing too hard off a single instance bolts on a rule that fits one bug;
ignoring the accumulation means fixing the same theme forever, one ticket at a
time.

Everything QA or testing surfaces is in scope, so logic bugs but equally UX
problems, UI regressions, confusing copy, and an empty state nobody designed. "It
works exactly as coded and it is wrong for the user" is the most valuable case
here, because it usually means the issue never had a gate at all and no amount of
test coverage would have moved it.

## Where it came from tells you how much escaped

| Found by | What that means |
|---|---|
| **You, testing your own work** | The cheapest case. The escape is upstream of you, in the spec, the design, or your own assumption. We still run the sweep, since the class may have shipped elsewhere already. |
| **QA** | The gate designed to catch it did catch it, which is good news. The escape is in the plan, the contract, or the tests, not in QA. |
| **An agent, testing its own work** | The fastest and the leakiest. It gets found and fixed inside one turn, which usually leaves no artifact at all (see below, because this is where the learning loop quietly stops working). |
| **A user, in the wild** | Every gate missed, including the last one, and nothing in the system noticed. The largest analysis, and step 3 gains a question the others do not have: why was a person the detector? |
| **Nobody, found in behavioral data** | The worst case and the easiest to miss, because a bug with no reporter leaves nothing to count. No gate caught it and no user complained; they hit it, gave up, and left. Visible only as rage clicks, drop-off, or a feature nobody uses (see `references/history-sources.md`). |

## Intake, when the issue arrives from someone else

A reporter is an instrument we cannot re-run, so we extract what they did, saw,
and expected, plus device, version, and a screenshot for anything visual, in one
message. We treat their framing as a hypothesis about where they noticed it
rather than as a diagnosis. We copy the mechanism and never the payload, since
reports arrive carrying names, customer data, and tokens a repo may not be
cleared to hold. "Cannot reproduce" is a finding, not a close.

Full procedure in `references/intake.md`, including the four triage verdicts, why
all four still owe you step 3, and why "user error" is a finding about the
interface.

## When the tester, or the author, is an agent

Increasingly the thing that wrote the code also wrote the tests, ran them, found
the bug, and fixed it before anyone looked. That puts three holes in everything
above:

1. **The fix can leave no trace.** Found and fixed inside one turn, so unless
   something records it, step 4 reads a history with the fastest-moving category
   of issue missing from it.
2. **The tester shares the author's misunderstanding.** Same reader, so a misread
   requirement produces a green suite. A suite that agrees with itself has shown
   consistency, which is a weaker claim than correctness.
3. **The context window is a lossy medium.** A constraint honored early can
   compact away mid-task, and the better it was followed the likelier it goes.

If an agent wrote, tested, or fixed any part of this, read
`references/agent-and-context.md` before continuing.

## Which issues get this

Every issue: bugs, UX problems, UI regressions, accessibility issues, confusing
copy, and anything else testing surfaces. The only exemption is a change with no
behavioral cause to explain, so a typo in a string, a formatting change, a rename.

A five-minute fix is often the best evidence of a theme, so cheap issues are in
scope too. The weight scales with the evidence: on a first-of-its-kind issue,
steps 4 to 6 are three lines and a label.

## 1. Capture, then reproduce

Capture the failure before touching code. The report, the repro steps, the
observed-versus-expected, the environment, all copied somewhere durable first.
Once the fix lands the evidence is gone, and steps 3 and 4 become guesswork about
a state nobody can observe any more.

Then reproduce, ideally as a failing test. When it cannot be one (a visual
regression, a layout that only breaks at a width, a flow that is wrong rather than
broken), stop and note why. That is not an inconvenience, it is the finding: you
have located a surface no gate can currently cover, and step 5 is about giving it
one.

## 2. Fix it

On a working branch rather than one other people are building on, if your project
draws that line. Red before, green after. This is the only step people reliably
complete, and it is not where the work ends.

## 3. Escape analysis, in two layers

### 3a. The artifact gates

Name the gate that should have caught it, and the structural reason it did not:

| Gate | The question |
|---|---|
| The plan or spec | Was this behavior specified at all? Was the acceptance criterion falsifiable, or phrased as an absence? Was this state (empty, error, loading, offline, long content, small screen) ever specified? |
| The design | Did a design exist for this case, or was it improvised during implementation? Was the built thing ever compared against it, and if the design file changed after the work started, does its version history show that? |
| The contract or invariant | Was there a rule that got silently bypassed, or was there no rule? |
| The tests | Did a test cover the write but not the round trip? Was the code structurally untestable? |
| QA | In scope and missed, or never in scope? Run against the deployed build or a local one? |
| The agent's own verification | If an agent wrote and ran the tests, did they encode the requirement or the implementation? A green suite from the same reader shows the two agree, which is not the same as either being right. |
| Detection | Did anything tell you (a log, a thrown error, a failed request, a metric), or did a human have to? How long was it live? |

### 3b. The information layer

When 3a comes back with "there was no gate for this," we go up a layer, and we ask
the question in a particular order, because it has four very different answers
with four very different fixes. Missing is only the first of the four. The other
three cover information that existed, was correct, and still did not work, because
it did not reach the reader, did not survive to the moment it was needed, or
arrived and meant something else.

#### Was it missing, unread, unrecorded, or misunderstood?

*These four buckets are the Lyon Product Quality Studio information model. We name
them so they can be cited and taught, and the order matters because the fixes
differ.*

**1. It never existed.** Nobody wrote it down.

- An assumption nobody stated, about a user, a device, a data shape, a volume, a
  network, or a locale. Reasonable, unstated, and therefore uncheckable.
- A state nobody specified: empty, error, offline, partial, very long, very old.
- A surface nobody owned (the mobile breakpoint, the 200-character name), so it
  belonged to no role and got review from none of them.
- A "done" that meant different things to product, design, engineering and QA, and
  the work passed each one's version.

*The fix is to make it exist somewhere it will be encountered, so a question in
the ticket template, a required section, or a checklist item tied to the work.*

**2. It existed and was not read.** The expensive one, and the one people are
reluctant to write down, so it goes unrecorded and recurs forever.

- The requirement was in comment #14 rather than the description, or in AC #9 of
  12, below where attention runs out.
- It was added or edited after the reader had already read it, and nothing
  announced the change.
- It lived in another system (a design file, a chat thread, an email, a linked doc
  nobody opened, an attachment). Design tools are worth checking directly, because
  the requirement is often in a frame comment and the file's version history will
  say whether it changed after the implementer read it. That is one of the few
  bucket-2 failures anyone can confirm mechanically rather than reconstruct.
- There was so much of it that the load-bearing sentence was indistinguishable
  from boilerplate.
- The reader took the top of the artifact as the whole of it. Everyone skims.
  Humans skim when the list is long, and agents skim by working from the context
  they were handed and never fetching the thread.

*The fix here is about routing and format rather than diligence, and that
distinction is the whole point, because the instinctive response is "read more
carefully," which is exactly the thing that already failed and will fail again.
Requirements get promoted out of comments and into the description. Edits after
work starts announce themselves. Long AC lists get restructured rather than
trusted. The constraint goes where the work happens, in the file, the test, the
`CLAUDE.md`, and not only where it was discussed.*

**"It was in the ticket" is not a defense. Availability is not delivery.** When
the truth of a requirement reliably lives where people reliably do not look, the
location is the defect.

**3. It was read, understood, and never written down.** It reached the right
person, they got it right, and it evaporated. By the time it mattered there was
nothing to refer back to.

- A decision made in a call or a meeting. Everyone understood it, everyone agreed,
  nobody put it in the ticket. Three weeks later there is no record of why the
  obvious approach was rejected, so somebody rediscovers it the expensive way.
- A clarification given as a reply in a thread, correct, absorbed, scrolled away.
- A "we tried that, it does not work" said out loud once, to two of the five people
  who eventually touch the code.
- Work long enough that the person implementing it in week six is working from a
  memory of week one, including when that person is the same person.
- For an agent, the context window. The constraint was understood perfectly, acted
  on correctly, and lived only in the conversation, and then the session ended or
  the context compacted and it was gone mid-task with nothing raised. Anything not
  written to a file did not happen. See `references/agent-and-context.md`, since
  this one has failure modes that do not map onto human memory.

*The tell is that the same question gets re-answered, and eventually re-answered
differently. Catching yourself re-deciding something, or finding two parts of a
codebase that resolved the same question in opposite directions, points at this
bucket rather than at carelessness.*

*The fix is to capture at the moment of understanding, in the place the work will
look, rather than in the place the conversation happened. The decision goes into
the ticket description, a decision log, a comment at the constraint site, a test
that encodes it, or the `CLAUDE.md` the next session loads. The bar is not
"recorded somewhere," it is retrievable by someone who does not know it exists.*

**4. It was read and understood differently.** Nobody was wrong at any point.

- The same word meant two things. "Archive," "user," "active," "done": product
  meant one, engineering built the other, and both were being precise.
- An example was taken as the specification, or the specification as an example.
- An "obviously" that was not obvious to someone with different context.
- Assumed alignment that nobody tested. The most expensive variety, because
  nothing feels wrong until QA. Two people had a conversation, both left
  confident, and no step in the process ever checked whether their two
  understandings matched.

*The fix is that alignment has to be tested rather than felt. Restate the
requirement in your own words back to whoever wrote it before building. Write one
acceptance criterion as a concrete scenario with real values and have them
confirm it. A five-minute readback is the cheapest gate in this document, and it
is the one most reliably skipped, because everyone already feels aligned.*

#### Then hold it loosely

These are candidates rather than verdicts. One issue usually cannot distinguish
"nobody wrote it down" from "it was written where nobody looks," which is exactly
what step 4's history read is for. Three issues where the requirement was sitting
in a comment are not three careless readers, they are a ticket format that hides
requirements.

"We forgot," "human error," and "they should have read it" are not answers, they
are the absence of one. The last is worse than useless, because it names the
failure as a character flaw in the one person closest to the work, which
guarantees the next person hides theirs. Every one of them rewrites into a
structural sentence: nothing made the important line stand out, nothing made
forgetting visible, nothing tested whether the two readings matched, nothing
failed loudly when the wrong thing happened. Keep asking until you have that
sentence, because blame stops the analysis one step before it becomes useful.

## 4. Name the class, then sweep the code and the history

This is the load-bearing step and the one that gets skipped. What you found is one
instance of a class. State the class with every specific removed, then go looking
for the others before concluding there are none, in two directions.

Check whether the class is one of these, or add your own. The four families in
brief, with the full catalog in `references/classes.md`:

- **Technical.** Silent failures, environment-specific behavior, boundary values,
  writes with no reader, state that outlives a session.
- **Experience.** A state nobody designed, content that outgrew its container,
  interactions assuming a mouse or a fast network.
- **Agent-authored.** A test encoding the implementation, an unwritten convention,
  an ambiguity resolved silently, a constraint lost to compaction.
- **Process.** Requirements that live in comments, tickets edited mid-flight, a
  term meaning two things, decisions that exist only in a conversation.

Name it with the same words used last time, since an inconsistently labelled class
is invisible to the sweep below.

### Sweep sideways, through the code, right now

A grep, a pass over sibling call sites, a look at the other screens with the same
state, a reread of the tickets written the same week. Report the result even when
it is zero, so how many places you looked and how many you found. "I did not find
others" carries weight only when it names the search. Fix trivial siblings in the
same change and ticket the rest, rather than leaving them silently known.

### Sweep backwards, through the issue history

*This is the half that turns bugs into a story.* Gather the last few months of
closed issues (`references/history-sources.md` has the retrieval move for each
place they might live, including issues that only ever existed in a Claude Code
conversation), then ask what theme this one belongs to rather than only what class:

- How many issues in this window share a theme with this one, whether that is
  accessibility, empty states, timezone handling, mobile layout, error messaging,
  or permissions?
- Is the theme growing, flat, or already fixed once and returning?
- Do they cluster in one area of the product, one part of the stack, or one point
  in the calendar (crunch weeks, post-refactor, after a handoff between people)?
- Was a rule already written for this theme? Then the rule is not working, and
  that is the finding rather than the bug.

The frequency changes the diagnosis and not only its urgency. One accessibility
bug is a missing `aria-label`. Nine of them across four features is a planning
failure, where accessibility is not in the design phase, not in the acceptance
criteria, and not anyone's job. The first has a fix. The second needs a phase, a
checklist, a role, or a budget, none of which look much like a fix.

When the history is not labeled well enough to answer these questions, say so and
fix that in step 5. We cannot see a pattern we never tagged.

Unmerged work does not count as history. Sweep the branch that ships, not
worktrees, not unmerged branches, not uncommitted files. Anything unmerged is a
proposal, so somebody's conclusion that nobody has reviewed. Read it as evidence
and one unreviewed claim becomes your premise, and the theme you report inherits
its confidence from nothing. This bites hardest when an agent wrote it, because
the artifact looks exactly like a reviewed one (same format, same file, same
conviction) and citing it back reads as corroboration when it is the same claim
twice. Check that what you are reading is on the mainline before counting it.

### On day one, when there is no history yet

Three sources exist before a single label does: the issue itself, the codebase and
its git history, and the project's own Claude Code configuration, because when an
agent wrote the code the instructions it worked from are on disk and are
themselves evidence. Day one yields the gate, the bucket, the sideways sweep, and
a first labeled entry. It does not yet yield the theme, so say that.

See `references/history-sources.md` for day-one sources and the retrieval move for
every other place a history might live.

## 5. Land a change that matches the evidence

Not finished until something is different next time, and the size of the change is
set by the history rather than by how annoying the bug was. Over-fitting a process
change to a single instance produces a rule with nothing to point at when somebody
asks why it exists; under-reacting to a nine-instance theme means fixing the same
thing forever.

| What the history shows | What to land |
|---|---|
| **First of its kind** | A targeted fix: a test at the boundary, a check, a note in the log. Do not invent a process for one data point. Record the class so the second instance is recognizable. |
| **Second or third** | Now it is a class. A runnable check, a template question, or a rule where your project keeps rules. |
| **A theme across features** | Stop patching. The finding is upstream: a missing phase (design, accessibility, threat modeling), an unowned responsibility, a skill gap, or a definition of done that never mentions it. Propose the investment, with the issue count as the argument. |
| **A theme you already wrote a rule for** | The rule is not working. Ask why it is ignorable (unenforced, unknown, or too expensive to follow) and fix that instead of restating it louder. |

For the targeted end of that table, the menu:

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

When a check was possible and you wrote a guideline instead, you have shipped
folklore. Say why the check was not possible, or write the check.

At the theme end of the table, the changes that actually move a theme are rarely
code: a step added to the design phase, a specialist review on a category of work,
an audit run once against the whole surface instead of per-ticket, a line in the
definition of done, or simply time budgeted for something that has only ever been
done in the gaps.

## 6. Record it

Append to your incident log as `## YYYY-MM-DD — Consequence`, so what happened,
then why nothing caught it, then the rule it produces, with the issue ID, the
class from step 4, and the sweep result. Not a sequence number, because `## 2.`
assumes one writer appending in turn, and parallel agents each append a different
one at the same line, in different branches, none aware of the others.

The middle part is the one that gets skipped and the only one that generalizes,
since it tells a future project which class of check it is missing even when this
exact bug cannot happen there. Title the entry with the consequence rather than
the cause ("A missing empty state made the dashboard look broken on day one" beats
"Empty state not handled"), because people scan the log for a symptom they are
seeing.

Tag the issue with its theme before closing it. This is the cheapest step here and
the one that makes every future analysis possible, since a theme nobody labeled is
a pattern nobody will see, and step 4's backward sweep is only as good as the
labels the last six months left behind. One consistent label per issue (`a11y`,
`empty-state`, `timezone`, `spec-ambiguity`) beats an elaborate taxonomy nobody
applies.

If your project has no incident log, that is the step-5 finding. Start it with
this issue.

`references/examples.md` runs five issues end to end in this format, including
what a first-of-its-kind writes versus what a theme writes.

## 7. Then re-verify

Re-verify wherever the work actually gets exercised, so against the deployed build
if your project deploys before anyone signs off, and against whatever stands in
for that if it does not. The comment that goes back carries all five parts: the
fix, the gate, the assumption, the sweep, and the change.

## Before you close it

`references/do-not.md` is the compressed form of everything above, so the ways
this analysis gets quietly skipped, from closing with only the fix, to accepting
"human error" as a cause, to letting a same-turn fix vanish without a label. Read
it before calling the issue done.

## The periodic read, running this without a specific bug

The other way to run this is over a window (the last month of closed issues, a
release's QA findings, a support queue) on a cadence rather than only when
something hurts, because no single ticket in the pile would ever trigger it. Tally
by theme rather than severity and pick one upstream change, with the issue count
as its argument.

Procedure in `references/backlog-read.md`, retrieval in
`references/history-sources.md`.

## When nothing could have caught it

A legitimate outcome, occasionally. Say so explicitly, log it anyway, and write
down what would have to exist to catch it next time. If the same words come up a
second time, they were wrong the first time.
