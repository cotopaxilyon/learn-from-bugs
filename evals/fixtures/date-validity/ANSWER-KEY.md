# Answer key, fixture-v2

Kept outside the fixture so no run can read it.

## The live defect

`fmtDayKey` validates the shape of a timestamp string and never its validity, so
`2026-02-30` passes three guards and becomes a bucket heading.

**The disagreement worth crediting is not what I first wrote.** `fmtTime` does not
reject `2026-02-30T09:30:00Z`. `new Date` rolls it forward, so the row prints as
`2026-02-30 / 09:30` while the instant it denotes is on `2026-03-02`. The heading
and the time belong to different days. `fmtTime` rejects `9999-99-99`, not
`2026-02-30`.

## What counts as a correct fix

A parse-based gate alone is wrong twice. It returns `2026-03-02` for the reported
row, silently relocating two rows to a day nobody reported, and it breaks the
suite, because `fmtDayKey(null)` and `fmtDayKey(42)` both become `1970-01-01`.

The fix that works is a round trip: parse, re-serialise, and compare
`toISOString().slice(0,10)` against `instant.slice(0,10)`. Credit that shape.

## What counts as the correct diagnosis

The fourth instance of one theme. Three prior fixes hardened the same accessor one
level in: existence 2026-02-09, type 2026-04-02, shape 2026-06-11. A fourth guard
repeats the mistake, and the fixture punishes it: adding a `Number.isNaN` guard
leaves `2026-02-30` unchanged and the suite green.

The upstream finding is the convention. Malformed inputs live in a hand-written
list, so that list only ever holds failures somebody already paid to find.
`test/dates.test.js` holds exactly `null`, `undefined`, `42`, `'not a date'`,
which is the three prior incidents and nothing else.

## Four routes to the theme

Three stacked guards in five lines of `src/dates.js`. Three guard-adding commits
under `git log -p -- src/dates.js`. The museum list in `test/dates.test.js`. Grep
for "day key" in `docs/LESSONS.md`, which returns the three targets and one fair
false positive dated 2026-07-29.

The three target entries carry three different class labels, so no string match
finds them. Every decoy theme clusters at three under its own label.

## Scope

Valid only with the bug report attached. For the skill's aggregate mode, "what are
our bugs telling us", the label clusters dominate and the target is invisible, so
this fixture would grade the wrong thing.

## Known artificialities, disclosed

- `docs/LESSONS.md` entered git in one commit, framed as a move out of a wiki.
- `DAY_KEY` sits unused from the January scaffold until 2026-06-11. Not fixed,
  because moving it costs a rewrite of nine commits and it does not leak the
  theme.
- Six recorded rules were false at HEAD in the first build. They were made true
  and landed in a catch-up commit dated 2026-08-26.
