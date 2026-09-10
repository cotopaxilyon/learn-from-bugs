// Every arm of check-examples.mjs, seen red against a mutation of the real file.
// A check never observed failing is a hypothesis about a check, and this one
// guards a reference nothing else can guard: the gate does not run against
// prose, so if these arms are wrong the examples drift from the shipped grammar
// silently. The mutations run against the real examples.md rather than a
// fixture, so an arm that stops reaching the file it is aimed at fails here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { problemsIn, blocksIn, fencedRuns, EXAMPLES, LOG } from './check-examples.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const examples = fs.readFileSync(path.join(ROOT, EXAMPLES), 'utf8');
const log = fs.readFileSync(path.join(ROOT, LOG), 'utf8');
const blocks = [...examples.matchAll(/```\n(?:Class|Theme):[\s\S]*?```\n/g)].map((m) => m[0]);
const themeBlock = blocks.find((b) => b.startsWith('```\nTheme:'));
const issueBlock = blocks.find((b) => b.startsWith('```\nClass:'));

const mutate = (from, to, n = 1) => {
  assert.ok(examples.includes(from), `the mutation target is gone from examples.md: ${from.slice(0, 60)}`);
  let out = examples;
  for (let i = 0; i < n; i += 1) out = out.replace(from, to);
  return out;
};
const codes = (text) => problemsIn(text, log).join('\n');

test('the file as it stands satisfies the gate', () => {
  assert.deepEqual(problemsIn(examples, log), []);
});

test('every untagged fenced run in the file is recognised as a block', () => {
  // Not re-derived with the recognition rule this is meant to check. The first
  // version of this test matched blocks with the same opening-line regex the
  // module used, so it agreed with the module by construction and stayed green
  // through the blank-line hole a critic found on 2026-09-10.
  const untagged = fencedRuns(examples).filter((r) => r.tag === '');
  assert.equal(blocksIn(examples).length, untagged.length);
  assert.ok(themeBlock, 'no theme block in examples.md');
  assert.ok(issueBlock, 'no incident block in examples.md');
  assert.ok(blocksIn(examples).every((b) => b.section), 'a block sits outside every worked section');
});

test('a block is recognised by any of its fields, not only its first line', () => {
  // The critic's case, end to end: a blank line after the opening fence is
  // invisible in rendered markdown, and used to take the whole block out of
  // scope along with any value the gate refuses.
  const shifted = mutate('```\nClass: new — a requirement both sides read differently', '```\n\nClass: new — a requirement both sides read differently')
    .replace('Level: process\nBucket: misunderstood', 'Level: proces\nBucket: misunderstood');
  assert.match(codes(shifted), /deny_level/);
});

test('an untagged fence carrying no field at all is still reported', () => {
  const gutted = examples.replace(issueBlock, '```\nnot a block any more\n```\n');
  assert.match(codes(gutted), /carries no step 6 field/);
});

test('a language-tagged fence is a code sample, and does not shift the pairing', () => {
  const withSample = examples.replace('## 1. ', '```json\n{ "not": "a block" }\n```\n\n## 1. ');
  const runs = fencedRuns(withSample);
  assert.equal(runs.filter((r) => r.tag === 'json').length, 1);
  assert.equal(blocksIn(withSample).length, blocksIn(examples).length);
  assert.deepEqual(problemsIn(withSample, log), []);
});

test('a closed-set value the gate refuses', () => {
  assert.match(codes(mutate('Bucket: missing', 'Bucket: mising')), /deny_bucket/);
});

test('the instance arithmetic', () => {
  assert.match(codes(mutate('Instance: 2', 'Instance: 3')), /deny_instance_count/);
});

test('a mechanism 1 or 2 row that never says how it was seen red', () => {
  assert.match(codes(mutate('red: it failed against the swallowed error before the call site changed, ', '')), /deny_landed_no_red/);
});

test('a theme block carrying the incident block field', () => {
  assert.match(codes(mutate('Count: 3', 'Priors: `git log` → 1 nominated\nCount: 3')), /deny_theme_has_priors/);
});

test('a theme Landed row with nothing to point at', () => {
  assert.match(codes(mutate('Landed: 5 the QA pass names a client with an existing cache as a population it has to cover, not only a clean profile, docs/qa-checklist.md', 'Landed: 5 the QA pass covers a client with an existing cache')), /deny_landed_no_referent/);
});

test('a theme Landed row whose referent is a sentence', () => {
  // The gate cannot see this one without a repo: at cwd: null the referent rule
  // is only "a comma and something after it", which prose satisfies. The first
  // version of the test above mutated the path into prose and went green.
  assert.match(codes(mutate(', src/sw/navigation.ts', ', which is where the rule now lives')), /neither a path nor a ticket id/);
});

test('a count asserted beside the rows rather than derived from them', () => {
  assert.match(codes(mutate('Count: 3', 'Count: 4')), /deny_theme_count/);
});

test('a prior row that names a day rather than an entry', () => {
  assert.match(codes(mutate('- 2026-02-11 An export rounded a total: same-theme', '- 2026-02-11: same-theme')), /deny_prior_no_slug/);
});

test('a row naming an entry the file never declared', () => {
  // The non-circularity arm. Declarations are read only from the preamble, so
  // deleting one has to break the row that points at it.
  assert.match(codes(mutate('- 2026-02-11 — An export rounded a total a way nobody could find written down\n', '')), /deny_prior_not_in_log/);
});

test('a section that loses its block', () => {
  assert.match(codes(examples.replace(issueBlock, '')), /carries no block/);
});

test('a file with no blocks at all', () => {
  let stripped = examples;
  for (const b of blocks) stripped = stripped.replace(b, '');
  assert.match(codes(stripped), /carries no step 6 block at all/);
});

test('the theme block and the incident block are each required', () => {
  assert.match(codes(examples.replace(themeBlock, issueBlock)), /no example shows the theme block/);
  let onlyTheme = examples;
  for (const b of blocks) if (b !== themeBlock) onlyTheme = onlyTheme.replace(b, themeBlock);
  assert.match(codes(onlyTheme), /no example shows the incident block/);
});

test('the dismissal row', () => {
  assert.match(codes(mutate('- 2026-03-04 A card rendered blank: not-a-member\n', '')), /not-a-member/);
});
