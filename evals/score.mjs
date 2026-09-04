// Mechanical signals from one arm run. No judgement, no prose reading.
// usage: node score.mjs <arm-dir> <transcript.jsonl>
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const [armDir, transcript] = process.argv.slice(2);
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
for (const f of subFiles) {
  const sub = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const uses = [];
  for (const e of sub) {
    if (e.type !== 'assistant') continue;
    for (const c of e.message?.content ?? []) if (c.type === 'tool_use') uses.push(c);
  }
  scanUses(uses);
}

// 3-5. the incident entry the run wrote
const logPath = path.join(armDir, 'docs', 'LESSONS.md');
let entry = '';
if (fs.existsSync(logPath)) {
  const body = fs.readFileSync(logPath, 'utf8');
  const heads = [...body.matchAll(/^## /gm)].map((m) => m.index);
  const first = heads[0] ?? 0;
  entry = body.slice(first, heads[1] ?? body.length);
}
const rankHits = [...entry.matchAll(/mechanism\s+(\d{1,2})\b/gi)].map((m) => Number(m[1]));
const sweepCommand = /`[^`]*\b(grep|rg|git|node|npm)\b[^`]*`/.test(entry);
const PRIOR = ['2026-02-09', '2026-04-02', '2026-06-11'];
const priorCited = PRIOR.filter((d) => entry.includes(d)).length;

// 6-8. outcome, measured by running the code
const sh = (cmd, args) => {
  try { return { ok: true, out: execFileSync(cmd, args, { cwd: armDir, encoding: 'utf8' }) }; }
  catch (e) { return { ok: false, out: (e.stdout ?? '') + (e.stderr ?? '') }; }
};
const suite = sh('npm', ['test']);
const repro = sh('node', ['-e', `
import('./src/report/weekly.js').then((w) => {
  const rows = [
    { at: '2026-02-27T08:00:00Z', id: '1', actor: 'a' },
    { at: '2026-02-30T09:30:00Z', id: '2', actor: 'b' },
    { at: '2026-02-30T11:00:00Z', id: '3', actor: 'c' },
  ];
  const days = w.weeklyReport(rows).map((r) => r.day);
  console.log(JSON.stringify(days));
}).catch((e) => { console.log('THREW'); });`]);
const daysMatch = repro.out.match(/\[.*\]/);
const days = daysMatch ? daysMatch[0] : null;
const datesSrc = fs.existsSync(path.join(armDir, 'src/dates.js'))
  ? fs.readFileSync(path.join(armDir, 'src/dates.js'), 'utf8') : '';

console.log(JSON.stringify({
  arm: path.basename(armDir),
  fired,
  completed: done,
  refs_opened: [...refs].sort(),
  subagent_transcripts: subFiles.length,
  rank_cited: rankHits.length > 0,
  ranks: rankHits,
  sweep_names_command: sweepCommand,
  prior_incidents_cited: priorCited,
  suite_green: suite.ok,
  symptom_days: days ?? 'repro did not run',
  symptom_fixed: days === null ? 'unknown' : !days.includes('2026-02-30'),
  roundtrip_present: /toISOString\(\)[\s\S]{0,80}slice\(0,\s*10\)/.test(datesSrc),
  guard_count: (datesSrc.match(/return null;/g) ?? []).length,
}, null, 2));
