# Worked examples

Companion to `SKILL.md`. Five issues run end to end, so the shape of the output is
visible rather than described, this is also the format steps 6 and 7 ask for.

Examples 1 to 4 are real. Three come from a production web app we build and
maintain ourselves, and the fourth from this skill's own development. They are our
own issues rather than a client's, so nothing here is de-identified on anyone
else's behalf. Product details are generic and issue numbers are renumbered
because the point is the shape of the analysis rather than the product.

**Example 5 is illustrative**, and labeled as such because no real instance of the
unread or misunderstood buckets had come up yet. Inventing history and presenting it as real is
the failure this skill exists to prevent.

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

**Sweep.** *Sideways:* six other `catch` blocks in the same file; two swallowed
identically, both fixed in the change. *Backwards:* first of its kind, no earlier
issue shared the theme.

**Change landed.** The view model was extracted so it could be imported and
tested, the call site was made to surface the error instead of swallowing it, and
a unit test now pins both. Per step 5's table this was a first-of-its-kind, so:
a test and a log entry, not a new process.

> A card rendered blank instead of reporting why it couldn't render.
> *What happened:* a call site caught an error and returned nothing; the card
> rendered empty and no signal reached the console.
> *Why nothing caught it:* the logic was inline in the page and could not be
> imported, so the absence of a test was structural, not a decision anyone made.
> *The rule:* if it can't be imported, it can't be tested, extract it first.
> `[silent-failure]` `[untestable]`

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
agreed by accident, one didn't. *Backwards:* second instance of the theme,
an earlier issue had also come from a rule that existed only in someone's memory.

**Change landed.** One exported function, every call site routed through it, and
a test at the boundary, the late-evening case that produced the disagreement.
Second instance, so per step 5 this earned a check rather than only a test.

> Two surfaces disagreed about which day a record belonged to.
> *What happened:* day derivation was implemented twice; the two implementations
> disagreed at the end of the day.
> *Why nothing caught it:* the rule was decided in conversation and never written
> down, so the second implementer had nothing to find.
> *The rule:* a derivation that more than one surface depends on gets exactly one
> exported implementation. A decision that exists only in a conversation is not a
> decision the codebase has.
> `[duplicated-knowledge]` `[unrecorded-decision]`

---

## 3. Only users who had opened the app before saw the broken version, #252

**The issue.** A user reported the app showing an old version after a release.
Nobody on the team could reproduce it.

**Gate.** *Detection.* Nothing told anyone. QA tested on clean profiles, which is
exactly the population that could not experience the bug.

**Bucket.** *Missing.* No one had specified what should happen for a client with a
cached previous version, so there was no criterion to test against.

**Sweep.** *Sideways:* every cached shell asset had the same exposure.
*Backwards:* third issue in six months that only affected returning clients,
**a theme.**

**Change landed.** Navigations served network-first with a cache fallback, plus,
because it was a theme, not an instance, "test with an existing cache, not only a
clean profile" added to the QA pass. Per step 5, a theme buys a process change,
not another patch.

> Only users who had opened the app before saw the broken version.
> *What happened:* the cached shell was served ahead of the network, so returning
> clients kept an old build after release.
> *Why nothing caught it:* the failure is invisible on a clean profile, and every
> gate ran on clean profiles.
> *The rule:* any gate that only runs against a fresh client tests a population
> that does not include your users.
> `[environment-specific]` `[stale-state]`

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
*Backwards:* first of its kind in this repo, but it is the same bucket as #268,
which is why it was worth a check rather than a note.

**Change landed.** The content restored, and `scripts/check.sh` now asserts the
step headings are exactly 1–7 in order, a check that fails loudly if a step is
ever lost again. The general form: prose cannot guard prose.

> A capture step disappeared during a refactor and nothing noticed.
> *What happened:* a documented step was removed as a side effect of moving
> neighbouring content.
> *Why nothing caught it:* the document's structure was a convention, not an
> assertion, so nothing could fail when it changed.
> *The rule:* if a document has a structure other things depend on, assert the
> structure mechanically.
> `[unrecorded-decision]` `[no-check]`

---

## 5. Illustrative, the buckets with no real instance yet

**Not a real incident.** Included so *unread* and *misunderstood* have a worked
shape; replace it with a real one the first time either occurs.

**Unread.** A ticket's description says a list is sorted alphabetically. Comment
14, added two days later after a conversation with support, says it should be
sorted by most-recent-first for accounts with more than fifty items. It was built
alphabetically. The gate is *the plan*, the bucket is unread, and the fix is
not "read more carefully", it is that requirements added in comments get promoted
into the description, because the location is the defect.

**Misunderstood.** A ticket says archived items should be "hidden from the list."
Product meant hidden from the default view and reachable through a filter;
engineering built a hard exclusion. Both readings are defensible; the bug is the
ambiguity. The fix is a readback, one acceptance criterion written as a concrete
scenario with values, confirmed by the author before work starts.
