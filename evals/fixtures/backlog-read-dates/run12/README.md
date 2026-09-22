# Run 12's two candidate entries, kept as gate cases

`cand-1.patch` and `cand-2.patch` are the whole working-tree diff each
candidate arm left in run 12 (`evals/RESULTS.md`, run 12 addendum), taken
against this fixture's `docs/`, which is what each arm started from. They are
copied out of the run's scratch directory because scratch does not survive.

Each one carries a `Landed:` row whose number does not match what its diff
built:

- cand-1: `Landed: 4` (a template question) against `docs/ticket-template.md`,
  whose added lines are declarative prose with no question mark or checkbox.
  What it built is 3.
- cand-2: `Landed: 6` (a relocation) against `docs/ticket-template.md`, which
  gained an instruction to relocate in future and moved no text. What it built
  is 3. Its second row, `Landed: 4`, is honest: the same diff adds a `- [ ]`
  checkbox. The gate checks only 4 against the diff, so a replay of cand-2
  lands, and its 6 row is a known miss rather than a refusal.

Like `hand/`, this directory is construction material and stays out of the
bundle an arm receives.
