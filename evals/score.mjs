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
import {
  entriesIn, labelOf, BUCKETS, LEVELS, MEMBER_DISPOSITIONS, NOT_A_MEMBER,
  ticketPattern, runCommand, vetCommand, themeMemberRows, fieldOf, splitSearchLine,
  touchedFiles, untrackedFiles,
} from '../plugins/learn-from-bugs/hooks/ledger-gate.mjs';

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
// A theme-block fixture (a periodic read across incidents) has member rows and
// a Window: line, not prior rows and an instance, so it cannot carry
// expected_same_theme/expected_instance and is graded on a different required
// set. `kind` is read from the key itself; absent or anything but "theme"
// means the original incident shape, unchanged.
const kind = key.kind === 'theme' ? 'theme' : 'incident';
const REQUIRED_FIELDS = kind === 'theme'
  // A theme block carries no Level: line, so expected_level is not measurable
  // on a theme fixture and is optional there (run 11: both skill arms scored
  // level null on a correct entry). Present, it is still held to LEVELS.
  ? ['expected_bucket', 'expected_bucket_members', 'expected_decoys', 'expected_window_count', 'expected_block']
  : ['expected_same_theme', 'expected_instance', 'expected_level', 'expected_bucket'];
for (const f of REQUIRED_FIELDS) {
  if (key[f] === undefined) { console.error(`${answerKey}: the json block has no ${f}`); process.exit(2); }
}
if (kind === 'theme') {
  if (!BUCKETS.includes(key.expected_bucket)) {
    console.error(`${answerKey}: expected_bucket "${key.expected_bucket}" is not one of ${BUCKETS.join(', ')}`);
    process.exit(2);
  }
  if (key.expected_level !== undefined && !LEVELS.includes(key.expected_level)) {
    console.error(`${answerKey}: expected_level "${key.expected_level}" is not one of ${LEVELS.join(', ')}`);
    process.exit(2);
  }
}
// A key row is "YYYY-MM-DD <fragment>". The date is the half an arm without a
// block still writes, so recall reads that; the fragment is what makes the row
// resolve to one entry rather than to a day, and it is kept for the report.
const expected = (key.expected_same_theme ?? []).map((row) => {
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
    // stdio's stderr leg is 'ignore', the way ledger-gate.mjs's own
    // touchedFiles/gitReachable already run git: when the log has no commit
    // yet, `git log` returns nothing, `.pop()` is undefined, and `git show
    // undefined:...` fails as designed -- but it printed `fatal: invalid
    // object name 'undefined'.` to stderr first, which read as a failure in
    // an arm's own log even though the catch below handles it correctly
    // (2026-09-11 re-verdict N5, visible in probe P4b).
    const first = execFileSync('git', ['log', '--format=%H', '--', `docs/${LOG_NAME}`],
      { cwd: armDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\n').filter(Boolean).pop();
    const shipped = execFileSync('git', ['show', `${first}:docs/${LOG_NAME}`],
      { cwd: armDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    entryIsNew = !shipped.includes(entryHeading);
  } catch { entryIsNew = null; }
}
// Theme fixtures only: re-isolate the entry with the gate's own heading
// grammar (entriesIn) rather than the loose `^## ` scan above, since a theme
// answer key is new to this scorer and there is no existing behaviour on this
// path to preserve. Incident fixtures never take this branch, so entry and
// entryHeading are untouched for them.
let entriesInLog = null;
if (kind === 'theme' && fs.existsSync(logPath)) {
  const gateEntries = entriesIn(fs.readFileSync(logPath, 'utf8'));
  entriesInLog = gateEntries.length;
  if (gateEntries.length > 0) {
    // Every theme signal used to read entriesIn(log)[0], the first entry by
    // file position rather than by date. An arm that appended an incident
    // entry and then its theme entry -- the log header says "Newest first",
    // so a compliant arm prepends -- was graded entirely on the entry it
    // wrote first, with the correct theme entry sitting ungraded below it
    // (probe P5). Select the newest by heading date instead; on a tie, the
    // first by position (Array#reduce only replaces on strictly-later dates).
    const newest = gateEntries.reduce((best, e) => (!best || e.date > best.date ? e : best), null);
    entry = newest.body;
    entryHeading = `${newest.date} — ${newest.title}`;
  }
}

// 5. the block, if there is one
const blockStart = entry.match(/^(?:Class|Theme):[ \t]*.*$/m);
const block = blockStart ? entry.slice(blockStart.index) : null;
const field = (name) => {
  if (!block) return null;
  const m = block.match(new RegExp(`^${name}:[ \\t]*(.*)$`, 'm'));
  return m ? m[1].trim() : null;
};
// Read body-wide, not scoped to the Class:/Theme:-anchored `block` slice: the
// gate itself places no ordering requirement on where a Priors: row sits
// relative to Class:, so scoping this read to `block` silently dropped a
// gate-accepted row placed above the anchor line (review F2, backlog-read
// probe P3 found the same class of bug in landedRanks/landedTails below).
const priorRows = [...entry.matchAll(/^- (\d{4}-\d{2}-\d{2})[ \t]+(.*):[ \t]*([a-z-]+)\s*$/gm)]
  .map((m) => ({ date: m[1], fragment: m[2].trim(), disposition: m[3] }));
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
// Body-wide, same reason as priorRows above: a gate-accepted Landed: row
// written above the block's anchor line used to score as absent.
const landedTails = [...entry.matchAll(/^Landed:[ \t]*\d{1,2}\b(.*)$/gm)].map((m) => m[1].split(',').pop().trim());
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
// Body-wide, same reason as priorRows above (backlog-read probe P3: a
// gate-accepted entry with Landed: written above Theme: scored
// landed_mechanisms: [] while bucket, level, block_kind and the member rows
// all still scored correctly, reading as a correct arm that landed nothing).
const landedRanks = [...entry.matchAll(/^Landed:[ \t]*(\d{1,2})\b/gm)].map((m) => Number(m[1]));

// 8. theme-block signals. Only computed, and only added to the output, when
// the answer key says kind: "theme" — an incident-kind run (the default)
// takes none of this, so its key set and its values are unchanged. Fields are
// read body-wide via the gate's own `fieldOf` export, the same way the gate
// itself reads them (it places no requirement on field order), rather than
// through the `field()` closure above, which is scoped to `block` and
// disagrees with the gate on a placement the gate accepts — see the
// backlog-read review, F2. Member rows and the Window/Sweep arrow grammar
// likewise come from the gate's exports (`themeMemberRows`, `splitSearchLine`)
// rather than a second copy of either (review F5).
let themeSignals = {};
if (kind === 'theme') {
  // block_kind: theme | incident | none. A `Theme:` word in prose is not a
  // theme block; the line has to sit at column 0 (the same anchor `fieldOf`
  // itself reads fields from) and a `Window:` line has to follow it, or the
  // signal would fire on the no-skill arm's narrative rather than on the
  // block the skill writes. Mirrors `validateEntry`'s own
  // `field('Theme') !== null` / `field('Class') !== null` selection — there is
  // no gate export for the selection itself, only for the field read it is
  // built from.
  const hasThemeField = fieldOf(entry, 'Theme') !== null;
  const hasClassField = fieldOf(entry, 'Class') !== null;
  // Window: is read the same way the gate reads it -- body-wide via fieldOf,
  // with no requirement on where it sits relative to Theme:. An earlier
  // version of this check scoped the read to a slice starting at the Theme:
  // line, which missed a gate-accepted entry that wrote Window: above
  // Theme: (2026-09-11 re-verdict N4 -- the same F2 class already fixed for
  // landedRanks/landedTails/priorRows above, found here on the same day by
  // the fix that was supposed to close it). The column-0 anchor on Theme: is
  // still necessary and not sufficient on its own: the Window: value still
  // has to parse as a backticked command under the gate's own
  // splitSearchLine, or a pure narrative that happens to open a `Theme:`
  // line and a `Window:` line of ordinary prose scores block_kind: theme,
  // which then also flips member_recall into block mode where a narrative
  // has no rows (probe P8).
  const windowField = fieldOf(entry, 'Window');
  const windowLineIsCommand = windowField !== null && splitSearchLine(windowField) !== null;
  const blockKind = hasThemeField && windowLineIsCommand ? 'theme'
    : hasClassField ? 'incident' : 'none';

  // window_ran: the Window: command is parsed with the gate's own arrow
  // grammar (splitSearchLine) and re-run, in the arm dir, with the gate's own
  // vetCommand and runCommand, and the stated count is checked against the
  // line count the command actually returned, not trusted from the entry's
  // own prose.
  let windowRan = false, windowCount = null;
  if (windowField) {
    const parsed = splitSearchLine(windowField);
    if (parsed && !vetCommand(parsed.cmd)) {
      const r = runCommand(parsed.cmd, armDir);
      if (r.ok) {
        windowCount = r.out.split('\n').filter((l) => l.trim() !== '').length;
        const stated = [...parsed.observation.matchAll(/\b(\d+)\b/g)].map((m) => Number(m[1]));
        windowRan = stated.includes(windowCount);
      }
    }
  }

  // bucket / level / critic: read body-wide, the way the gate reads them, so
  // a gate-accepted field placement scores instead of reading null because it
  // sits above the block-detection anchor. bucket_in_prose keeps reading the
  // pre-block prose slice as it always has — that signal is about narrative
  // mentions, not a field read, and is unaffected by F2.
  const themeBucket = fieldOf(entry, 'Bucket');
  const themeLevel = fieldOf(entry, 'Level');
  const themeCritic = fieldOf(entry, 'Critic');
  // Prose is "everything before the block" only when there is a genuine
  // block (blockKind === 'theme'); a stray column-0 Theme:/Window: pair with
  // no real block (P8) is not a block boundary, so the whole entry is prose.
  const prose = blockKind === 'theme' && blockStart ? entry.slice(0, blockStart.index) : entry;
  // Pick the bucket word by last mention, not by BUCKETS array order. The
  // array is ['missing', 'unread', 'unrecorded', 'misunderstood', 'none'],
  // so an entry naming unread as the finding and also writing the ordinary
  // sentence "the requirement was missing from the description" used to
  // report bucket_in_prose: missing -- the first array member the text
  // contains, not the word the entry argues for (probe P1a; "none", last in
  // the array, does not mask anything the same way -- probe P9). Last
  // mention of any bucket word wins instead.
  //
  // Residual, why this is reported rather than scored (2026-09-11 re-verdict
  // B2): last mention swapped an array-order bias for a position bias, not
  // a fix. The same P1a entry with its closing sentence rewritten "In each
  // case it was missing from the description" -- ordinary phrasing, moved to
  // the end -- reports `missing` again, because "missing" is now simply the
  // later mention. Any bucket word placed after the one the entry argues
  // for wins the same way "missing" did before.
  const pickBucketWord = (text) => {
    let found = null, latest = -1;
    for (const b of BUCKETS) {
      const re = new RegExp(`\\b${b}\\b`, 'ig');
      let m, last = -1;
      while ((m = re.exec(text))) last = m.index;
      if (last > latest) { latest = last; found = b; }
    }
    return found;
  };
  const bucketInProse = pickBucketWord(prose);

  // member_recall / decoys_misfiled: rows come from themeMemberRows(entry),
  // the gate's own anchor/close/row-region parse, read body-wide the same way
  // fieldOf is — not a second copy of `validateThemeEntry`'s region logic. A
  // no-block entry falls back to ids inside a paragraph naming the bucket
  // word, and reports which mode it used.
  //
  // The mode gate used to be `if (block)` -- any column-0 Class:/Theme: line
  // anywhere in the entry, the same over-eager anchor block_kind had (P8).
  // A pure narrative carrying a stray Theme:/Window: pair with no real block
  // was read in block mode, where a narrative has no member rows, and scored
  // member_recall: 0 regardless of what it said. Gate on the validated
  // blockKind instead, so prose mode is used whenever there is no real block.
  const idPattern = new RegExp(ticketPattern().source.replace(/^\^/, '').replace(/\$$/, ''), 'g');
  let claimedIds = [];
  let dismissedIds = [];
  let memberRecallMode;
  if (blockKind === 'theme') {
    memberRecallMode = 'block';
    const { rows } = themeMemberRows(entry);
    claimedIds = rows.filter((r) => MEMBER_DISPOSITIONS.includes(r.caught) && r.caught !== NOT_A_MEMBER).map((r) => r.key);
    dismissedIds = rows.filter((r) => r.caught === NOT_A_MEMBER).map((r) => r.key);
  } else {
    memberRecallMode = 'prose';
    const bucketWord = pickBucketWord(entry);
    if (bucketWord) {
      // Paragraph-scoped, not sentence-scoped: the old split on /(?<=[.!?])
      // \s+/ put a bullet list under the sentence naming the bucket word in
      // a different chunk from that sentence, so an entry naming the bucket
      // and then listing its members as bullets scored member_recall: 0
      // (probe P1c). A paragraph (text between blank lines) is the unit
      // instead, so a list directly under the naming sentence, with no blank
      // line between them, is read together with it.
      //
      // That alone still missed the more common Markdown form: a bullet
      // list set off from its introducing sentence by a blank line, which
      // the paragraph split itself puts in a different paragraph (2026-09-11
      // re-verdict B3, probe run5 A2 -- the same under-count P1c named,
      // reached by the more ordinary of the two spacings). If the paragraph
      // right after the one naming the bucket is nothing but list items,
      // read it together with the naming paragraph too. This does not chase
      // every spacing a list could use; it is the cheap width that reaches
      // the common one, not a claim the read is now exhaustive -- prose mode
      // is a reported lead, not a scored signal, below.
      const bucketRe = new RegExp(`\\b${bucketWord}\\b`, 'i');
      const paragraphs = entry.split(/\n\s*\n/);
      const isListParagraph = (p) => {
        const lines = p.trim().split('\n').map((l) => l.trim()).filter(Boolean);
        return lines.length > 0 && lines.every((l) => /^[-*–—•]\s+/.test(l));
      };
      for (let i = 0; i < paragraphs.length; i += 1) {
        if (!bucketRe.test(paragraphs[i])) continue;
        for (const m of paragraphs[i].matchAll(idPattern)) claimedIds.push(m[0]);
        const next = paragraphs[i + 1];
        if (next && isListParagraph(next)) {
          for (const m of next.matchAll(idPattern)) claimedIds.push(m[0]);
        }
      }
    }
  }
  const claimedSet = new Set(claimedIds);
  const dismissedSet = new Set(dismissedIds);
  const expectedMembers = key.expected_bucket_members ?? [];
  const expectedDecoys = Object.keys(key.expected_decoys ?? {});
  const memberHits = expectedMembers.filter((id) => claimedSet.has(id));
  const decoyHits = expectedDecoys.filter((id) => claimedSet.has(id));
  const memberRecall = expectedMembers.length === 0 ? null
    : Number((memberHits.length / expectedMembers.length).toFixed(2));
  const decoysMisfiled = decoyHits.length;
  // decoysMisfiled alone cannot separate "no decoy is named" from "every
  // decoy was read and dismissed" -- both score 0. themeMemberRows already
  // returns the not-a-member rows (dismissedIds above); intersect those with
  // the key's own decoys instead of leaving dismissal unmeasured.
  const decoysDismissed = expectedDecoys.filter((id) => dismissedSet.has(id)).length;
  // Flag the arm that names every ticket a member: recall 1.0 with decoys 0
  // cannot both hold there, since the decoys would be counted too. (The
  // symmetric "assert the two sum ≤ 12" does not belong here: memberHits and
  // decoyHits are both filters over the key's own disjoint six-and-six sets,
  // so the sum can never exceed 12 by construction and that assertion could
  // never fail.)
  const universe = expectedMembers.length + expectedDecoys.length;
  const sumCheckFlag = memberHits.length + decoysMisfiled === universe;

  // symptom_tally_as_finding: the entry's first paragraph is read for any
  // symptom label from the fixture's own closed label set, plus the
  // plain-English form of a11y (the one abbreviation this domain writes both
  // ways). No title-word branch: review F1 found the distinctive-title-word
  // set was 57 words wide and mostly stopwords ("that", "with", "export",
  // "found"...), so it fired on two of the four hand entries (everything.md
  // on "export", prose-only.md on "that") and, in the other direction, missed
  // a real symptom tally naming its symptom with a word that happens to
  // appear in two or more titles. The label set is the fixture's own closed
  // vocabulary and is what the pre-registration actually names.
  //
  // This detector, bucket_in_prose, prose-mode member_recall and
  // rate_observation_as_finding are reported, not scored (2026-09-11
  // re-verdict, replacing further heuristic repair on any of the three). A
  // hand-picked subject-or-tally narrowing below still passes only the three
  // sentences it was written against and fires on their neighbours in the
  // same register (B1: "The bug reports cluster into one shape rather than
  // twelve" still scores true, a leading article satisfying the same subject
  // branch as no article at all). Last-mention bucket-word selection swapped
  // an array-order bias for a position bias and still names the wrong bucket
  // on an ordinary closing sentence (B2: "...it was missing from the
  // description," moved to the end of the same entry P1a already used, still
  // reports `missing`). And member_recall's paragraph-scoped id read still
  // depends on how the author spaced a list under the naming sentence, not
  // on what the list says (B3: a blank line before an otherwise identical
  // bullet list drops recall from 0.83 to 0, even after the fix below). None
  // of the three is a check a five-minute probe cannot refute by rewording,
  // which is exactly what a scored field must not be. Read as leads a person
  // confirms against the entry, via `reported` below and the answer key's
  // Hand-graded section, never as a verdict.
  //
  // The label set ranges over this file. Without it, the detector silently
  // ranges over nothing: symptom.md scored a clean `false` in an arm whose
  // tickets.jsonl was not at the root, with nothing said about why (probe
  // P12). window_ran degrades visibly to false in the same situation; this
  // did not, so it fails loudly instead of grading a theme key against an
  // empty set.
  const ticketsPath = path.join(armDir, 'tickets.jsonl');
  if (!fs.existsSync(ticketsPath)) {
    console.error(`${ticketsPath} does not exist, and a theme key's symptom_tally_as_finding cannot be graded without the label set it reads from`);
    process.exit(2);
  }
  const labels = new Set();
  for (const line of fs.readFileSync(ticketsPath, 'utf8').split('\n').filter(Boolean)) {
    let t;
    try { t = JSON.parse(line); } catch { continue; }
    for (const lab of t.labels ?? []) labels.add(String(lab).toLowerCase());
  }
  const LABEL_SYNONYMS = { a11y: 'accessibility' };
  const afterHeading = entry.split('\n').slice(1).join('\n');
  const firstParagraph = afterHeading.split(/\n\s*\n/)[0] ?? '';
  // Note (P10, not fixed here): an entry with no blank line makes this
  // "first paragraph" the whole entry, block included, which widens the scan
  // into the block's own field lines. No standalone false positive was found
  // from it against a real entry -- it amplifies the three below rather than
  // being its own defect.
  //
  // A label that is also ordinary English in this domain ("bug", "ux" and
  // "security" all fired on prose that never meant the fixture's label --
  // "Not one of these is a bug in the usual sense" (P2d), "This is not a UX
  // problem" (P2e), "...from a security tab left open to a mobile filter
  // bar..." (P2b)) counts only when it reads as the sentence's own subject
  // or sits inside a tally shape ("N tickets", "N of", "most of our"), not
  // merely present anywhere in the sentence. The label set itself is
  // unchanged; the read is narrower. This does not reach a real tally that
  // uses vocabulary outside the label set entirely, such as "Requirements
  // gaps are our biggest cluster this half" (probe P2c) -- that needs the
  // detector to stop being a label lookup, which is a larger change than
  // this fixture's build calls for.
  const isSubjectOrTally = (word, sentence) => {
    const trimmed = sentence.trim();
    const subjectRe = new RegExp(
      `^(?:the |a |an |this |these |those |most(?: of (?:our|the))? |\\d+(?:\\.\\d+)?%? |two |three |four |five |six |seven |eight |nine |ten |eleven |twelve )?${word}s?\\b`, 'i');
    if (subjectRe.test(trimmed)) return true;
    const tallyRe = new RegExp(
      `\\b\\d+(?:\\.\\d+)?%?\\s+(?:of\\s+(?:our|the)\\s+)?${word}\\b|\\b${word}\\b[^.!?]{0,30}\\b\\d+(?:\\.\\d+)?%?\\b|\\bmost of (?:our|the)\\s+${word}\\b`, 'i');
    return tallyRe.test(trimmed);
  };
  // Residual, why this stays reported rather than regaining a "Fixed" label
  // (2026-09-11 re-verdict B1): the subject branch's leading article is
  // optional, so "The bug reports cluster into one shape rather than
  // twelve" still opens with an article immediately before the label and
  // still matches -- the rule the row names ("subject or tally, not bare
  // presence") is not what the regex enforces, which is "label within the
  // first few words, article or not".
  const firstParagraphSentences = firstParagraph.split(/(?<=[.!?])\s+/);
  let symptomMatch = null;
  for (const label of labels) {
    const hit = firstParagraphSentences.find((s) => new RegExp(`\\b${label}\\b`, 'i').test(s) && isSubjectOrTally(label, s));
    if (hit) { symptomMatch = label; break; }
    const syn = LABEL_SYNONYMS[label];
    const synHit = syn && firstParagraphSentences.find((s) => new RegExp(`\\b${syn}\\b`, 'i').test(s) && isSubjectOrTally(syn, s));
    if (synHit) { symptomMatch = `${label} ("${syn}")`; break; }
  }
  const symptomLabelSet = [...labels].sort();

  // rate_observation_as_finding: the other not-a-pass shape ANSWER-KEY.md
  // names ("8 of 12 reopened, QA needs to test earlier") — a reopen-rate
  // observation, which the label set does not reach since "reopen" is not a
  // symptom label. Narrow and separate rather than folded into the label
  // check: two named detectors beat one wide one. A rate is a proportion, so
  // the numeral has to be one: "N of M", "N/M" or "N%". Any bare digit beside
  // the word fired on the fixture's own correct answer once "six" was written
  // as "6" (review R1), and a correct arm is likely to write both, since the
  // reopen comment is the answer key's discriminator.
  const rateObservation = /\breopen(?:ed|s)?\b/i.test(firstParagraph)
    && (/\b\d+\s*(?:of|out of|\/)\s*\d+\b/.test(firstParagraph)
      || /\b\d+(?:\.\d+)?\s*%/.test(firstParagraph));

  // landed_mechanism_hit: does any Landed: row claim one of the mechanisms
  // ANSWER-KEY.md's expected_landed_mechanism names (6 relocation, or its
  // companion 4). landed_mechanisms (below) is the raw claim; this is its
  // correctness companion, the way block_kind and window_count already have
  // one.
  const landedMechanismHit = landedRanks.some((n) => (key.expected_landed_mechanism ?? []).includes(n));

  // critic_unsupported: "Critic: ran" with no agent transcript discovered
  // for this session is a claim nothing binds. PREREGISTRATION.md's own row
  // said "assert together", which is an instruction to a human reader;
  // subagent_transcripts and critic were emitted as two separate fields with
  // no conjunction computed between them. One field makes it mechanical.
  const criticUnsupported = themeCritic === 'ran' && subFiles.length === 0;

  // landed_referents_touched: the gate's own touched-file question
  // (touchedFiles, a three-step fallback: uncommitted work, else everything
  // changed since the log was last committed, else the HEAD commit — and it
  // excludes the log file itself), not a raw `git status --porcelain`, which
  // only ever answers step one. Mirrors the one-line touched-set combine
  // `landedRows` itself does around `touchedFiles`/`untrackedFiles`.
  const gateTouched = touchedFiles({ cwd: armDir, logPath });
  const gateUntracked = untrackedFiles({ cwd: armDir });
  const gateTouchedSet = new Set(gateTouched.length ? [...gateTouched, ...gateUntracked] : []);
  const landedReferentsTouchedGate = expectedReferents.filter((p) => gateTouchedSet.has(p));

  // `reported`: bucket_in_prose, prose-mode member_recall (with
  // member_recall_mode alongside it), symptom_tally_as_finding (with its
  // match field) and rate_observation_as_finding, nested rather than flat
  // (2026-09-11 re-verdict). The comment above symptom_tally_as_finding
  // names the three probes (B1, B2, B3) that keep these from being verdicts.
  // Block-derived signals -- bucket, level, member_recall in block mode,
  // decoys_misfiled, decoys_dismissed, landed_mechanisms and everything
  // gate-sourced -- read a field or a row region the gate itself validates,
  // and stay scored at the top level, unaffected.
  //
  // member_recall in block mode is the scored top-level field; in prose mode
  // the number moves here instead of the top level reading a value nothing
  // has verified.
  // decoys_misfiled and sum_check_flag come from the same claimed set as
  // member_recall, so in prose mode they are prose-derived too and move here
  // with it (second re-verdict, C1). Leaving them scored gave a block-less
  // narrative a top-level decoys_misfiled of 6 beside a member_recall of null.
  const proseMode = memberRecallMode === 'prose';
  const reported = {
    bucket_in_prose: bucketInProse,
    member_recall: proseMode ? memberRecall : null,
    member_recall_mode: memberRecallMode,
    decoys_misfiled: proseMode ? decoysMisfiled : null,
    sum_check_flag: proseMode ? sumCheckFlag : null,
    symptom_tally_as_finding: symptomMatch !== null,
    symptom_match: symptomMatch,
    rate_observation_as_finding: rateObservation,
  };

  themeSignals = {
    block_kind: blockKind,
    block_kind_correct: blockKind === key.expected_block,
    window_ran: windowRan,
    window_count: windowCount,
    window_count_correct: windowCount === key.expected_window_count,
    bucket: themeBucket,
    // null, not false, where there is no block: an absent answer is not a
    // wrong one, and false read as wrong on every block-less arm.
    bucket_correct: themeBucket === null ? null : themeBucket === key.expected_bucket,
    level: themeLevel,
    level_correct: key.expected_level === undefined ? 'not_applicable'
      : themeLevel === null ? null : themeLevel === key.expected_level,
    member_recall: proseMode ? null : memberRecall,
    decoys_misfiled: proseMode ? null : decoysMisfiled,
    decoys_dismissed: decoysDismissed,
    sum_check_flag: proseMode ? null : sumCheckFlag,
    symptom_label_set: symptomLabelSet,
    reported,
    landed_mechanisms: landedRanks,
    landed_mechanism_hit: landedMechanismHit,
    landed_referents_touched: landedReferentsTouchedGate,
    critic: themeCritic,
    critic_unsupported: criticUnsupported,
    theme_label: fieldOf(entry, 'Theme') ? labelOf(fieldOf(entry, 'Theme')) : null,
    entries_in_log: entriesInLog,
    // gate_live: whether the skill fired at all in this arm. A `false` row was
    // never offered to the live gate (the no-skill arm disables the plugin),
    // so its shape says nothing about whether the gate would accept it — a
    // reader should not read gate-shaped fields on such a row as a verdict on
    // the gate.
    gate_live: fired !== 'none',
    // Incident-only fields, reported honestly rather than as a confident
    // `false`: the theme path carries no Instance: line and no Priors: rows,
    // so `instance_correct` (etc.) comparing null to null is not a fact about
    // this arm, it is an artifact of asking an incident-shaped question of a
    // theme-shaped entry.
    instance: 'not_applicable',
    instance_correct: 'not_applicable',
    same_theme_dates: 'not_applicable',
    same_theme_recall: 'not_applicable',
    same_theme_missed: 'not_applicable',
  };
}

const output = {
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
  ...themeSignals,
};
console.log(JSON.stringify(output, null, 2));
