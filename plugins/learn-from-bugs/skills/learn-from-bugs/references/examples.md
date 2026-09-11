# Worked examples

Companion to `SKILL.md`. Five issues run end to end, so the shape of the output is
visible rather than described, this is also the format steps 6 and 8 ask for. Each
one ends the way a real entry ends: the prose for a reader, then the fixed-shape
block for the gate and for the next run of this procedure.

Examples 1 to 4 are real. Three come from a production web app we build and
maintain ourselves, and the fourth from this skill's own development. They are our
own issues rather than a client's, so nothing here is de-identified on anyone
else's behalf. Product details are generic and issue numbers are renumbered
because the point is the shape of the analysis rather than the product.

**Example 5 is illustrative**, and labeled as such because no real instance of the
unread or misunderstood buckets had come up yet. Inventing history and presenting it as real is
the failure this skill exists to prevent.

---

## Reading the blocks

Every block below is in the grammar `hooks/ledger-gate.mjs` enforces today, and
`scripts/check.sh` runs the gate's own validator over each one, so a reference
here cannot show a shape the shipped gate refuses.

A prior row and a member row name an entry rather than a day, so they resolve
only inside one log. Examples 1 to 3 sit in the product's log, listed below;
example 4 sits in this repo's own `docs/LESSONS.md`, so its rows name entries you
can go and read; example 5 sits in no log, which is why its blocks carry no rows.
The `Sweep:` and `Priors:` observations were true against the tree on the day
they were written and drift as it moves, which is why nothing re-runs them later.
Example 4's entry in `docs/LESSONS.md` predates the block and carries only a
`Class:` line, so the block here is what that same incident writes today.

The product's log. The first has no worked section here; the other three are
examples 1, 2 and 3:

- 2026-02-11 — An export rounded a total a way nobody could find written down
- 2026-03-04 — A card rendered blank instead of reporting why it couldn't render
- 2026-04-22 — Two surfaces disagreed about which day a record belonged to
- 2026-05-06 — Returning clients kept getting a version of the app nobody could reproduce

---

## 1. A card rendered blank instead of reporting why, #246

**The issue.** QA: one card on the home screen renders empty for some accounts.
No console error, no failed request.

**Capture.** Screenshot, account shape, and the fact that the surrounding cards
rendered, all recorded before the fix, because the empty render is the evidence.

**Gate.** *The tests.* A test existed for the data the card consumed, but the
view-model logic lived inline in the page and could not be imported, so nothing
could exercise the path that failed. Not "we forgot a test", there was nowhere to
put one.

**Bucket.** *Missing.* The rule "a call site must not swallow the error it
catches" was never written down anywhere, so nothing could have flagged it.

**Sweep.** *Sideways:* two of the six other `catch` blocks in the file swallowed
identically and were fixed in the change. *Backwards:* first of its kind, so the
block carries no prior rows and the instance is 1.

**Change landed.** A first of its kind, so per step 5's table it bought a test
and a log entry, not a new process. The block below says what landed.

> A card rendered blank instead of reporting why it couldn't render.
> *What happened:* a call site caught an error and returned nothing; the card
> rendered empty and no signal reached the console.
> *Why nothing caught it:* the logic was inline in the page and could not be
> imported, so the absence of a test was structural, not a decision anyone made.
> *The rule:* if it can't be imported, it can't be tested, extract it first.
> `[silent-failure]` `[untestable]`

```
Class: new — an error caught and turned into silence; no existing label names a call site that handles an error by returning nothing, leaving no signal for anyone downstream
Instance: 1
Level: contract
Bucket: missing
Not one up: convention would be a rule for every catch block in the app, and one call site with one swallowed error is not evidence that the convention is wrong
Sweep: `grep -rn 'catch' src/home` → 6
Sweep: `grep -rln 'return null' src/home` → 2
Priors: `git log --date=short --format=%ad -- src/home` → 0 nominated
Landed: 2 the view model was extracted so it could be imported, and a test drives the failing account shape through it, red: it failed against the swallowed error before the call site changed, src/home/summary-card.model.test.ts
Landed: 10 the call site surfaces the error instead of returning nothing, src/home/summary-card.tsx
Critic: not-run
```

---

## 2. Two surfaces disagreed about which day a record belonged to, #268

**The issue.** A record created late in the evening appeared under one date on the
summary screen and a different date in the export.

**Gate.** *The contract.* "Which day does this belong to" was derived
independently in two places, and neither derivation was the documented one,
because there wasn't a documented one.

**Bucket.** *Unrecorded.* The decision had been made, correctly, in a conversation
months earlier: a record's day is not simply its timestamp's calendar date. It was
understood at the time, honored in the first implementation, and written down
nowhere. The second implementation had no way to find it and reasonably invented
its own.

**Sweep.** *Sideways:* four call sites computed a day from a timestamp; three
agreed by accident, one didn't. *Backwards:* the February rounding issue is the
same theme, so this is instance 2. The block mints a label rather than reusing
one, because that earlier entry carried none.

**Change landed.** Second instance, so per step 5 it earned a check rather than
only a test.

> Two surfaces disagreed about which day a record belonged to.
> *What happened:* day derivation was implemented twice; the two implementations
> disagreed at the end of the day.
> *Why nothing caught it:* the rule was decided in conversation and never written
> down, so the second implementer had nothing to find.
> *The rule:* a derivation that more than one surface depends on gets exactly one
> exported implementation. A decision that exists only in a conversation is not a
> decision the codebase has.
> `[duplicated-knowledge]` `[unrecorded-decision]`

```
Class: new — a decision that exists only in a conversation; the 2026-02-11 rounding entry is this class and carried no label when this was written, so there is nothing yet to reuse
Instance: 2
Level: contract
Bucket: unrecorded
Not one up: convention would be a rule about deriving values in general, and the evidence is two derivations of one value rather than a habit across the codebase
Sweep: `grep -rn 'toLocaleDateString' src` → 4
Sweep: `grep -rn 'startOfDay' src` → 1
Priors: `git log --date=short --format=%ad -- src/records src/export` → 2 nominated
- 2026-02-11 An export rounded a total: same-theme
- 2026-03-04 A card rendered blank: unrelated
Landed: 6 one exported dayOf(), and every call site routed through it, src/records/day-of.ts
Landed: 2 a test at the boundary drives the late-evening timestamp that produced the disagreement, red: it failed against both old derivations, src/records/day-of.test.ts
Landed: 1 the build fails when a file outside day-of.ts derives a date from a timestamp, red: it failed against the export's own derivation before that was removed, ci/no-inline-day.mjs
Critic: not-run
```

---

## 3. Returning clients kept getting a version nobody could reproduce, #252 and two before it

**What this one is.** A finding about a pattern, from the periodic read rather
than from a bug. There is no single fix diff for git to nominate from, so it
takes the theme block rather than the incident one.

**The issue that started it.** A user reported the app showing an old version
after a release. Nobody on the team could reproduce it.

**Gate.** *Detection.* Nothing told anyone. QA tested on clean profiles, which is
exactly the population that could not experience the bug.

**Bucket.** *Missing.* No one had specified what should happen for a client with a
cached previous version, so there was no criterion to test against.

**The read.** Three issues in six months only affected clients carrying state
from a previous release, each closed on its own. The `Window:` retrieval found
them, it was run, and the three it returned are the member rows. Who caught each
is the part worth writing down: one reached a user, one QA found on a hunch, one
nobody found and it was closed unreproducible. Git also nominated the March card
entry, because this work touched a file its commit touched. It is not part of the
theme, so the row dismisses it rather than leaving the nomination unanswered, and
a dismissal does not raise `Count:`.

**Change landed.** Per step 5 a theme buys a process change rather than another
patch. Each `Landed:` row names something this work touched, because a theme
entry's whole risk is landing as prose with nothing to point at.

> Returning clients kept getting a version of the app nobody could reproduce.
> *What happened:* three issues in six months reached only users carrying state
> from a previous release, and each was closed on its own.
> *Why nothing caught it:* every gate ran against a clean profile, which is the
> one population that cannot experience any of them.
> *The rule:* a gate that only runs against a fresh client tests a population
> that does not include your users. The pattern is the finding here, not the
> three bugs under it.
> `[environment-specific]` `[stale-state]`

```
Theme: new — failures only a returning client can reach; no existing label names a class whose whole population is users carrying state from a previous release
Window: `gh issue list --label returning-client --state all` → 3 items
Count: 3
- #231: nobody
- #244: qa
- #252: user
- 2026-03-04 A card rendered blank: not-a-member
Bucket: missing
Landed: 5 the QA pass names a client with an existing cache as a population it has to cover, not only a clean profile, docs/qa-checklist.md
Landed: 1 a release check loads the previous build's cached shell against the new release and fails if the old shell answers, red: it failed against the release that produced #252, ci/release-cache.spec.ts
Landed: 6 navigations are served network-first with a cache fallback, so the rule sits in the service worker rather than in a reviewer's memory, src/sw/navigation.ts
Critic: ran
```

---

## 4. A capture step disappeared during a refactor, this skill, #001

**The issue.** A review found that the instruction "capture the failure before you
touch code" was missing from the skill. It had been written, agreed, and was
simply gone.

**Gate.** *The contract.* Reference material was moved into separate files during a
restructure; the step was adjacent to the moved block and left with it, and
nothing verified that the seven steps were still seven.

**Bucket.** *Unrecorded*, in its purest form. The constraint was understood and
honored right up until the moment the file was rewritten, and it existed only as
prose in a document being edited, with no check asserting it.

**Sweep.** *Sideways:* every other cross-file pointer was checked; all resolved.
*Backwards:* git nominated three entries sharing the day, all adjacent or
unrelated, so this is a first of its kind here. It is the same bucket as #268,
which is why it earned a check rather than a note, and that stays prose rather
than a prior row: #268 is in a different log and no row reaches across.

**Change landed.** The content restored, and a check that fails loudly if a step
is ever lost again. The general form: prose cannot guard prose.

> A capture step disappeared during a refactor and nothing noticed.
> *What happened:* a documented step was removed as a side effect of moving
> neighbouring content.
> *Why nothing caught it:* the document's structure was a convention, not an
> assertion, so nothing could fail when it changed.
> *The rule:* if a document has a structure other things depend on, assert the
> structure mechanically.
> `[unrecorded-decision]` `[no-check]`

```
Class: structure guarded only by prose
Instance: 1
Level: contract
Bucket: unrecorded
Not one up: convention would be a rule that every document's structure is asserted somewhere, and one document losing one step is not evidence for a rule that size
Sweep: `grep -rn 'references/' plugins/learn-from-bugs/skills/learn-from-bugs/SKILL.md` → 7
Priors: `git log --date=short --format=%ad -- plugins/learn-from-bugs/skills/learn-from-bugs/SKILL.md` → 3 nominated
- 2026-08-31 The front page claimed provenance: adjacent
- 2026-08-31 Sequential section numbers: adjacent
- 2026-08-31 Correct install instructions: unrelated
Landed: 1 check.sh asserts the step headings are exactly 1 to 7 in order, red: deleting a step heading made it fail, scripts/check.sh
Critic: not-run
```

---

## 5. Illustrative, the buckets with no real instance yet

**Not a real incident.** Included so *unread*, *misunderstood* and *none* have a
worked shape; replace any of them with a real one the first time it occurs. All
three sit in no log, so none carries prior rows. The first two are at process
level, which is the one level that omits `Not one up:`.

**Unread.** A ticket's description says a list is sorted alphabetically. Comment
14, added two days later after a conversation with support, says it should be
sorted by most-recent-first for accounts with more than fifty items. It was built
alphabetically. The gate is *the plan*, the bucket is unread, and the fix is
not "read more carefully", it is that requirements added in comments get promoted
into the description, because the location is the defect.

```
Class: new — a requirement that arrived somewhere nobody reads twice; no existing label names a requirement added after the description was written, in a place the builder had no reason to return to
Instance: 1
Level: process
Bucket: unread
Sweep: `grep -rn 'sortBy' src/lists` → 3
Priors: `git log --date=short --format=%ad -- src/lists` → 0 nominated
Landed: 4 the ticket template asks whether any comment adds or changes a requirement
Landed: 6 a requirement added in a comment is promoted into the description before the ticket can be picked up
Critic: not-run
```

**Misunderstood.** A ticket says archived items should be "hidden from the list."
Product meant hidden from the default view and reachable through a filter;
engineering built a hard exclusion. Both readings are defensible; the bug is the
ambiguity. The fix is a readback, one acceptance criterion written as a concrete
scenario with values, confirmed by the author before work starts.

```
Class: new — a requirement both sides read differently and neither noticed; no existing label names an ambiguity that produced two defensible readings rather than a mistake by either side
Instance: 1
Level: process
Bucket: misunderstood
Sweep: `grep -rn 'archived' src/lists` → 4
Priors: `git log --date=short --format=%ad -- src/lists` → 0 nominated
Landed: 8 whoever will build it restates the requirement as one concrete scenario with values, confirmed by the author before work starts
Critic: not-run
```

**None.** A test asserted that the export endpoint answered `200`. It did, with
zero rows, because a filter change had emptied the query. The gate is *the
tests*, and this one ran and passed: it asked whether the call returned where it
meant whether the call returned the right rows. Nothing in the information layer
failed here, so the bucket is `none` and the fix is to the assertion.

```
Class: new — a check that asserts the call succeeded where it meant the result was right; no existing label names an assertion that passes on any response at all
Instance: 1
Level: contract
Bucket: none
Not one up: convention would be a rule for every assertion in the suite, and one test asserting the wrong thing is not evidence that the convention is wrong
Sweep: `grep -rn 'status).toBe(200)' test` → 5
Priors: `git log --date=short --format=%ad -- test/export` → 0 nominated
Landed: 2 the export test asserts the rows it expects rather than that the call returned, red: it failed against the empty export before the query was fixed, test/export/rows.test.js
Critic: not-run
```
