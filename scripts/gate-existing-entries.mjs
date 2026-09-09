#!/usr/bin/env node
// Every entry already in the log has to satisfy the grammar the gate enforces
// today, not the grammar in force on the day it was written.
//
// Why this exists. The gate reads only the entries a write adds, so everything
// already on disk is invisible to it. That invisibility is what let a grammar
// change ship beside a log full of the shape it had just started refusing: on
// 2026-09-04 the prior row was re-keyed from a day to an entry, and the log's
// own newest entry still carried "- 2026-08-31: adjacent", one verdict standing
// for the eight entries that share that day. Nothing went red. The problem was
// written down as a limitation instead of as work, which is what an unenforced
// observation always becomes.
//
// Scope, and why it stops where it does. Only the STATIC half of the block is
// checked: fields present, closed-set values, prior rows resolving to one entry
// each, the instance arithmetic, mechanism numbers. The executed half is not.
// A `Sweep:` observation was true against the tree on the day it was written
// and drifts as the tree moves, so re-running it would go red for correct
// history rather than for a defect. Git nomination is excluded for the same
// reason. `cwd: null` skips execution; `nominated: []` skips nomination.
//
// A prior row is an index, not narrative. An index that no longer resolves is
// broken whenever it was written, so it gets migrated. The prose above the
// block is a historical snapshot and nothing here touches it.
//
// usage: node scripts/gate-existing-entries.mjs [path/to/LESSONS.md]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { entriesIn, validateEntry } from '../plugins/learn-from-bugs/hooks/ledger-gate.mjs';

// Entries excused from a rule that postdates them, each naming the deny code it
// is excused from and why migration is not owed. An entry absent from this list
// owes the current grammar. Keep the reason specific: "grandfathered" on its own
// is how a rule stops meaning anything.
export const GRANDFATHERED = [
  // These twelve predate the block itself and owe none of its fields. They are
  // excused from the missing-field rule and from nothing else: a bare-date prior
  // row in any of them would still fail, because a broken index is broken
  // whenever it was written.
  { heading: '2026-09-02 A cap nobody had earned moved three times in one day', code: 'deny_missing_field', why: 'the step 6 block postdates this entry; the first entry to carry one is 2026-09-03' },
  { heading: '2026-09-01 The critic proposed for step 7 was the self-audit this skill rejects', code: 'deny_missing_field', why: 'the step 6 block postdates this entry; the first entry to carry one is 2026-09-03' },
  { heading: '2026-09-01 Three gates failed while green, and the skill never asked whether they could fail', code: 'deny_missing_field', why: 'the step 6 block postdates this entry; the first entry to carry one is 2026-09-03' },
  { heading: '2026-09-01 A scoped grep became an absolute claim, then an acceptance criterion, then nearly a deletion', code: 'deny_missing_field', why: 'the step 6 block postdates this entry; the first entry to carry one is 2026-09-03' },
  { heading: '2026-08-31 A fix recorded in this log had never reached the file it named', code: 'deny_missing_field', why: 'the step 6 block postdates this entry; the first entry to carry one is 2026-09-03' },
  { heading: '2026-08-31 A documented step vanished during a refactor and nothing noticed', code: 'deny_missing_field', why: 'the step 6 block postdates this entry; the first entry to carry one is 2026-09-03' },
  { heading: '2026-08-31 The skill did not trigger on the case it claims to be best at', code: 'deny_missing_field', why: 'the step 6 block postdates this entry; the first entry to carry one is 2026-09-03' },
  { heading: '2026-08-31 Three trigger tests returned false negatives, and one read as a pass', code: 'deny_missing_field', why: 'the step 6 block postdates this entry; the first entry to carry one is 2026-09-03' },
  { heading: '2026-08-31 One agent\'s unreviewed conclusion came back looking like corroboration', code: 'deny_missing_field', why: 'the step 6 block postdates this entry; the first entry to carry one is 2026-09-03' },
  { heading: '2026-08-31 Sequential section numbers collided three ways in one day', code: 'deny_missing_field', why: 'the step 6 block postdates this entry; the first entry to carry one is 2026-09-03' },
  { heading: '2026-08-31 The front page claimed provenance the artifact itself disclaimed', code: 'deny_missing_field', why: 'the step 6 block postdates this entry; the first entry to carry one is 2026-09-03' },
  { heading: '2026-08-31 Correct install instructions failed because two commands looked like one', code: 'deny_missing_field', why: 'the step 6 block postdates this entry; the first entry to carry one is 2026-09-03' },
];

function excused(heading, code) {
  // Equality, not startsWith. A heading that merely extends a grandfathered one
  // was inheriting its excuse, so appending words to an old heading and dropping
  // the block audited clean. The failure direction is right this way: a retitle
  // loses the excuse and goes red loudly.
  return GRANDFATHERED.some((g) => heading === g.heading && g.code === code);
}

// The fields deny_missing_field stands for. An entry excused from that code is
// excused from all nine at once, so the excuse is held only while the entry
// carries none of them: the recorded reason is that the block postdates the
// entry, and a partial block means it no longer does. Class: is deliberately
// absent, because every entry carries one and it predates the block.
const BLOCK_FIELDS = ['Instance', 'Level', 'Bucket', 'Not one up', 'Sweep', 'Priors', 'Landed', 'Critic'];

function carriesBlockField(body) {
  return BLOCK_FIELDS.some((f) => new RegExp(`^${f}:`, 'm').test(body));
}

export function auditLog(text) {
  const out = [];
  // A prior row is keyed by date plus a fragment of the heading, so two entries
  // sharing a date AND a title leave an author no string that separates them:
  // any fragment matching one matches both, the row is refused as ambiguous,
  // and the nomination it was meant to answer is refused as undispositioned.
  // There is no way out of that state from inside the entry. It is a property
  // of the log, so it is checked here, and this is the only place it can be
  // checked: the gate's newEntries treats a heading already on disk as a
  // re-save, so a duplicate heading never reaches the gate as a new entry.
  const seen = new Map();
  for (const e of entriesIn(text)) {
    const key = `${e.date} ${e.title}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
    if (seen.get(key) === 2) {
      out.push({
        heading: key,
        code: 'deny_log_duplicate_heading',
        detail: 'two entries carry this identical date and heading, which makes any prior row naming either of them unsatisfiable. Retitle one; the consequence line is what tells them apart.',
      });
    }
  }
  for (const e of entriesIn(text)) {
    const heading = `${e.date} ${e.title}`;
    // onDisk is the whole log so label reuse and heading resolution see every
    // entry. nominated is empty and cwd is null: see the scope note above.
    const claimsBlock = carriesBlockField(e.body);
    for (const f of validateEntry(e, { onDisk: text, nominated: [], cwd: null })) {
      if (!claimsBlock && excused(heading, f.code)) continue;
      out.push({ heading, ...f });
    }
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const logPath = process.argv[2] ?? path.join(repoRoot, 'docs/LESSONS.md');
  const fails = auditLog(fs.readFileSync(logPath, 'utf8'));
  if (fails.length === 0) {
    console.log(`every entry in ${path.relative(repoRoot, logPath)} satisfies the grammar the gate enforces today`);
    process.exit(0);
  }
  console.error(`${fails.length} finding(s) in ${path.relative(repoRoot, logPath)}:`);
  for (const f of fails) console.error(`  [${f.code}] ${f.heading}\n      ${f.detail}`);
  console.error('\nRe-key the index and leave the prose alone, or add the entry to GRANDFATHERED with the rule it predates.');
  process.exit(1);
}
