// Mechanical signals from one arm run. No judgement, no prose reading.
//
// usage: node score.mjs <arm-dir> <transcript.jsonl> <answer-key.md>
//
// The answer key is required, not optional. It used to be a constant in this
// file, `PRIOR`, holding one fixture's three dates, so pointing the scorer at
// the other fixture produced a confident zero rather than an error. A scorer
// that grades against nothing and says nothing is the failure this whole repo
// is about, so a missing or unparseable key exits non-zero.
//
// Recall is computed over the whole entry text rather than the block, because
// the installed baseline writes no block and has to be scored on the same
// footing. A key names an entry the way a Priors: row does, a date plus a
// fragment of that entry's heading; the date is what recall looks for, since
// that is the part an arm with no block still writes.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const [armDir, transcript, answerKey] = process.argv.slice(2);
if (!armDir || !transcript || !answerKey) {
  console.error('usage: node score.mjs <arm-dir> <transcript.jsonl> <answer-key.md>');
  process.exit(2);
}

const keyText = fs.readFileSync(answerKey, 'utf8');
const keyBlock = keyText.match(/```json\n([\s\S]*?)```/);
if (!keyBlock) {
  console.error(`${answerKey} carries no \`\`\`json answer block, so there is nothing to grade against`);
  process.exit(2);
}
const key = JSON.parse(keyBlock[1]);
for (const f of ['expected_same_theme', 'expected_instance', 'expected_level', 'expected_bucket']) {
  if (key[f] === undefined) { console.error(`${answerKey}: the json block has no ${f}`); process.exit(2); }
}
// A key row is "YYYY-MM-DD <fragment>". The date is the half an arm without a
// block still writes, so recall reads that; the fragment is what makes the row
// resolve to one entry rather than to a day, and it is kept for the report.
const expected = key.expected_same_theme.map((row) => {
  const m = String(row).match(/^(\d{4}-\d{2}-\d{2})\s*(.*)$/);
  if (!m) { console.error(`${answerKey}: "${row}" is not "YYYY-MM-DD <heading fragment>"`); process.exit(2); }
  return { date: m[1], fragment: m[2].trim(), row: String(row) };
});

const events = fs.readFileSync(transcript, 'utf8').split('\n').filter(Boolean)
  .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

const toolUses = [];
let sessionId = null, done = null;
for (const e of events) {
  if (e.session_id) sessionId ??= e.session_id;
  if (e.type === 'result') done = `${e.subtype}/${e.terminal_reason ?? '?'}`;
  if (e.type !== 'assistant') continue;
  for (const c of e.message?.content ?? []) if (c.type === 'tool_use') toolUses.push(c);
}

// 1. did it fire, and which copy
const skillCalls = toolUses.filter((t) => t.name === 'Skill').map((t) => t.input?.skill);
const fired = skillCalls.includes('learn-from-bugs') ? 'candidate'
  : skillCalls.includes('learn-from-bugs:learn-from-bugs') ? 'installed' : 'none';

// 2. references opened, parent plus every subagent transcript for this session
const refRe = /references\/([a-z-]+)\.md/g;
const refs = new Set();
const scanUses = (uses) => {
  for (const t of uses) {
    if (!['Read', 'Bash', 'Grep'].includes(t.name)) continue;
    for (const m of JSON.stringify(t.input).matchAll(refRe)) refs.add(m[1]);
  }
};
scanUses(toolUses);
const projects = path.join(os.homedir(), '.claude', 'projects');
let subFiles = [];
try {
  subFiles = execFileSync('find', [projects, '-path', `*${sessionId}*`, '-name', 'agent-*.jsonl'],
    { encoding: 'utf8' }).split('\n').filter(Boolean);
} catch { /* none */ }
const allUses = [...toolUses];
for (const f of subFiles) {
  const sub = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const uses = [];
  for (const e of sub) {
    if (e.type !== 'assistant') continue;
    for (const c of e.message?.content ?? []) if (c.type === 'tool_use') uses.push(c);
  }
  scanUses(uses);
  allUses.push(...uses);
}

// 3. did anything read the log before writing to it. The route matters: a
// sideways sweep that fixes every site makes git nominate every date, which is
// the class-level outcome the skill asks for and not a bypass, so this is
// reported beside the recall rather than folded into it.
const LOG_NAME = 'LESSONS.md';
const mentionsLog = (t) => JSON.stringify(t.input ?? {}).includes(LOG_NAME);
const writeIdx = allUses.findIndex((t) => ['Write', 'Edit'].includes(t.name) && mentionsLog(t));
const readBefore = allUses.some((t, i) =>
  (writeIdx === -1 || i < writeIdx) && ['Read', 'Grep'].includes(t.name) && mentionsLog(t));
const grepBefore = allUses.some((t, i) =>
  (writeIdx === -1 || i < writeIdx) && t.name === 'Bash' && mentionsLog(t)
  && /\b(grep|rg|cat|head|tail|sed|awk)\b/.test(JSON.stringify(t.input ?? {})));
const logRead = readBefore ? 'read' : grepBefore ? 'grep' : 'no';

// 4. the entry the run wrote
const logPath = path.join(armDir, 'docs', LOG_NAME);
let entry = '', entryHeading = null;
if (fs.existsSync(logPath)) {
  const body = fs.readFileSync(logPath, 'utf8');
  const heads = [...body.matchAll(/^## /gm)].map((m) => m.index);
  entry = body.slice(heads[0] ?? 0, heads[1] ?? body.length);
  entryHeading = (entry.match(/^## (.*)$/m) ?? [])[1] ?? null;
}
// Whether that entry is this run's, rather than the newest one the fixture
// shipped with. Scoring the fixture's own top entry would read as a run that
// wrote nothing but cited everything.
let entryIsNew = null;
if (entryHeading) {
  try {
    const first = execFileSync('git', ['log', '--format=%H', '--', `docs/${LOG_NAME}`],
      { cwd: armDir, encoding: 'utf8' }).trim().split('\n').filter(Boolean).pop();
    const shipped = execFileSync('git', ['show', `${first}:docs/${LOG_NAME}`],
      { cwd: armDir, encoding: 'utf8' });
    entryIsNew = !shipped.includes(entryHeading);
  } catch { entryIsNew = null; }
}

// 5. the block, if there is one
const blockStart = entry.match(/^(?:Class|Theme):[ \t]*.*$/m);
const block = blockStart ? entry.slice(blockStart.index) : null;
const field = (name) => {
  if (!block) return null;
  const m = block.match(new RegExp(`^${name}:[ \\t]*(.*)$`, 'm'));
  return m ? m[1].trim() : null;
};
const priorRows = block
  ? [...block.matchAll(/^- (\d{4}-\d{2}-\d{2})[ \t]+(.*):[ \t]*([a-z-]+)\s*$/gm)]
      .map((m) => ({ date: m[1], fragment: m[2].trim(), disposition: m[3] }))
  : [];
const sameThemeFromBlock = priorRows.filter((r) => r.disposition === 'same-theme').map((r) => r.date);
// From the block when there is one, else every expected date the entry text
// mentions anywhere, so the no-block baseline is not scored as having cited
// nothing.
const sameThemeDates = block
  ? [...new Set(sameThemeFromBlock)].sort()
  : expected.filter((e) => entry.includes(e.date)).map((e) => e.date);
const recallHits = expected.filter((e) => entry.includes(e.date));
const instance = field('Instance');
const level = field('Level');
const bucket = field('Bucket');

// 6. landed referents. Named in the entry is one question; resolving to a path
// in the arm is another, and a row can pass the first while pointing at a file
// that was never created.
const landedTails = block
  ? [...block.matchAll(/^Landed:[ \t]*\d{1,2}\b(.*)$/gm)].map((m) => m[1].split(',').pop().trim())
  : [];
const expectedReferents = key.expected_landed_referents ?? [];
const referentsNamed = expectedReferents.filter((p) => entry.includes(p));
// What the run changed, not what exists. Existence was the first version and it
// cannot fail on a fixture whose expected referent already ships: date-validity
// expects `test/dates.test.js`, which is in the bundle, so every arm scored true
// including one that never opened the file. It is only meaningful where the
// expected referent is a file the fix has to create, which is convention-spread
// and not this one. git answers the question that holds on both.
let touchedPaths = [];
try {
  touchedPaths = execFileSync('git', ['status', '--porcelain'], { cwd: armDir, encoding: 'utf8' })
    .split('\n').filter(Boolean).map((l) => l.slice(3).trim());
} catch { touchedPaths = []; }
const referentsTouched = expectedReferents.filter((p) => touchedPaths.includes(p));
const landedResolved = landedTails.length === 0 ? null
  : landedTails.every((t) => /^[A-Z][A-Z0-9]+-\d+$|^#\d+$/.test(t) || fs.existsSync(path.join(armDir, t)));

// 7. outcome, measured by running the code. The probes below are the
// date-validity fixture's; on any other fixture the files are absent and the
// signals say so rather than reporting a failure the arm did not cause.
const sh = (cmd, args) => {
  try { return { ok: true, out: execFileSync(cmd, args, { cwd: armDir, encoding: 'utf8' }) }; }
  catch (e) { return { ok: false, out: (e.stdout ?? '') + (e.stderr ?? '') }; }
};
const suite = fs.existsSync(path.join(armDir, 'package.json')) ? sh('npm', ['test']) : null;
const hasWeekly = fs.existsSync(path.join(armDir, 'src/report/weekly.js'));
const repro = hasWeekly ? sh('node', ['-e', `
import('./src/report/weekly.js').then((w) => {
  const rows = [
    { at: '2026-02-27T08:00:00Z', id: '1', actor: 'a' },
    { at: '2026-02-30T09:30:00Z', id: '2', actor: 'b' },
    { at: '2026-02-30T11:00:00Z', id: '3', actor: 'c' },
  ];
  const days = w.weeklyReport(rows).map((r) => r.day);
  console.log(JSON.stringify(days));
}).catch((e) => { console.log('THREW'); });`]) : null;
const daysMatch = repro ? repro.out.match(/\[.*\]/) : null;
const days = daysMatch ? daysMatch[0] : null;
const datesPath = path.join(armDir, 'src/dates.js');
const datesSrc = fs.existsSync(datesPath) ? fs.readFileSync(datesPath, 'utf8') : '';

const rankHits = [...entry.matchAll(/mechanism\s+(\d{1,2})\b/gi)].map((m) => Number(m[1]));
const landedRanks = block
  ? [...block.matchAll(/^Landed:[ \t]*(\d{1,2})\b/gm)].map((m) => Number(m[1]))
  : [];

console.log(JSON.stringify({
  arm: path.basename(armDir),
  answer_key: path.basename(path.dirname(answerKey)),
  fired,
  completed: done,
  refs_opened: [...refs].sort(),
  subagent_transcripts: subFiles.length,
  log_read: logRead,
  entry_heading: entryHeading,
  entry_is_new: entryIsNew,
  block_present: block !== null,
  instance,
  instance_correct: instance !== null && Number(instance) === key.expected_instance,
  level,
  level_correct: level === key.expected_level,
  bucket,
  bucket_correct: bucket === key.expected_bucket,
  same_theme_dates: sameThemeDates,
  same_theme_recall: expected.length === 0 ? null
    : Number((recallHits.length / expected.length).toFixed(2)),
  same_theme_missed: expected.filter((e) => !entry.includes(e.date)).map((e) => e.row),
  landed_ranks: landedRanks,
  landed_referents_resolved: landedResolved,
  expected_referents_named: referentsNamed,
  expected_referents_touched: referentsTouched,
  files_touched: touchedPaths,
  rank_cited: rankHits.length > 0 || landedRanks.length > 0,
  ranks: rankHits,
  sweep_names_command: /`[^`]*\b(grep|rg|git|node|npm)\b[^`]*`/.test(entry),
  suite_green: suite === null ? 'not_applicable' : suite.ok,
  symptom_days: hasWeekly ? (days ?? 'repro did not run') : 'not_applicable',
  symptom_fixed: !hasWeekly ? 'not_applicable' : days === null ? 'unknown' : !days.includes('2026-02-30'),
  roundtrip_present: datesSrc === '' ? 'not_applicable'
    : /toISOString\(\)[\s\S]{0,80}slice\(0,\s*10\)/.test(datesSrc),
  guard_count: datesSrc === '' ? 'not_applicable' : (datesSrc.match(/return null;/g) ?? []).length,
}, null, 2));
