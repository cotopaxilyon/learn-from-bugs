// Every deny code the audit defines is watched firing here, the same rule
// ledger-gate.test.mjs opens with.
// usage: node --test scripts/gate-existing-entries.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditLog, GRANDFATHERED } from './gate-existing-entries.mjs';

// One entry carrying a complete block, one predating the block entirely.
const BLOCKED = `## 2026-09-03 — A gate shipped green and could not fire

Prose.

Class: null safety
Instance: 1
Level: contract
Bucket: missing
Not one up: convention would be every path and only one is affected
Sweep: \`grep -rn zzz .\` → nothing
Priors: \`git log --date=short --format=%ad -- README.md\` → 0 nominated
Landed: 4 the template now asks the question
Critic: not-run
`;
const OLD = `## 2026-08-31 — A documented step vanished during a refactor and nothing noticed

Prose only. No block at all.
Class: null safety
`;
const LOG = `# Lessons\n\n${BLOCKED}\n${OLD}`;

test('a log whose entries all satisfy the current grammar reports nothing', () => {
  assert.deepEqual(auditLog(LOG).map((f) => f.code), []);
});

test('two entries sharing a date and a heading are refused, naming the log', () => {
  // No prior row can separate them: any heading fragment matching one matches
  // the other, so the row is refused as ambiguous and the nomination it was
  // meant to answer is refused as undispositioned. There is no string the
  // author can write, which is why this is checked against the log.
  const twins = `${LOG}\n${BLOCKED}`;
  const fails = auditLog(twins);
  const dup = fails.find((f) => f.code === 'deny_log_duplicate_heading');
  assert.ok(dup, JSON.stringify(fails.map((f) => f.code)));
  assert.match(dup.detail, /Retitle one/);
  // reported once, not once per copy
  assert.equal(fails.filter((f) => f.code === 'deny_log_duplicate_heading').length, 1);
});

test('three copies of one heading are still reported once', () => {
  const fails = auditLog(`${LOG}\n${BLOCKED}\n${BLOCKED}`);
  assert.equal(fails.filter((f) => f.code === 'deny_log_duplicate_heading').length, 1);
});

test('same title on different days is not a duplicate', () => {
  const other = BLOCKED.replace('2026-09-03', '2026-09-05');
  assert.deepEqual(auditLog(`${LOG}\n${other}`).map((f) => f.code), []);
});

test('the executed half of the block is never run here', () => {
  // A Sweep observation was true against the tree on the day it was written and
  // drifts with the tree. Re-running it would go red for correct history. The
  // command below cannot match any real output and must still pass.
  const drifted = LOG.replace('Sweep: `grep -rn zzz .` → nothing', 'Sweep: `grep -rn zzz .` → 41 call sites, all in src/gone.js');
  assert.deepEqual(auditLog(drifted).map((f) => f.code), []);
});

test('a grandfathered entry is excused from its named code and from nothing else', () => {
  // The failure this guards against is an allowlist that grows into a blanket.
  const heading = GRANDFATHERED[0].heading;
  const date = heading.slice(0, 10);
  const title = heading.slice(11);
  const bare = `## ${date} — ${title}\n\nProse only. No block.\nClass: null safety\n`;
  assert.deepEqual(auditLog(`# Lessons\n\n${bare}`).map((f) => f.code), []);
  // the same entry with a day-keyed prior row still fails
  const withRow = bare.replace('Class: null safety', 'Priors: `git log` → 1 nominated\n- 2026-09-03: same-theme\nClass: null safety');
  assert.ok(auditLog(`# Lessons\n\n${BLOCKED}\n${withRow}`).some((f) => f.code === 'deny_prior_no_slug'));
  // and with a closed-set value outside the set
  const withLevel = bare.replace('Class: null safety', 'Level: module\nClass: null safety');
  assert.ok(auditLog(`# Lessons\n\n${withLevel}`).some((f) => f.code === 'deny_level'));
});

test('every grandfather row names a code and a specific reason', () => {
  for (const g of GRANDFATHERED) {
    assert.ok(g.heading && g.code && g.why, JSON.stringify(g));
    assert.ok(g.why.length > 20, `"grandfathered" with no reason is how a rule stops meaning anything: ${g.heading}`);
  }
});

test('an excuse belongs to one heading, not to every heading that extends it', () => {
  // startsWith let a new entry wear an old entry's excuse by appending words to
  // its heading, and a retitle is silent at the gate, which reads it as a
  // re-save. The audit was the only thing still watching.
  const g = GRANDFATHERED[0];
  const date = g.heading.slice(0, 10);
  const title = g.heading.slice(11);
  const extended = `## ${date} — ${title}, and then a fourth time the week after\n\nProse only. No block at all.\nClass: null safety\n`;
  assert.ok(auditLog(`# Lessons\n\n${extended}`).some((f) => f.code === 'deny_missing_field'));
  // the exact heading keeps its excuse
  const exact = `## ${date} — ${title}\n\nProse only. No block at all.\nClass: null safety\n`;
  assert.deepEqual(auditLog(`# Lessons\n\n${exact}`).map((f) => f.code), []);
});

test('the excuse lapses as soon as the entry starts carrying block fields', () => {
  // deny_missing_field stands for nine fields, so excusing it excused all nine
  // forever. The recorded reason is that the block postdates the entry, and a
  // partial block means it no longer does.
  const g = GRANDFATHERED[0];
  const date = g.heading.slice(0, 10);
  const title = g.heading.slice(11);
  const partial = `## ${date} — ${title}\n\nProse.\nClass: null safety\nLevel: contract\n`;
  const codes = auditLog(`# Lessons\n\n${partial}`).map((f) => f.code);
  assert.ok(codes.includes('deny_missing_field'), codes.join(','));
  // Class: alone does not count as a block field; every entry carries one
  const classOnly = `## ${date} — ${title}\n\nProse.\nClass: null safety\n`;
  assert.deepEqual(auditLog(`# Lessons\n\n${classOnly}`).map((f) => f.code), []);
});
