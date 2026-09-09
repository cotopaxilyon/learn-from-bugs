# Fixture: convention-spread

A synthetic repository used to test whether an agent, handed a new instance of
a recurring theme, finds the earlier same-theme entries in the incident log
before writing its own. Restore it with:

    git clone convention-spread.bundle work
    cd work && npm test

Seven source and test files, nine tests passing, four incident-log entries
across five months, seven commits backdated across the same period.

**The prompt every arm receives, verbatim:**

> QA reopened this: merging a ticket into an id that no longer exists crashes
> the queue view instead of showing "ticket not found." Tests pass.

`ANSWER-KEY.md` holds the intended diagnosis, the closed-set values a correct
ledger entry should use, and the artificialities that are known and disclosed.
Keep it out of any directory an arm runs in.

## Commit dates

Every commit in the bundle sets both `GIT_AUTHOR_DATE` and
`GIT_COMMITTER_DATE`, each with an explicit UTC offset (`-05:00` for the
January/February commits, `-04:00` from March on, matching US-Eastern's own
DST split for these dates). `git log --date=short` renders a commit's date in
the commit's own zone, not the reader's, so a commit stamped near either end
of a day keeps the day it was authored on no matter where the clone is later
read from.

## The theme

Four different call sites in `src/queue/actions.js` look a ticket up with
`Array.prototype.findIndex` or `.find`, both of which signal a miss by
returning `-1` or `undefined` rather than throwing. Three call sites
(`reassignTicket`, `queueAhead`, `ticketsBehind`) were each patched, one at a
time, after their own incident. The fourth, `mergeTicket`, was added later
and was never patched: it dereferences the result of a `.find()` that can
miss without checking it first, which is why the QA report above is a crash
rather than the silent-wrong-data symptom the three recorded incidents
describe. `docs/CONVENTIONS.md` has carried the general rule ("a search that
can miss returns `-1`, `undefined`, or `null` rather than throwing; the caller
checks before use") since the first commit.

## Known artificialities, disclosed

- `docs/LESSONS.md` entered git in one commit, at HEAD, framed as a move out
  of a wiki. Every entry it holds predates that commit by months; this is the
  same disclosed shortcut the `date-validity` fixture uses for the same
  reason.
- One entry (2026-03-19, a stale search cache) shares its day with a real
  commit on `src/queue/actions.js` (that fix also touched `actions.js`, to
  call the new cache-invalidation function from `reassignTicket`), so the
  mechanical backward sweep nominates it alongside the three same-theme
  dates. It is not same-theme; a correct entry dispositions it `unrelated`.
  This is deliberate: a correct answer has to discriminate among what the
  sweep hands it, not cite all of it.
- `mergeTicket`'s `id` (source) lookup carries the same unguarded-miss defect
  as its `intoId` (target) lookup the QA report names, and on its own
  produces a second, more dangerous bug: merging from an id that does not
  exist silently deletes and folds the history of whatever ticket happens to
  be last in the queue, mislabelled as merged from the wrong id. The QA
  report never mentions it. Finding it is worth crediting; it is not
  required to pass.

## HEAD-commit isolation

The fixture's HEAD commit (`Move the incident log out of the wiki`) touches
only `docs/LESSONS.md`, a file with no history before that commit. No file
touched by HEAD shares a commit day with any heading date in the log,
verified with:

    git show --name-only --format= HEAD
    # -> docs/LESSONS.md

    git log --date=short --format=%ad -- docs/LESSONS.md
    # -> 2026-08-10

    grep -oE '^## [0-9]{4}-[0-9]{2}-[0-9]{2}' docs/LESSONS.md | awk '{print $2}' | sort -u
    # -> 2026-02-12, 2026-03-19, 2026-04-06, 2026-06-18

2026-08-10 does not appear among those four dates, so the intersection is
empty.

## Class-label placement

The gate's label extractor (`classLabelsIn` in `ledger-gate.mjs`) is anchored
to the start of a line: `/^Class:[ \t]*(.+?)\s*$/gm`. Every entry in
`docs/LESSONS.md` ends with `Class: <label>` as its own last line, nothing
before `Class:` on that line and the whole label on the same line, so the
gate can see it. The 2026-04-06 and 2026-06-18 entries carry the
byte-identical label `slice bound trusted an unchecked index` after
`labelOf` normalisation, so a run that reuses it bare (no `new —` prefix)
lands, and one that mints it again is refused; a fresh clone verifying this
is in "Verification" below.

## Verification

Commands run against a fresh clone of this bundle, not against the working
tree used to build it:

    node -e "
      const fs = require('fs');
      const text = fs.readFileSync('docs/LESSONS.md', 'utf8');
      const labels = [...text.matchAll(/^Class:[ \t]*(.+?)\s*\$/gm)].map(m => m[1]);
      console.log(labels);
    "
    # -> four non-empty labels; the second and fourth are byte-identical

## Scoring

This fixture ships no `score.mjs` of its own and does not modify the shared
one. Grade by hand against `ANSWER-KEY.md`: whether the run's incident-log
entry names the three same-theme prior entries (date plus a heading
fragment, the key `Priors:` rows use), dispositions the decoy correctly,
gets the instance count, level and bucket the closed sets in
`plugins/learn-from-bugs/hooks/ledger-gate.mjs` support, and lands the fix at
the level it claims rather than a fourth call-site patch.
