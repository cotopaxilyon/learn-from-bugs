# Class catalog

Companion to `SKILL.md` step 4. Name the class from here when one fits, since
using the same name twice is what makes the backward sweep possible.

**Technical.** A silent failure where you assumed a throw · environment-specific
behavior (offline, non-prod origin, stale cache, DST, locale) · boundary values
(empty, zero, one item, missing key, first or last) · a write with no reader ·
shape checked but value wrong · state that outlives a session · a constant
duplicated instead of imported · something only real usage triggers (years of
history, thousands of rows, an upgrade from a version you no longer write).

**Experience.** A state that was never designed (empty, error, loading, partial,
offline) · content that outgrew its container · an interaction assuming a mouse, a
large screen, or a fast network · an irreversible action with no confirmation · a
message naming an internal concept the user has never heard.

**Agent-authored.** A test encoding the implementation instead of the requirement
· a convention never written down where the agent reads · an ambiguous prompt
resolved silently · a category nobody reviews in generated code · a whole batch of
work sharing one misread requirement (check the sibling files from the same
session, not only the same module) · a constraint honored early in a session and
dropped after compaction · a rule that exists but sits too deep in a long rules
file to survive.

**Process.** The same unstated assumption across a feature area · the same
ambiguous phrasing across a batch of tickets · every surface owned by no one ·
work specified in one medium and built from another · requirements that keep
turning up in comments rather than descriptions · tickets edited after work
started · a term meaning different things to product and engineering · alignment
that everyone feels and nobody tests · decisions living only in a conversation, a
thread, or a transcript · the same question answered twice in opposite directions.
