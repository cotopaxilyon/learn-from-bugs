# Answer key, convention-spread

Kept outside the fixture so no run can read it.

## The live defect

`mergeTicket` in `src/queue/actions.js` finds its target with
`tickets.find((t) => t.id === intoId)` and calls `.history.push(...)` on the
result without checking it. A miss returns `undefined`, so merging into an id
that is not in the queue throws `TypeError: Cannot read properties of
undefined (reading 'history')`, which is the crash QA reported.

**The disagreement worth crediting is not the fix QA asked for.**
`mergeTicket` also looks up its `id` (source) argument with `findIndex` and
splices on the result without checking it. A miss there returns `-1`, and
`tickets.splice(-1, 1)` removes the last ticket in the queue, silently
merging that ticket's history onto the target under the wrong label
(`merged from <the id that was never found>`) and dropping it from the
queue. This is the exact defect shape of the 2026-02-12 incident, recurring
inside the very function that is supposed to be the new instance of the
theme, and the QA report does not mention it because nobody has hit it yet.
Both lookups in `mergeTicket` are the same class; a fix that only guards
`intoId` still ships the `id` gap.

## What counts as a correct fix

Guarding only `mergeTicket`'s two lookups in place, a fifth call-site patch
in the same shape as the first four, is not wrong, but it is not the level
the evidence supports: this is the fourth time the exact same mistake
(dereferencing a lookup result that can signal a miss without checking it)
has shipped in this one file, and three of the four times it was fixed
locally rather than closed off. A fix that matches the evidence introduces
one shared, throwing lookup (for example `mustFind(items, predicate,
message)` in a new `src/queue/lookup.js`) and routes `mergeTicket` through
it for both lookups, so a future fifth call site either uses the same
helper or has to deliberately opt out of it rather than silently repeat the
pattern.

## What counts as the correct diagnosis

The fourth instance of one theme. Three prior fixes each patched a single
call site in `src/queue/actions.js` after its own incident: `reassignTicket`
(2026-02-12), `queueAhead` (2026-04-06), `ticketsBehind` (2026-06-18). All
three are "Level: call-site" fixes. A fourth call-site fix restates the
third rather than generalizing past it, so the correct level is one step
up: **Level: convention** — a shared, throwing lookup helper that callers
are routed through, not a fourth independent guard. ("Not one up" from
convention is process: nothing here needs a review step or a checklist,
because the pattern is fully mechanical — a lookup call not wrapped by the
shared helper is a diff a grep can catch.)

The bucket is **unread**. `docs/CONVENTIONS.md` has carried the general rule
("a search that can miss returns `-1`, `undefined`, or `null` rather than
throwing; the caller checks before use") since the first commit
(2026-01-14), months before `mergeTicket` was added (2026-07-30). The rule
existed and was not missing; it was not consulted when the new call site was
written.

**Instance: 4** — three priors dispositioned same-theme, plus this one.

## Routes to the theme

Four functions in one file, `git log -p -- src/queue/actions.js`, showing
exactly three guard-adding commits (2026-02-12, 2026-04-06, 2026-06-18) plus
the file's creation and the commit that added `mergeTicket` unguarded. The
rule stated once in `docs/CONVENTIONS.md` under "Lookups." Grep for
"findIndex" or "unchecked" in `docs/LESSONS.md`, which returns the three
targets and, on "unchecked," the 2026-03-19 cache entry too (it does not
use that word; a grep on "index" would, so route choice matters here).

The three target entries carry two different `Class:` labels ("wrong item
removed on a lookup miss" for 2026-02-12; "slice bound trusted an unchecked
index," reused, for 2026-04-06 and 2026-06-18), so a label-only match finds
two of three and a reader has to notice the first entry is the same theme
under different words.

## Scope

Valid only with the bug report attached. For the skill's aggregate mode,
"what are our bugs telling us," four entries in one file is too small a
window to demonstrate aggregate reading; this fixture is not built for that
mode.

## Known artificialities, disclosed

See `README.md`'s "Known artificialities, disclosed" section: the log's
single-commit entry, the 2026-03-19 file-level false positive that a correct
entry must disposition `unrelated`, and the second, uncredited-but-creditable
defect in `mergeTicket`'s `id` lookup.

## Machine-checkable answer

```json
{
  "expected_same_theme": [
    "2026-02-12 Reassigning a stale ticket id",
    "2026-04-06 tickets ahead of an unknown id",
    "2026-06-18 tickets behind an unknown id"
  ],
  "expected_instance": 4,
  "expected_level": "convention",
  "expected_landed_referents": ["src/queue/lookup.js"],
  "expected_bucket": "unread"
}
```

Each `expected_same_theme` entry is a heading date plus the shortest fragment
of that entry's heading that is unique on its day, the key the gate's own
`Priors:` rows use (`resolvePrior` in `ledger-gate.mjs` matches a row's date
plus a case-insensitive substring of the heading title against the log; a
bare date with no fragment is refused as `deny_prior_no_slug`). All four of
this fixture's heading dates are themselves unique, so any substring of that
day's title resolves without ambiguity; the fragments above are chosen only
for readability, not because a shorter one would fail.

`expected_level` and `expected_bucket` are closed-set values read from
`plugins/learn-from-bugs/hooks/ledger-gate.mjs` (`LEVELS` and `BUCKETS`
respectively) at the time this fixture was built; re-read the exports before
grading if the gate has changed since. `expected_same_theme` and
`expected_landed_referents` are not closed-set values; they are read off
this fixture's own log and source tree. `expected_landed_referents` names
the one new file a convention-level fix should create; a run that instead
lands the guard only inside `src/queue/actions.js` has fixed the instance at
the level already shown not to hold, which is a partial credit case, not a
pass.
