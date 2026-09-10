#!/usr/bin/env node
// Every block in references/examples.md has to satisfy the grammar the gate
// enforces today.
//
// Why this exists. The examples are prose in a reference, not entries written
// into a log, so the gate never runs against them. A reference that shows a
// shape the shipped gate refuses teaches the wrong thing, and no check that
// reads only the gate can see it. Until 2026-09-10 the file carried no blocks at
// all while SKILL.md step 6 had required one for a week.
//
// Why the gate's own validator rather than greps. A grep over a section goes
// green the moment the section moves, and it restates a closed set the gate
// already defines: check.sh's hand-typed copies of LEVELS and BUCKETS had
// already drifted when they were replaced by a read of the module's exports.
// This runs validateEntry, so a value added to the gate is checked in the
// examples without anybody remembering to add it here.
//
// Scope. `cwd: null` skips exactly the checks that read a repo: Sweep and Window
// execution, Landed referent resolution, git nomination. Those observations
// belong to a tree the examples do not live in. Everything static is checked:
// fields present, closed-set values, the mint shape, prior and member rows
// resolving to one entry each, the instance and count arithmetic, mechanism
// numbers, and the "red:" a mechanism 1 or 2 owes.
//
// The log the rows resolve against is this repo's own docs/LESSONS.md plus the
// product-log headings examples.md declares in its own preamble, so a row naming
// an entry the file never declared fails rather than resolving to nothing.
// Declarations are read only from above the first worked section, so a row
// cannot declare the entry it names.
//
// usage: node scripts/check-examples.mjs [path/to/examples.md] [path/to/LESSONS.md]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEntry, ticketPattern, NOT_A_MEMBER } from '../plugins/learn-from-bugs/hooks/ledger-gate.mjs';
import { BLOCK_FIELDS } from './gate-existing-entries.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const EXAMPLES = 'plugins/learn-from-bugs/skills/learn-from-bugs/references/examples.md';
export const LOG = 'docs/LESSONS.md';

const SECTION = /^## (\d+)\.\s+(.*)$/;

// Every fenced run in the file, tagged or not. Scanning only for a bare ``` was
// wrong twice over: a language-tagged opener was invisible, so its closing fence
// read as an opener and every run after it paired up shifted.
export function fencedRuns(text) {
  const out = [];
  const lines = text.split('\n');
  let open = null;
  let tag = null;
  let section = null;
  for (const [i, line] of lines.entries()) {
    const m = line.match(SECTION);
    if (m && open === null) section = m[1];
    if (!/^\s*```/.test(line)) continue;
    if (open === null) { open = i; tag = line.trim().slice(3).trim(); }
    else { out.push({ section, tag, body: lines.slice(open + 1, i).join('\n'), line: open + 1 }); open = null; }
  }
  return out;
}

// A block is any untagged fenced run carrying a step 6 field. Recognising one
// by its FIRST line was the cheaper question: a blank line after the opening
// fence, invisible in rendered markdown, dropped a whole block out of scope, and
// the corrupted block that remained then satisfied "every block satisfies the
// gate" by not being one. Found by a critic on 2026-09-10, demonstrated with
// `Level: proces` and `Bucket: misunderstod` passing at exit 0. The field list
// is the audit's own, so a field added to the block is recognised here without
// anybody remembering to add it. `Class:` is absent from that list on purpose,
// because every entry carries one and it predates the block, so it is added
// back here.
const FIELDS = [...BLOCK_FIELDS, 'Class'];
const FIELD_LINE = new RegExp(`^(?:${FIELDS.map((f) => f.replace(/ /g, '\\s')).join('|')}):`, 'm');

export function blocksIn(text) {
  return fencedRuns(text).filter((r) => r.tag === '' && FIELD_LINE.test(r.body));
}

// Entries the file declares for the log its own rows point into. Read only from
// the preamble, above the first worked section: a declaration harvested from the
// blocks would let a row supply the entry it claims, which is a check that
// cannot fail.
export function declaredEntries(text) {
  const cut = text.split('\n').findIndex((l) => SECTION.test(l));
  const preamble = cut === -1 ? text : text.split('\n').slice(0, cut).join('\n');
  return [...preamble.matchAll(/^- (\d{4}-\d{2}-\d{2}) [—–-] (.+)$/gm)]
    .map((m) => `## ${m[1]} — ${m[2].trim()}\n\nDeclared in ${EXAMPLES} so that file's rows resolve.\n`);
}

export function problemsIn(examplesText, logText) {
  const problems = [];
  const blocks = blocksIn(examplesText);
  const onDisk = [logText, ...declaredEntries(examplesText)].join('\n\n');

  const themes = blocks.filter((b) => /^Theme:/.test(b.body));

  if (blocks.length === 0) problems.push('examples.md carries no step 6 block at all');

  // The independent count. Recognition reads the run's contents, so a run that
  // loses every field it is recognised by falls out of scope silently. This
  // reaches it from the other side: examples.md carries no untagged code
  // samples, so an untagged fence that is not a block is either a block that
  // lost its fields or a sample that owes a language tag.
  const recognised = new Set(blocks.map((b) => b.line));
  for (const r of fencedRuns(examplesText)) {
    if (r.tag !== '' || recognised.has(r.line)) continue;
    problems.push(`${EXAMPLES}:${r.line} an untagged fenced block carries no step 6 field, so nothing validates it. If it is a block, it has lost its fields; if it is a code sample, tag it with a language.`);
  }

  for (const b of blocks) {
    for (const f of validateEntry({ body: b.body }, { onDisk, nominated: [], cwd: null })) {
      problems.push(`${EXAMPLES}:${b.line} (example ${b.section ?? '?'}) ${f.code}: ${f.detail}`);
    }
  }

  // Every worked section shows one. A section that quietly loses its block is
  // the state the file was in before 2026-09-10, and the per-block loop above
  // cannot see a block that is not there.
  const sections = [...examplesText.matchAll(new RegExp(SECTION.source, 'gm'))].map((m) => m[1]);
  for (const s of sections) {
    if (!blocks.some((b) => b.section === s)) problems.push(`example ${s} carries no block, so the section shows an analysis with no entry at the end of it`);
  }

  // A theme Landed referent, as far as it can be checked without a repo. The
  // gate asks for a path this work touched or a ticket id, and both halves of
  // that need a tree these examples do not have: at `cwd: null` the rule
  // degrades to "there is a comma and something after it", which a sentence
  // satisfies. A prose tail is exactly what the referent rule exists to stop,
  // and an example showing one teaches it. So the narrower claim is checked
  // here: the tail is a ticket id, or it is shaped like a path. Whether the
  // path was touched is the gate's question and stays the gate's question.
  const PATH_SHAPED = /^[\w.-]+(?:\/[\w.-]+)+$/;
  for (const b of themes) {
    for (const m of b.body.matchAll(/^Landed:[ \t]*\d{1,2}\b(.*)$/gm)) {
      const tail = m[1].split(',').pop().trim();
      if (ticketPattern().test(tail) || PATH_SHAPED.test(tail)) continue;
      problems.push(`${EXAMPLES}:${b.line} (example ${b.section ?? '?'}) a theme Landed row ends in "${tail.slice(0, 40)}", which is neither a path nor a ticket id, so the example shows a referent rule satisfied by prose`);
    }
  }

  // Both kinds, and the dismissal row. The theme block and `not-a-member` are
  // the newest and least obvious shapes in the grammar, and an examples file
  // that stops showing them is how the gate's newest rule becomes the one
  // nobody writes correctly.
  if (themes.length === 0) problems.push('no example shows the theme block, so the periodic read has no worked shape');
  if (blocks.length === themes.length) problems.push('no example shows the incident block');
  if (!themes.some((b) => new RegExp(`^- .+: ${NOT_A_MEMBER}$`, 'm').test(b.body))) {
    problems.push(`no theme example answers a nomination with "${NOT_A_MEMBER}", which is the only shape that dismisses one without claiming membership`);
  }
  return problems;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const examplesPath = process.argv[2] ?? path.join(ROOT, EXAMPLES);
  const logPath = process.argv[3] ?? path.join(ROOT, LOG);
  const problems = problemsIn(fs.readFileSync(examplesPath, 'utf8'), fs.readFileSync(logPath, 'utf8'));
  for (const p of problems) console.error(p);
  console.error(problems.length === 0 ? 'examples.md: every block satisfies the gate' : `examples.md: ${problems.length} problem(s)`);
  process.exit(problems.length === 0 ? 0 : 1);
}
