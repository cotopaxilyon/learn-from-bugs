# Checks that cannot fail

Companion to `SKILL.md` step 5. Read it when the change you are about to land is
a check, a test, a generator, or a rule with a check behind it.

Every gate in this file had been written deliberately, ran on every push, and
was green throughout the entire life of the defect it existed to catch. None was
missing. Each answered a cheaper question than the rule it stood for asked,
which is the one property they share and the reason a passing run kept reading
as evidence.

**Run the new check against the defect and watch it go red.** A check never
observed failing is a hypothesis about a check. This is not the same artifact as
step 1's failing test: that one reproduces the bug, this one is the thing you
are keeping afterwards, and the two fail for different reasons.

**Then describe a violation that would still pass it.** If you can write that
sentence, you have specified the next bug rather than caught it. Write it into
the step 6 entry.

## The shapes it takes

**A rule about behavior, guarded by a check over source text.** The tell is a
grep standing in for an assertion. "Does any file re-derive this inline" cannot
see two accessors inside the exempt file that disagree with each other, and
"does `fetch` appear before the cache read" cannot see that
`fetch(req).catch(...)` has exactly the right shape and still serves a 401,
because `.catch` fires on a network error and a 401 is a successful response.

**A check written by the same reader as the fix, in the same commit.** A suite
that grows by twenty tests alongside a fix can contain one that asserts the
reported symptom as expected behavior, and it will be green. Check the new
assertions against the report rather than against the implementation.

**A generated or exhaustive check that looks more rigorous than what it
replaced.**
An exhaustive generator that gives every field the same instant cannot express
an onset-before-midnight shape, so it reproduces the sampled fixture list's
blind spot while appearing to remove it. Any generator owes you the name of a
known past instance it is required to rediscover. Run it once and confirm it
does.

**One environment standing in for the matrix.** A suite that has only ever
executed in the author's timezone and CI's, one of which is UTC, cannot falsify
a UTC-versus-local defect at all. Ask what the suite would have to run inside
for this class to be visible, and if the answer is somewhere it has never run,
that is a matrix rather than a promise. The same applies to locale, clock,
viewport, connection quality, permission state, and the age of stored data.

## When a gate can pass without checking anything

Once it can, passing it stops being evidence, and a green suite becomes an
argument against looking. That is why this belongs in step 5 rather than in a
style guide: the check is what you are keeping, and one that cannot fail is
worse than none, because it is trusted.
