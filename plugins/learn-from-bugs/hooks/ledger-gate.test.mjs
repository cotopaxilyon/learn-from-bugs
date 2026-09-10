// Every deny code is watched firing here before it is kept, per SKILL.md step 5.
// usage: node --test plugins/learn-from-bugs/hooks/ledger-gate.test.mjs
// The live drive through Claude Code is evals/drive-ledger-gate.sh; this file
// covers the script, not the wiring.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { decide, validateEntry, nominate, newEntries, vetCommand, observationMatches, touchedFiles, untrackedFiles, ticketPattern, mintShapeFault, gitReachable, gitHasHistory, repoRoot, requireCwd, logNameFrom, runCommand, ALLOWED } from './ledger-gate.mjs';

const LOG = `# Lessons

## 2026-06-11 — A malformed timestamp put rows under a bucket headed "undefined"

Body. Class: input validation.

## 2026-04-02 — The CSV export returned a 500 for one feed

Body. Class: type coercion at a boundary.

## 2026-02-09 — The activity heading read "Activity for null"

Body.
Class: null safety
`;

// The repo() helper writes src/dates.js with a line containing "fmtDayKey", so
// the Sweep grep below returns exactly one line and the observation matches.
const GOOD = `## 2026-09-03 — A calendar-invalid day became a report heading

**What happened.** Body.

Class: new — the three priors each hardened one guard; the class is the convention that malformed inputs live in a hand-written list
Instance: 4
Level: convention
Bucket: unrecorded
Not one up: process would mean a phase or a role, and this convention is owned by one test file, so the fix is the file
Sweep: \`grep -rn "fmtDayKey" src/\` → 1 call site, src/dates.js
Priors: \`git log --date=short --format=%ad -- src/dates.js\` → 3 nominated
- 2026-06-11 malformed timestamp: same-theme
- 2026-04-02 CSV export: same-theme
- 2026-02-09 activity heading: same-theme
Landed: 2 round-trip test at the calendar boundary, red: fails on 2026-02-30 before the fix
Landed: 3 test/dates.test.js header names the convention
Critic: ran
`;

const headingsOf = (text) => [...text.matchAll(/^## (\d{4}-\d{2}-\d{2})\s*[\u2014\u2013-]\s*(.+)$/gm)]
  .map((m) => ({ date: m[1], title: m[2].trim() }));
const nomDates = (args) => nominate(args).map((e) => e.date);

function codes(out) {
  if (!out) return [];
  const r = out.hookSpecificOutput?.permissionDecisionReason ?? out.systemMessage ?? '';
  return [...r.matchAll(/\[([a-z_]+)\]/g)].map((m) => m[1]);
}

// A temp repo so the on-disk log, git nomination, and sweep execution are real.
// commitTouched: commit the touched files after the scaffold, as an agent that
// fixes and commits before writing the entry does.
// commitLogAt: commit the log too, at that step, so the since-last-log-commit
// branch of touchedFiles has a boundary to measure from.
function repo({ log = LOG, touch = [], backdate = {}, commitTouched = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lfb-'));
  const env = { ...process.env, GIT_AUTHOR_DATE: '2026-01-12T12:00:00Z', GIT_COMMITTER_DATE: '2026-01-12T12:00:00Z' };
  const git = (args, e = env) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: e });
  git(['init', '-q']);
  git(['config', 'user.email', 't@t']);
  git(['config', 'user.name', 't']);
  fs.mkdirSync(path.join(dir, 'docs'));
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'docs/LESSONS.md'), log);
  fs.writeFileSync(path.join(dir, 'src/dates.js'), 'export function fmtDayKey() {}\n');
  fs.writeFileSync(path.join(dir, 'src/other.js'), 'v0\n');
  git(['add', '.']);
  git(['commit', '-q', '-m', 'scaffold']);
  for (const [file, dates] of Object.entries(backdate)) {
    for (const d of dates) {
      fs.appendFileSync(path.join(dir, file), `// ${d}\n`);
      git(['add', file]);
      git(['commit', '-q', '-m', `fix ${d}`], { ...process.env, GIT_AUTHOR_DATE: `${d}T12:00:00Z`, GIT_COMMITTER_DATE: `${d}T12:00:00Z` });
    }
  }
  for (const f of touch) fs.appendFileSync(path.join(dir, f), '// working change\n');
  if (commitTouched) {
    git(['add', '.']);
    git(['commit', '-q', '-m', 'the fix'], { ...process.env, GIT_AUTHOR_DATE: '2026-09-03T12:00:00Z', GIT_COMMITTER_DATE: '2026-09-03T12:00:00Z' });
  }
  return dir;
}
const write = (dir, content) => ({ tool_name: 'Write', cwd: dir, tool_input: { file_path: path.join(dir, 'docs/LESSONS.md'), content } });
// logPath alongside cwd, the way decide() calls it. validateEntry now refuses
// the pair without it rather than falling back to HEAD, which is how a helper
// quietly tested a configuration production never produces.
const logIn = (dir) => (dir ? path.join(dir, 'docs/LESSONS.md') : null);
const v = (dir, body, nominated = []) => validateEntry({ date: 'd', title: 't', body }, { onDisk: LOG, nominated, cwd: dir, logPath: logIn(dir) }).map((f) => f.code);

test('a complete entry passes, with its sweep executed', () => {
  const dir = repo();
  assert.equal(decide(write(dir, LOG + '\n' + GOOD)), null);
});

test('re-saving existing entries without a block passes (grandfathered)', () => {
  const dir = repo();
  assert.equal(decide(write(dir, LOG + '\nfootnote\n')), null);
});

test('retitling an existing entry is not a new entry; a second entry on the same day is', () => {
  const retitled = LOG.replace('headed "undefined"', 'headed undefined');
  assert.equal(newEntries({ toolName: 'Write', toolInput: { content: retitled }, onDisk: LOG }).length, 0);
  assert.equal(newEntries({ toolName: 'Edit', toolInput: { old_string: '## 2026-06-11 — A malformed timestamp put rows under a bucket headed "undefined"', new_string: '## 2026-06-11 — A malformed timestamp put rows under a bucket headed undefined' }, onDisk: LOG }).length, 0);
  const second = LOG.replace('# Lessons\n', '# Lessons\n\n## 2026-06-11 — Another thing that day\n\nBody.\n');
  const n = newEntries({ toolName: 'Write', toolInput: { content: second }, onDisk: LOG });
  assert.equal(n.length, 1);
  assert.equal(n[0].title, 'Another thing that day');
});

test('a new entry with no block is denied on every required field', () => {
  const c = v(null, '## 2026-09-03 — Something broke\n\nProse only.\n');
  assert.ok(c.filter((x) => x === 'deny_missing_field').length >= 6, c.join(','));
});

test('an unknown label is denied; a reused one and a justified new one pass', () => {
  const w = (cls) => v(null, GOOD.replace(/^Class:.*$/m, `Class: ${cls}`));
  assert.ok(w('date handling').includes('deny_class_unknown'));
  assert.ok(!w('Null Safety').includes('deny_class_unknown'));
  // A well-formed mint, since a reason-only one is now refused by mint shape and
  // this test's name would otherwise describe an entry the gate denies.
  assert.ok(!w('new — an unreachable label set; nothing in the log covers it').includes('deny_class_unknown'));
  assert.ok(w('new —').includes('deny_class_unknown'));
});

// The reuse the backward sweep depends on. classLabelsIn dropped every minted
// line, so the set could only grow from a bare label, which the gate refuses
// unless it is already in the set: unreachable by construction.
//
// This runs the trip rather than seeding one end of it: the minting entry is put
// through validateEntry and only appended to the log once the gate has accepted
// it, so a mint the gate would refuse cannot supply the label the reuse then
// reads. Seeding the mint by hand was the first version of this test, and it
// could not see that `new — ; <reason>` is accepted and registers nothing.
function mintThenReuse(mintCls, reuseCls) {
  const minting = GOOD.replace(/^Class:.*$/m, `Class: ${mintCls}`);
  const mintCodes = validateEntry({ date: 'd', title: 't', body: minting }, { onDisk: LOG, nominated: [], cwd: null }).map((f) => f.code);
  if (mintCodes.length) return { mintCodes, reuseCodes: null };
  const log = `${LOG}\n## 2026-08-31 — The minting entry\n\n${minting}`;
  const reuseCodes = validateEntry(
    { date: 'd', title: 't', body: GOOD.replace(/^Class:.*$/m, `Class: ${reuseCls}`) },
    { onDisk: log, nominated: [], cwd: null },
  ).map((f) => f.code);
  return { mintCodes, reuseCodes };
}

test('a label minted through the gate joins the set, so the next entry reuses it bare', () => {
  const label = 'a wired check that cannot fire';
  const mint = `new — ${label}; no label in the log covers a check that is green because it is unreachable`;
  const ok = mintThenReuse(mint, label);
  assert.deepEqual(ok.mintCodes, [], 'the minting entry must itself pass');
  assert.ok(!ok.reuseCodes.includes('deny_class_unknown'));
  assert.ok(!mintThenReuse(mint, 'A Wired Check That Cannot Fire').reuseCodes.includes('deny_class_unknown'));
  assert.ok(mintThenReuse(mint, 'a wired check that never fires').reuseCodes.includes('deny_class_unknown'));
});

// The trip, run against the case a separator-only check let through: the mint is
// accepted, registers nothing, and the reuse is refused for a label the log
// appears to hold. Refusing it at the mint is what keeps the two ends agreeing.
test('a mint the gate accepts always supplies a label the next entry can reuse', () => {
  const r = mintThenReuse('new — ; nothing in the log covers it', 'nothing in the log covers it');
  assert.ok(r.mintCodes.includes('deny_class_mint_shape'), 'an empty label must be refused at the mint');
});

test('minting names a non-empty label before the reason, so there is something to reuse', () => {
  const w = (cls) => v(null, GOOD.replace(/^Class:.*$/m, `Class: ${cls}`));
  assert.ok(w('new — nothing in the log covers it').includes('deny_class_mint_shape'));
  // Carries the separator and no label: passed the first version of this check
  // and registered nothing, which is the whole defect.
  assert.ok(w('new — ; nothing in the log covers it').includes('deny_class_mint_shape'));
  assert.ok(!w('new — an unreachable label set; nothing in the log covers it').includes('deny_class_mint_shape'));
});

test('bucket is closed-set and required', () => {
  const w = (b) => v(null, GOOD.replace(/^Bucket:.*$/m, b === null ? 'Bucket:' : `Bucket: ${b}`));
  assert.ok(w('forgotten').includes('deny_bucket'));
  assert.ok(w(null).includes('deny_missing_field'));
  assert.ok(!w('none').includes('deny_bucket'));
  assert.ok(!w('misunderstood').includes('deny_bucket'));
  const missing = v(null, GOOD.replace(/^Bucket:.*\n/m, ''));
  assert.ok(missing.includes('deny_missing_field'));
});

test('level is closed-set and not-one-up is required below process', () => {
  const w = (lvl, up = true) => v(null, GOOD.replace(/^Level:.*$/m, `Level: ${lvl}`).replace(/^Not one up:.*$/m, up ? 'Not one up: five words are the floor here' : 'Not one up:'));
  assert.ok(w('module').includes('deny_level'));
  assert.ok(w('contract', false).includes('deny_missing_field'));
  assert.ok(!w('process', false).includes('deny_missing_field'));
});

test('instance count must equal same-theme priors plus one', () => {
  const w = (n) => v(null, GOOD.replace(/^Instance:.*$/m, `Instance: ${n}`));
  assert.ok(w(1).includes('deny_instance_count'));
  assert.ok(w('four').includes('deny_instance_count'));
  assert.ok(!w(4).includes('deny_instance_count'));
});

test('a prior not in the log, or with an unknown disposition, is denied', () => {
  assert.ok(v(null, GOOD.replace('- 2026-02-09 activity heading:', '- 2026-02-10 activity heading:')).includes('deny_prior_not_in_log'));
  assert.ok(v(null, GOOD.replace('- 2026-02-09 activity heading: same-theme', '- 2026-02-09 activity heading: related').replace('Instance: 4', 'Instance: 3')).includes('deny_prior_disposition'));
});

test('a git-nominated prior the entry does not dispose of is denied', () => {
  const csv = { date: '2026-04-02', title: 'The CSV export returned a 500 for one feed' };
  assert.ok(v(null, GOOD.replace('- 2026-04-02 CSV export: same-theme\n', '').replace('Instance: 4', 'Instance: 3'), [csv]).includes('deny_prior_not_dispositioned'));
});

// Three of this project's own log days carry more than one entry and one carries
// seven, so these run against a log shaped like the real one rather than the
// one-entry-per-day fixture above.
const DUPE_LOG = `# Lessons

## 2026-04-02 — The CSV export returned a 500 for one feed

Body. Class: type coercion at a boundary.

## 2026-04-02 — The activity heading read "Activity for null"

Body. Class: null safety

## 2026-04-02 — A malformed timestamp put rows under a bucket headed "undefined"

Body. Class: input validation.
`;
const DUPE_HEADINGS = headingsOf(DUPE_LOG);
const withRows = (rows, instance) => GOOD
  .replace(/^- 2026.*\n/gm, '')
  .replace(/^(Priors:.*\n)/m, `$1${rows}`)
  .replace('Instance: 4', `Instance: ${instance}`);
const dupeFails = (rows, instance, nominated = []) => validateEntry(
  { date: 'd', title: 't', body: withRows(rows, instance) },
  { onDisk: DUPE_LOG, nominated, cwd: null },
);
const dupeCodes = (rows, instance, nominated = []) => dupeFails(rows, instance, nominated).map((f) => f.code);

test('a prior row naming only a day is refused, and the deny names the entries on it', () => {
  // The row that started this: "- 2026-04-02: same-theme" against three entries
  // on 2026-04-02 said "one of these three" and was scored as a match.
  const fails = dupeFails('- 2026-04-02: same-theme\n', 2);
  assert.ok(fails.map((f) => f.code).includes('deny_prior_no_slug'), JSON.stringify(fails));
  const detail = fails.find((f) => f.code === 'deny_prior_no_slug').detail;
  for (const t of ['CSV export', 'Activity for null', 'malformed timestamp']) {
    assert.ok(detail.includes(t), `deny text should name "${t}": ${detail}`);
  }
});

test('a slug matching more than one entry on its day is refused', () => {
  assert.ok(dupeCodes('- 2026-04-02 the: same-theme\n', 2).includes('deny_prior_ambiguous'));
  assert.ok(!dupeCodes('- 2026-04-02 CSV export: same-theme\n', 2).includes('deny_prior_ambiguous'));
});

test('a slug matching no entry on its day is refused as not in the log', () => {
  assert.ok(dupeCodes('- 2026-04-02 timezone offset: same-theme\n', 2).includes('deny_prior_not_in_log'));
});

test('every entry on a nominated day must be dispositioned, not just one of them', () => {
  // A precise row against a day-keyed nomination was a check that could not
  // fail: one verdict closed out all three entries sharing the day.
  const one = dupeCodes('- 2026-04-02 CSV export: same-theme\n', 2, DUPE_HEADINGS)
    .filter((c) => c === 'deny_prior_not_dispositioned');
  assert.equal(one.length, 2);
  const all = dupeCodes(
    '- 2026-04-02 CSV export: same-theme\n- 2026-04-02 Activity for null: adjacent\n- 2026-04-02 malformed timestamp: unrelated\n',
    2,
    DUPE_HEADINGS,
  ).filter((c) => c === 'deny_prior_not_dispositioned');
  assert.equal(all.length, 0);
});

test('same-day priors each count toward the instance number, and only once each', () => {
  // Instance is over entries, not lines. Day-keyed, three identical rows were
  // three same-theme priors naming one entry, and the entry-keyed grammar
  // inherited that until a row resolving to an already-disposed entry was
  // refused. The first assertion is the one that was green on both.
  const rows = '- 2026-04-02 CSV export: same-theme\n- 2026-04-02 Activity for null: same-theme\n- 2026-04-02 malformed timestamp: unrelated\n';
  assert.ok(dupeCodes(rows, 2).includes('deny_instance_count'));
  assert.ok(!dupeCodes(rows, 3).includes('deny_instance_count'));
  const doubled = '- 2026-04-02 CSV export: same-theme\n- 2026-04-02 CSV export: same-theme\n';
  assert.ok(dupeCodes(doubled, 3).includes('deny_prior_duplicate'));
  // and the second row does not buy an instance
  assert.ok(dupeCodes(doubled, 3).includes('deny_instance_count'));
  assert.ok(!dupeCodes('- 2026-04-02 CSV export: same-theme\n', 2).includes('deny_instance_count'));
});

test('a row that looks like a prior row and is not one is refused, not dropped', () => {
  // Before 2026-09-09 the strict pattern collected these and nothing else did,
  // so the line vanished and took its claimed prior with it. The entry landed
  // with an Instance the author believed and the gate had never counted.
  // The first version of this detector required a well-formed date before it
  // would call a line a row, so a mistyped date, the commonest way to write a
  // line that looks like a row and is not one, was never examined. It also read
  // only the Priors-to-Landed window while the strict pattern read the whole
  // body, so a broken row outside that window was dropped and its well-formed
  // twin in the same position was honoured. Both halves are covered here.
  const malformed = [
    '- 2026-04-02 CSV export: Same-Theme',
    '- 2026-04-02 CSV export: same-theme2',
    '  - 2026-04-02 CSV export: same-theme',
    '-  2026-04-02 CSV export: same-theme',
    '-2026-04-02 CSV export: same-theme',
    '* 2026-04-02 CSV export: Same-Theme',
    '\u2013 2026-04-02 CSV export: same-theme',
    '- 2026-4-02 CSV export: same-theme',
    '- 2026/04/02 CSV export: same-theme',
  ];
  for (const row of malformed) {
    assert.ok(dupeCodes(row + '\n', 1).includes('deny_prior_malformed'), `not refused: ${row}`);
  }
  // and a well-formed row is not swept up by the same scan
  assert.ok(!dupeCodes('- 2026-04-02 CSV export: same-theme\n', 2).includes('deny_prior_malformed'));
});

test('a malformed row no longer deflates the instance number in silence', () => {
  // The pair that made this findable: the same row spelled two ways was
  // ALLOWED both times, once at Instance 1 and once at Instance 2.
  const bad = dupeCodes('- 2026-04-02 CSV export: Same-Theme\n', 1);
  assert.ok(bad.includes('deny_prior_malformed'));
  assert.ok(!dupeCodes('- 2026-04-02 CSV export: same-theme\n', 2).includes('deny_prior_malformed'));
});

test('a malformed row is refused wherever it sits, not only inside the block window', () => {
  const bad = '- 2026-04-02 CSV export: Same-Theme';
  const withRows = (rows) => GOOD.replace(/^- 2026.*\n/gm, '').replace(/^(Priors:.*\n)/m, `$1${rows}`).replace('Instance: 4', 'Instance: 2');
  const inWindow = withRows('- 2026-04-02 CSV export: same-theme\n' + bad + '\n');
  const above = withRows('- 2026-04-02 CSV export: same-theme\n').replace(/^(Priors:)/m, bad + '\n$1');
  const below = withRows('- 2026-04-02 CSV export: same-theme\n').replace(/^(Critic:)/m, bad + '\n$1');
  for (const [name, b] of [['in', inWindow], ['above Priors:', above], ['after Landed:', below]]) {
    const codes = validateEntry({ date: 'd', title: 't', body: b }, { onDisk: DUPE_LOG, nominated: [], cwd: null }).map((f) => f.code);
    assert.ok(codes.includes('deny_prior_malformed'), `${name}: ${codes.join(',')}`);
  }
});

test('two entries with the identical heading name the log, not the row', () => {
  // No slug separates them, so telling the author to write a better row is
  // advice they cannot follow. The deny says which artifact is wrong.
  const twins = `# Lessons

## 2026-05-05 — A repeated title

Body. Class: null safety

## 2026-05-05 — A repeated title

Body. Class: null safety
`;
  const body = withRows('- 2026-05-05 A repeated title: same-theme\n', 2);
  const fails = validateEntry({ date: 'd', title: 't', body }, { onDisk: twins, nominated: [], cwd: null });
  const amb = fails.find((f) => f.code === 'deny_prior_ambiguous');
  assert.ok(amb, JSON.stringify(fails.map((f) => f.code)));
  assert.match(amb.detail, /identical heading/);
  assert.match(amb.detail, /the log/);
});


// ---- theme entries -------------------------------------------------------
// A theme entry has no single fix diff, so git cannot nominate for it. Its
// members are bound to an executed retrieval instead.
const THEME = (over = {}) => {
  const f = {
    Theme: 'null safety',
    // Three headings in LOG, and the three member rows below name those three,
    // so the retrieval actually reaches the members. The old default was a
    // one-line command carrying three members, which is the defect finding 8 names.
    Window: "`grep -n '^## ' docs/LESSONS.md` → 3 items",
    Count: '3',
    rows: [
      '- 2026-06-11 malformed timestamp: qa',
      '- 2026-04-02 CSV export: user',
      '- 2026-02-09 activity heading: nobody',
    ].join('\n'),
    Bucket: 'unrecorded',
    Landed: 'Landed: 4 the intake template now asks the boundary question, src/dates.js',
    Critic: 'not-run',
    ...over,
  };
  return [
    'Prose about the pattern.', '',
    `Theme: ${f.Theme}`,
    `Window: ${f.Window}`,
    `Count: ${f.Count}`,
    f.rows,
    `Bucket: ${f.Bucket}`,
    f.Landed,
    `Critic: ${f.Critic}`, '',
  ].filter((l) => l !== null).join('\n');
};
// logPath is passed the way decide() passes it. Without it validateEntry takes
// the no-log-path fallback to HEAD, which in this fixture is the scaffold commit
// carrying every file, so the touched set is never empty and the referent rules
// are never really exercised. The helper differing from the production call path
// hid exactly that.
const themeCodes = (dir, over) => validateEntry(
  { date: 'd', title: 't', body: THEME(over) },
  { onDisk: LOG, nominated: [], cwd: dir, logPath: dir ? path.join(dir, 'docs/LESSONS.md') : null },
).map((f) => f.code);

test('a complete theme entry passes, with its window executed', () => {
  const dir = repo({ touch: ['src/dates.js'], backdate: { 'src/dates.js': ['2026-02-09', '2026-04-02'] } });
  assert.deepEqual(themeCodes(dir, {}), []);
});

test('a theme entry carrying Priors: is refused, and the deny says which block it is', () => {
  const dir = repo({ touch: ['src/dates.js'] });
  const body = THEME().replace('Count: 3', 'Priors: `git log` → 0 nominated\nCount: 3');
  const fails = validateEntry({ date: 'd', title: 't', body }, { onDisk: LOG, nominated: [], cwd: dir, logPath: logIn(dir) });
  const p = fails.find((f) => f.code === 'deny_theme_has_priors');
  assert.ok(p, JSON.stringify(fails.map((f) => f.code)));
  assert.match(p.detail, /issue entry with Class:/);
});

test('Count is derived from the rows, not asserted beside them', () => {
  const dir = repo({ touch: ['src/dates.js'] });
  assert.ok(themeCodes(dir, { Count: '2' }).includes('deny_theme_count'));
  assert.ok(themeCodes(dir, { Count: 'three' }).includes('deny_theme_count_shape'));
});

test('the window is executed and its line count must equal the stated number', () => {
  const dir = repo({ touch: ['src/dates.js'] });
  assert.ok(themeCodes(dir, { Window: '`git log -3 --format=%h` → 9 items' }).includes('deny_window_mismatch'));
  assert.ok(themeCodes(dir, { Window: '`git log -3 --format=%h` → several' }).includes('deny_window_mismatch'));
  assert.ok(themeCodes(dir, { Window: '`rm -rf /` → 3 items' }).includes('deny_sweep_command_refused'));
  assert.ok(themeCodes(dir, { Window: 'git log -3' }).includes('deny_sweep_no_command'));
});

test('a member row names one entry, the same key a prior row uses', () => {
  const dir = repo({ touch: ['src/dates.js'] });
  const rows = (r) => ({ rows: r, Count: String(r.split('\n').length) });
  // One code per branch. Sharing deny_member_row meant four of these five
  // survived individual mutation, because a sibling branch pushed the same code
  // and the assertion could not tell which one had fired.
  assert.ok(themeCodes(dir, rows('- 2026-06-11: qa')).includes('deny_member_bare_date'));
  assert.ok(themeCodes(dir, rows('- 2026-06-11 malformed timestamp: caught')).includes('deny_member_disposition'));
  assert.ok(themeCodes(dir, rows('- 2026-01-01 nothing here: qa')).includes('deny_member_date_unknown'));
  assert.ok(themeCodes(dir, rows('- 2026-06-11 no such words here: qa')).includes('deny_member_no_match'));
  assert.ok(themeCodes(dir, rows('- not a key at all: qa')).includes('deny_member_key'));
  assert.ok(themeCodes(dir, rows('- 2026-06-11 malformed timestamp: qa\n- 2026-06-11 malformed: user')).includes('deny_member_duplicate'));
});

test('a member ticket id must appear in what the window returned', () => {
  const dir = repo({ touch: ['src/dates.js'] });
  fs.writeFileSync(path.join(dir, 'tickets.txt'), 'PROJ-101 the first\nPROJ-102 the second\n');
  const good = { Window: '`cat tickets.txt` → 2 items', Count: '2', rows: '- PROJ-101: qa\n- PROJ-102: user' };
  assert.deepEqual(themeCodes(dir, good), []);
  const absent = { ...good, rows: '- PROJ-101: qa\n- PROJ-999: user' };
  assert.ok(themeCodes(dir, absent).includes('deny_member_not_in_window'));
  // a bare number is not a ticket id under the default pattern
  const malformed = { ...good, rows: '- PROJ-101: qa\n- proj102: user' };
  assert.ok(themeCodes(dir, malformed).includes('deny_member_key'));
});

test('a member id written with a leading # matches the bare id in the output', () => {
  const dir = repo({ touch: ['src/dates.js'] });
  fs.writeFileSync(path.join(dir, 'tickets.txt'), '14339\ttitle one\n14340\ttitle two\n');
  const codes = themeCodes(dir, { Window: '`cat tickets.txt` → 2 items', Count: '2', rows: '- #14339: qa\n- #14340: user' });
  assert.deepEqual(codes, []);
});

test('every landed row on a theme entry ends in something this work touched', () => {
  const dir = repo({ touch: ['src/dates.js'] });
  const L = (v) => ({ Landed: v });
  assert.ok(themeCodes(dir, L('Landed: 4 the template asks the question')).includes('deny_landed_no_referent'));
  assert.ok(themeCodes(dir, L('Landed: 4 the template asks, src/nowhere.js')).includes('deny_landed_referent_unresolved'));
  assert.ok(themeCodes(dir, L('Landed: 4 the template asks, src/other.js')).includes('deny_landed_referent_untouched'));
  assert.ok(!themeCodes(dir, L('Landed: 4 the template asks, PROJ-412')).includes('deny_landed_no_referent'));
});

test('a file the fix created counts as a referent, though git diff never lists it', () => {
  // The shape that made this necessary: a convention-level fix introduces a
  // shared helper, and the helper is the referent. `git diff --name-only HEAD`
  // does not list untracked files, so the row pointed at nothing.
  const dir = repo({ touch: ['src/dates.js'] });
  fs.writeFileSync(path.join(dir, 'src/lookup.js'), 'export function mustFind() {}\n');
  assert.deepEqual(touchedFiles({ cwd: dir, logPath: path.join(dir, 'docs/LESSONS.md') }), ['src/dates.js']);
  assert.ok(untrackedFiles({ cwd: dir }).includes('src/lookup.js'));
  assert.deepEqual(themeCodes(dir, { Landed: 'Landed: 4 one shared lookup, src/lookup.js' }), []);
});

test('the referent check reads the committed fix, not just the dirty tree', () => {
  // Every other theme test dirties the tree and takes the first branch of
  // touchedFiles. The real shape is a fix committed after the log was last
  // committed, which takes the second branch, and that branch needs the log
  // path: given none it resolved the pathspec against the process cwd, handed
  // git a path outside the repo, and returned nothing from its catch. The
  // referent check then fell back to untracked files alone and refused a file
  // the fix had genuinely committed. Found by dry-running the drive entry
  // against a committed tree, not by any test above.
  const dir = repo();
  const logPath = path.join(dir, 'docs/LESSONS.md');
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, GIT_AUTHOR_DATE: '2026-09-05T12:00:00Z', GIT_COMMITTER_DATE: '2026-09-05T12:00:00Z' } });
  fs.appendFileSync(path.join(dir, 'src/dates.js'), '// the fix\n');
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'add', 'src/dates.js');
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'the fix');
  assert.deepEqual(touchedFiles({ cwd: dir, logPath }), ['src/dates.js']);
  const body = THEME({ Landed: 'Landed: 4 the intake template now asks, src/dates.js' });
  const codes = validateEntry({ date: 'd', title: 't', body }, { onDisk: LOG, nominated: [], cwd: dir, logPath }).map((f) => f.code);
  assert.deepEqual(codes, []);
});

test('without the log path the referent check falls back to HEAD, it does not go blind', () => {
  // The failure this guards against is the catch swallowing a bad pathspec and
  // returning an empty set, which reads as "this fix touched nothing" and
  // refuses every path referent while looking like a considered verdict.
  const dir = repo();
  fs.appendFileSync(path.join(dir, 'src/dates.js'), '// the fix\n');
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'add', 'src/dates.js');
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'the fix');
  assert.deepEqual(touchedFiles({ cwd: dir, logPath: null }), ['src/dates.js']);
  assert.deepEqual(touchedFiles({ cwd: dir, logPath: '' }), ['src/dates.js']);
});

test('a theme label joins the same set a class label does, and a mint registers', () => {
  const dir = repo({ touch: ['src/dates.js'] });
  assert.ok(themeCodes(dir, { Theme: 'no such label anywhere' }).includes('deny_class_unknown'));
  assert.ok(themeCodes(dir, { Theme: 'new — ; only a reason' }).includes('deny_class_mint_shape'));
  assert.deepEqual(themeCodes(dir, { Theme: 'new — boundary inputs live in a hand-written list; nothing existing fits' }), []);
  // a Theme: mint is reusable by a later Class:, which is the whole point
  const withTheme = LOG + '\n## 2026-07-01 — A theme\n\nBody.\nTheme: new — boundary inputs; nothing fits\n';
  const reuse = GOOD.replace(/^Class:.*$/m, 'Class: boundary inputs');
  assert.ok(!validateEntry({ date: 'd', title: 't', body: reuse }, { onDisk: withTheme, nominated: [], cwd: null }).map((f) => f.code).includes('deny_class_unknown'));
});

test('an entry claiming both blocks is refused, and the incident rules are not skipped', () => {
  // Dispatch was "Theme: is present", so an entry carrying both took the theme
  // path and every incident rule went unread. Level: banana and Instance: 42
  // landed green, and an author blocked by a git nomination escaped it by
  // typing four lines: block selection was free.
  const dir = repo({ touch: ['src/dates.js'], backdate: { 'src/dates.js': ['2026-04-02'] } });
  const both = GOOD.replace(/^Class:.*$/m, 'Class: null safety\nLevel: banana\nInstance: 42\nTheme: null safety\nWindow: `git log -1 --format=%h` → 1 items\nCount: 0');
  const codes = validateEntry({ date: 'd', title: 't', body: both }, { onDisk: LOG, nominated: [], cwd: dir, logPath: logIn(dir) }).map((f) => f.code);
  assert.deepEqual(codes, ['deny_two_blocks']);
  // through decide(), with a nomination pending that the theme path never sees
  const nominated = [{ date: '2026-04-02', title: 'The CSV export returned a 500 for one feed' }];
  const themeOnly = THEME();
  const escaped = validateEntry({ date: 'd', title: 't', body: themeOnly }, { onDisk: LOG, nominated, cwd: dir, logPath: logIn(dir) }).map((f) => f.code);
  assert.ok(!escaped.includes('deny_prior_not_dispositioned'), 'a theme entry answers no nomination, by design');
  const issue = validateEntry({ date: 'd', title: 't', body: GOOD.replace(/^- 2026-04-02.*\n/m, '').replace('Instance: 4', 'Instance: 3') }, { onDisk: LOG, nominated, cwd: dir, logPath: logIn(dir) }).map((f) => f.code);
  assert.ok(issue.includes('deny_prior_not_dispositioned'), 'and an incident entry still answers it');
});

test('the mint shape is one rule, applied to both label fields', () => {
  // The two halves drifted inside a week: the Theme half dropped the semicolon,
  // so a whole sentence registered as a reusable label through Theme: while the
  // identical Class: form was refused.
  const dir = repo({ touch: ['src/dates.js'] });
  const sentence = 'new — everything here is really just people not reading the docs';
  assert.ok(themeCodes(dir, { Theme: sentence }).includes('deny_class_mint_shape'));
  const asClass = GOOD.replace(/^Class:.*$/m, `Class: ${sentence}`);
  assert.ok(validateEntry({ date: 'd', title: 't', body: asClass }, { onDisk: LOG, nominated: [], cwd: null }).map((f) => f.code).includes('deny_class_mint_shape'));
  assert.equal(mintShapeFault('new — a label; a reason'), null);
  assert.equal(mintShapeFault('a bare reused label'), null);
  assert.ok(mintShapeFault('new — ; only a reason'));
  assert.ok(mintShapeFault('new — no separator at all'));
});

test('an untracked file is a referent only beside a real change', () => {
  // `git ls-files --others` is every uncommitted non-ignored path, not the files
  // this fix created, so on its own the rule read "name a file that exists and
  // is not committed": on a clean tree with no fix at all, touching an empty
  // file bought a passing Landed row.
  const dir = repo();
  fs.writeFileSync(path.join(dir, 'the-rule.md'), '');
  assert.deepEqual(touchedFiles({ cwd: dir, logPath: path.join(dir, 'docs/LESSONS.md') }), []);
  const codes = themeCodes(dir, { Landed: 'Landed: 5 we will be more careful, the-rule.md' });
  assert.ok(codes.includes('deny_landed_referent_untouched'), codes.join(','));
  // beside a real change the created file counts, which is the case this exists for
  fs.appendFileSync(path.join(dir, 'src/dates.js'), '// the fix\n');
  assert.deepEqual(themeCodes(dir, { Landed: 'Landed: 4 one shared lookup, the-rule.md' }), []);
});

test('a referent path is compared after normalisation, not as typed', () => {
  const dir = repo({ touch: ['src/dates.js'] });
  assert.deepEqual(themeCodes(dir, { Landed: 'Landed: 4 the fix, ./src/dates.js' }), []);
});

test('where git does not answer, the gate says so instead of ruling', () => {
  // The catch returned [] and the deny text then claimed the file "is not among
  // the files this fix touched", which is a confident verdict about work the
  // gate could not see.
  const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'lfb-nogit-'));
  fs.mkdirSync(path.join(bare, 'src'));
  fs.writeFileSync(path.join(bare, 'src/dates.js'), 'export function fmtDayKey() {}\n');
  assert.equal(gitReachable(bare), false);
  const codes = validateEntry({ date: 'd', title: 't', body: THEME({ Window: '`git log -1 --format=%h` → 0 items', Landed: 'Landed: 4 the fix, src/dates.js' }) }, { onDisk: LOG, nominated: [], cwd: bare, logPath: path.join(bare, 'docs/LESSONS.md') }).map((f) => f.code);
  assert.ok(codes.includes('deny_landed_referent_unverifiable'), codes.join(','));
  assert.ok(!codes.includes('deny_landed_referent_untouched'));
});

test('a cwd without a log path is refused, not answered from HEAD', () => {
  // The combination used to produce a different check instead of an error:
  // touchedFiles fell back to HEAD, so the touched set was whatever the last
  // commit held and never empty. A helper took that path and every referent
  // assertion ran green against a configuration decide() never produces.
  const dir = repo({ touch: ['src/dates.js'] });
  assert.throws(
    () => validateEntry({ date: 'd', title: 't', body: THEME() }, { onDisk: LOG, nominated: [], cwd: dir }),
    /cwd was given without logPath/,
  );
  // cwd: null is the honest way to skip every check that reads the repo
  assert.doesNotThrow(() => validateEntry({ date: 'd', title: 't', body: THEME() }, { onDisk: LOG, nominated: [], cwd: null }));
});

test('a member slug matching two entries on its day is refused', () => {
  // The branch b09134e exists to close, one field over, and it had no covering
  // input: the fixture log carries one entry per day, so the duplicate branch
  // was firing instead and the ambiguity branch survived mutation.
  const twins = `# Lessons

## 2026-05-05 — The report header was blank

Body.
Class: null safety

## 2026-05-05 — The report footer was blank

Body.
Class: null safety
`;
  const body = THEME({ Count: '1', rows: '- 2026-05-05 report: qa' });
  const fails = validateEntry({ date: 'd', title: 't', body }, { onDisk: twins, nominated: [], cwd: null });
  const m = fails.find((f) => f.code === 'deny_member_ambiguous');
  assert.ok(m, JSON.stringify(fails.map((f) => f.code)));
  assert.match(m.detail, /matches 2 entries/);
  // and a slug that separates them resolves
  const ok = THEME({ Count: '1', rows: '- 2026-05-05 report footer: qa' });
  assert.ok(!validateEntry({ date: 'd', title: 't', body: ok }, { onDisk: twins, nominated: [], cwd: null }).some((f) => f.code === 'deny_member_ambiguous'));
});

test('bucket and critic are closed sets on a theme entry too', () => {
  const dir = repo({ touch: ['src/dates.js'] });
  assert.ok(themeCodes(dir, { Bucket: 'forgot' }).includes('deny_bucket'));
  assert.ok(themeCodes(dir, { Critic: 'skipped' }).includes('deny_critic'));
});

test('the ticket pattern is configurable, and the default refuses a lowercase id', () => {
  assert.ok(ticketPattern({}).test('PROJ-412'));
  assert.ok(ticketPattern({}).test('#14339'));
  assert.ok(!ticketPattern({}).test('proj412'));
  assert.ok(ticketPattern({ LFB_TICKET_PATTERN: '^b-\\d+$' }).test('b-7'));
  assert.ok(!ticketPattern({ LFB_TICKET_PATTERN: '^b-\\d+$' }).test('PROJ-412'));
});

test('sweep and priors lines must be `command` → observation', () => {
  const c = v(null, GOOD.replace(/^Sweep:.*$/m, 'Sweep: nothing else uses it').replace(/^Priors:.*$/m, 'Priors: read the log'));
  assert.equal(c.filter((x) => x === 'deny_sweep_no_command').length, 2);
});

test('the command allowlist refuses writes, chaining, and unknown binaries', () => {
  assert.equal(vetCommand('git log --oneline -- src/'), null);
  assert.equal(vetCommand('grep -rn foo src/ | wc -l'), null);
  assert.ok(vetCommand('rm -rf src'));
  assert.ok(vetCommand('git push origin main'));
  assert.ok(vetCommand('grep foo src/ > out.txt'));
  assert.ok(vetCommand('ls; rm x'));
  assert.ok(vetCommand('find . -name x -delete'));
  assert.ok(vetCommand('echo $(cat secret)'));
  const c = v(null, GOOD.replace(/^Sweep:.*$/m, 'Sweep: `rm -rf src` → gone'));
  assert.ok(c.includes('deny_sweep_command_refused'));
});

test('git subcommands that rewrite the working tree are refused', () => {
  for (const cmd of ['git checkout -- src/dates.js', 'git restore src/', 'git stash', 'git clean -fd', 'git reset --hard HEAD']) {
    assert.ok(vetCommand(cmd), `${cmd} should be refused`);
  }
  assert.equal(vetCommand('git status --porcelain'), null);
});

test('gh is allowed two levels deep, read-only verbs only', () => {
  assert.equal(vetCommand('gh issue list --state closed --limit 200'), null);
  assert.equal(vetCommand('gh pr list --state merged'), null);
  assert.equal(vetCommand('gh issue view 412'), null);
  assert.ok(vetCommand('gh issue delete 412'));
  assert.ok(vetCommand('gh repo delete owner/x'));
  assert.ok(vetCommand('gh issue'));
  assert.ok(vetCommand('gh api /repos/x/y'));
});

test('a quoted pipe inside an argument is not a shell pipe', () => {
  // gh's own --jq filters use `|`. Splitting on it refused a legitimate
  // retrieval and, worse, read the filter as a second command.
  assert.equal(vetCommand("gh issue list --json number --jq '.[] | .number'"), null);
  assert.equal(vetCommand('grep -rn "a | b" src/'), null);
  assert.ok(vetCommand("grep -rn 'x' src/ | rm -rf ."));
  assert.ok(vetCommand("grep -rn 'unbalanced src/"));
});

test('an observation that the output does not support is denied; matching shapes pass', () => {
  assert.equal(observationMatches('two call sites', 'a\nb\n'), false);
  assert.equal(observationMatches('2 call sites', 'a\nb\n'), true);
  assert.equal(observationMatches('nothing', ''), true);
  assert.equal(observationMatches('nothing', 'src/x.js:1: hit\n'), false);
  assert.equal(observationMatches('only "fmtDayKey"', 'src/dates.js:3: fmtDayKey()\n'), true);
  assert.equal(observationMatches('one hit in src/dates.js', 'src/dates.js:3: x\nsrc/other.js:9: y\n'), true);
  assert.equal(observationMatches('', 'a\n'), false);
  const dir = repo();
  const lied = GOOD.replace(/^Sweep:.*$/m, 'Sweep: `grep -rn "fmtDayKey" src/` → 3 call sites');
  assert.ok(v(dir, lied).includes('deny_sweep_observation_mismatch'));
  const empty = GOOD.replace(/^Sweep:.*$/m, 'Sweep: `grep -rn "nowhere_at_all" src/` → nothing');
  assert.ok(!v(dir, empty).includes('deny_sweep_observation_mismatch'));
  const notEmpty = GOOD.replace(/^Sweep:.*$/m, 'Sweep: `grep -rn "fmtDayKey" src/` → nothing');
  assert.ok(v(dir, notEmpty).includes('deny_sweep_observation_mismatch'));
});

test('a sweep command that fails to run is denied', () => {
  const dir = repo();
  assert.ok(v(dir, GOOD.replace(/^Sweep:.*$/m, 'Sweep: `git log --nonsense-flag` → 0')).includes('deny_sweep_command_failed'));
});

test('mechanism 1 or 2 without red: is denied; out-of-range rank is denied', () => {
  const w = (line) => v(null, GOOD.replace(/^Landed: 2.*$/m, line));
  assert.ok(w('Landed: 1 a CI check').includes('deny_landed_no_red'));
  assert.ok(w('Landed: 11 something').includes('deny_landed_rank'));
  assert.ok(!w('Landed: 4 a template question').includes('deny_landed_no_red'));
});

test('critic is ran | not-run', () => {
  assert.ok(v(null, GOOD.replace(/^Critic:.*$/m, 'Critic: skipped')).includes('deny_critic'));
});

test('git nominates log dates sharing a day with commits on touched files, and only those', () => {
  const headings = headingsOf(LOG);
  const dir = repo({ touch: ['src/dates.js'], backdate: { 'src/dates.js': ['2026-02-09', '2026-04-02', '2026-06-11'], 'src/other.js': ['2026-02-09'] } });
  assert.deepEqual(nomDates({ cwd: dir, logPath: path.join(dir, 'docs/LESSONS.md'), headings }), ['2026-02-09', '2026-04-02', '2026-06-11']);
  const dir2 = repo({ touch: ['src/other.js'], backdate: { 'src/dates.js': ['2026-04-02'], 'src/other.js': ['2026-02-09'] } });
  assert.deepEqual(nomDates({ cwd: dir2, logPath: path.join(dir2, 'docs/LESSONS.md'), headings }), ['2026-02-09']);
});

test('committing the fix before writing the entry still nominates it', () => {
  const dir = repo({ touch: ['src/dates.js'], backdate: { 'src/dates.js': ['2026-04-02'] }, commitTouched: true });
  assert.deepEqual(nomDates({ cwd: dir, logPath: path.join(dir, 'docs/LESSONS.md'), headings: headingsOf(LOG) }), ['2026-04-02']);
});

test('a dirty tree is the fix; HEAD contributes nothing to it', () => {
  // The union rule dragged in every file of an unrelated HEAD commit. Here
  // HEAD touches src/other.js, whose history carries a log-heading date, and
  // the fix is src/dates.js. Only the fix's dates may be nominated.
  const dir = repo({ backdate: { 'src/other.js': ['2026-02-09'], 'src/dates.js': ['2026-04-02'] }, touch: ['src/dates.js'] });
  assert.deepEqual(touchedFiles({ cwd: dir, logPath: path.join(dir, 'docs/LESSONS.md') }), ['src/dates.js']);
  assert.deepEqual(nomDates({ cwd: dir, logPath: path.join(dir, 'docs/LESSONS.md'), headings: headingsOf(LOG) }), ['2026-04-02']);
});

test('with only the log dirty, the set is every file changed since the log was last committed', () => {
  // The shape that broke the earlier clean-tree wording: fix A, commit, write
  // entry A, fix B, commit B, and the log is still uncommitted. B must nominate.
  const dir = repo({ backdate: { 'src/dates.js': ['2026-04-02'], 'src/other.js': ['2026-02-09'] } });
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, GIT_AUTHOR_DATE: '2026-09-03T12:00:00Z', GIT_COMMITTER_DATE: '2026-09-03T12:00:00Z' } });
  fs.appendFileSync(path.join(dir, 'docs/LESSONS.md'), '\n<!-- entry A -->\n');
  git('add', 'docs/LESSONS.md');
  git('commit', '-q', '-m', 'entry A');
  fs.appendFileSync(path.join(dir, 'src/dates.js'), '// fix B1\n');
  git('add', 'src/dates.js');
  git('commit', '-q', '-m', 'fix B part one');
  fs.appendFileSync(path.join(dir, 'src/other.js'), '// fix B2\n');
  git('add', 'src/other.js');
  git('commit', '-q', '-m', 'fix B part two');
  const logPath = path.join(dir, 'docs/LESSONS.md');
  // Both commits of the multi-commit fix are in the set, not just HEAD's.
  assert.deepEqual(touchedFiles({ cwd: dir, logPath }).sort(), ['src/dates.js', 'src/other.js']);
  assert.deepEqual(nomDates({ cwd: dir, logPath, headings: headingsOf(LOG) }), ['2026-02-09', '2026-04-02']);
});

test('with a log that has never been committed, the set is the HEAD commit', () => {
  const dir = repo({ backdate: { 'src/dates.js': ['2026-04-02'] } });
  const logPath = path.join(dir, 'docs/NEWLOG.md');
  fs.writeFileSync(logPath, LOG);
  assert.deepEqual(touchedFiles({ cwd: dir, logPath }), ['src/dates.js']);
});

test('the since-log window is as wide as the log is stale, and that is the point', () => {
  // Two unrelated commits land after the log's last commit. Both are in the
  // set: work that has landed without reaching the log is exactly what the
  // backward sweep should be asked about. A repo that logs every fix has a
  // one-commit window; a repo that does not has a wide one, and the width is
  // the finding.
  const dir = repo({ backdate: { 'src/dates.js': ['2026-04-02'], 'src/other.js': ['2026-02-09'] } });
  const logPath = path.join(dir, 'docs/LESSONS.md');
  assert.deepEqual(touchedFiles({ cwd: dir, logPath }).sort(), ['src/dates.js', 'src/other.js']);
  assert.deepEqual(nomDates({ cwd: dir, logPath, headings: headingsOf(LOG) }), ['2026-02-09', '2026-04-02']);
});

test('a commit late in a forward zone keeps its own day', () => {
  // git log --date=short renders in the commit's zone, not the reader's. A
  // 23:30 commit in +13:00 is the 4th there and the 3rd in UTC; nomination has
  // to agree with the log heading someone wrote locally, so the commit's day
  // is the one that counts.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lfb-tz-'));
  const when = '2026-09-04T23:30:00+13:00';
  const env = { ...process.env, GIT_AUTHOR_DATE: when, GIT_COMMITTER_DATE: when, TZ: 'UTC' };
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env });
  git('init', '-q');
  git('config', 'user.email', 't@t');
  git('config', 'user.name', 't');
  fs.mkdirSync(path.join(dir, 'docs'));
  fs.writeFileSync(path.join(dir, 'docs/LESSONS.md'), '# Lessons\n\n## 2026-09-04 — Late in a forward zone\n\nBody.\nClass: null safety\n');
  fs.writeFileSync(path.join(dir, 'src.js'), 'v0\n');
  git('add', '.');
  git('commit', '-q', '-m', 'late');
  fs.appendFileSync(path.join(dir, 'src.js'), 'touch\n');
  assert.deepEqual(
    nomDates({ cwd: dir, logPath: path.join(dir, 'docs/LESSONS.md'), headings: [{ date: '2026-09-04', title: 'Late in a forward zone' }] }),
    ['2026-09-04'],
  );
});

test('nothing changed since the log was committed nominates nothing', () => {
  const dir = repo();
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  fs.appendFileSync(path.join(dir, 'docs/LESSONS.md'), '\n<!-- x -->\n');
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'add', 'docs/LESSONS.md');
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'log only');
  assert.deepEqual(touchedFiles({ cwd: dir, logPath: path.join(dir, 'docs/LESSONS.md') }), []);
});

test('end to end: an entry that ignores a nominated prior is denied through decide()', () => {
  const dir = repo({ touch: ['src/dates.js'], backdate: { 'src/dates.js': ['2026-04-02'] } });
  const entry = GOOD.replace('- 2026-04-02 CSV export: same-theme\n', '').replace('Instance: 4', 'Instance: 3');
  const out = decide({ tool_name: 'Edit', cwd: dir, tool_input: { file_path: path.join(dir, 'docs/LESSONS.md'), old_string: '# Lessons\n', new_string: '# Lessons\n\n' + entry } });
  assert.ok(codes(out).includes('deny_prior_not_dispositioned'), JSON.stringify(out));
  assert.equal(out.hookSpecificOutput.permissionDecision, 'deny');
});

test('warn mode reports instead of denying; off mode is silent; other files are ignored; unknown mode blocks', () => {
  const dir = repo();
  const bare = write(dir, LOG + '\n## 2026-09-03 — Bare\n\nno block\n');
  const warn = decide(bare, { LFB_LEDGER_MODE: 'warn' });
  assert.ok(warn.systemMessage && !warn.hookSpecificOutput);
  assert.equal(decide(bare, { LFB_LEDGER_MODE: 'off' }), null);
  assert.equal(decide({ ...bare, tool_input: { ...bare.tool_input, file_path: path.join(dir, 'docs/NOTES.md') } }), null);
  assert.equal(decide(bare, { LFB_LEDGER_MODE: 'bogus' }).hookSpecificOutput.permissionDecision, 'deny');
});

// 2026-09-09, blocker B. `cwd` is a payload field, so its bad values are
// reachable from the only production caller. `""` read as the documented
// `cwd: null` safe mode and every check that reads the repo was skipped in
// silence, which is the 2026-09-09 entry's own class one step nearer.
const nomIgnored = (dir) => {
  const entry = GOOD.replace('- 2026-04-02 CSV export: same-theme\n', '').replace('Instance: 4', 'Instance: 3');
  return (cwd) => ({ tool_name: 'Edit', cwd, tool_input: { file_path: path.join(dir, 'docs/LESSONS.md'), old_string: '# Lessons\n', new_string: '# Lessons\n\n' + entry } });
};

test('a payload cwd that is not a usable path is denied, never silently unchecked', () => {
  const dir = repo({ touch: ['src/dates.js'], backdate: { 'src/dates.js': ['2026-04-02'] } });
  const payload = nomIgnored(dir);
  // The check this entry fails reads the repo, so it is exactly the one a bad
  // cwd used to skip. A real path denies it; nothing else may allow it.
  assert.ok(codes(decide(payload(dir))).includes('deny_prior_not_dispositioned'));
  for (const cwd of ['', null, 0, false, 42, {}, []]) {
    const out = decide(payload(cwd));
    assert.ok(out, `cwd ${JSON.stringify(cwd)} was allowed`);
    assert.equal(out.hookSpecificOutput.permissionDecision, 'deny', `cwd ${JSON.stringify(cwd)}`);
    assert.ok(codes(out).includes('deny_bad_cwd'), `cwd ${JSON.stringify(cwd)}`);
  }
});

test('validateEntry takes a non-empty string cwd or an explicit null, and nothing else', () => {
  const e = { date: 'd', title: 't', body: GOOD };
  const call = (cwd, logPath) => () => validateEntry(e, { onDisk: LOG, nominated: [], cwd, logPath });
  assert.throws(call('', '/tmp/x/docs/LESSONS.md'), /non-empty string/);
  assert.throws(call(undefined, '/tmp/x/docs/LESSONS.md'), /non-empty string/);
  assert.throws(call(42, '/tmp/x/docs/LESSONS.md'), /non-empty string/);
  assert.throws(call('/tmp/x', null), /logPath/);
  assert.doesNotThrow(call(null, null));
});

test('the hook denies when decide() throws, rather than failing open on a non-blocking error', () => {
  const hook = new URL('./ledger-gate.mjs', import.meta.url).pathname;
  const raw = execFileSync('node', [hook], { input: JSON.stringify({ tool_name: 'Write', cwd: '/tmp', tool_input: null }), encoding: 'utf8' });
  const out = JSON.parse(raw);
  assert.equal(out.hookSpecificOutput.permissionDecision, 'deny', raw);
});

// 2026-09-10, the convention behind blocker B. Every export that reads the repo
// takes a cwd, and each one used to answer `[]` or `false` for a cwd it could
// not use, which is "this fix touched nothing" said confidently about work it
// never saw. The list is derived from the module's own source rather than
// restated here, so an export added later is covered without anyone remembering
// to cover it: a new cwd-taking export fails this test until it is given an
// invocation and a contract.
const GATE_SRC = fs.readFileSync(new URL('./ledger-gate.mjs', import.meta.url), 'utf8');
// Both declaration forms. Matching `export function` only meant an export
// written as `export const f = ({ cwd }) => ...` got no contract and no failure,
// and this file already uses that form for ticketPattern.
const cwdTakingExportsIn = (src) =>
  [...src.matchAll(/^export (?:function (\w+)\(([^)]*)\)|const (\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>)/gm)]
    .map((m) => ({ name: m[1] ?? m[3], params: m[2] ?? m[4] ?? '' }))
    .filter(({ params }) => /\bcwd\b/.test(params))
    .map(({ name }) => name)
    .sort();
const cwdTakingExports = () => cwdTakingExportsIn(GATE_SRC);

test('every repo-reading export refuses a cwd it cannot use, and the list is derived not restated', () => {
  // Two contracts. Most of these read the repo unconditionally and have no
  // meaning without it. validateEntry is the one place null is a documented
  // answer, meaning "skip every check that reads the repo", so it is the only
  // export allowed to accept it, and it must still refuse every other unusable
  // value rather than reading them as the skip.
  const REQUIRES = 'requires';
  const NULLABLE = 'nullable';
  const contract = {
    touchedFiles: [REQUIRES, (cwd) => touchedFiles({ cwd, logPath: '/tmp/x/docs/LESSONS.md' })],
    untrackedFiles: [REQUIRES, (cwd) => untrackedFiles({ cwd })],
    nominate: [REQUIRES, (cwd) => nominate({ cwd, logPath: '/tmp/x/docs/LESSONS.md', headings: [] })],
    gitReachable: [REQUIRES, (cwd) => gitReachable(cwd)],
    gitHasHistory: [REQUIRES, (cwd) => gitHasHistory(cwd)],
    repoRoot: [REQUIRES, (cwd) => repoRoot(cwd)],
    runCommand: [REQUIRES, (cwd) => runCommand('true', cwd)],
    requireCwd: [REQUIRES, (cwd) => requireCwd(cwd, 'requireCwd')],
    // A body with no Sweep: or Priors: line, deliberately. Driven with GOOD, the
    // throw this asserts came from runCommand's own requireCwd, which raises the
    // same sentence, so deleting validateEntry's guard left this green: a check
    // satisfied for the wrong reason, which is this arc's whole subject.
    validateEntry: [NULLABLE, (cwd) => validateEntry({ date: 'd', title: 't', body: 'Body.\nClass: input validation\n' }, { onDisk: LOG, nominated: [], cwd, logPath: cwd === null ? null : '/tmp/x/docs/LESSONS.md' })],
  };
  assert.deepEqual(
    cwdTakingExports(),
    Object.keys(contract).sort(),
    'a repo-reading export was added or removed; give it an invocation and a contract here so its cwd is asserted',
  );
  for (const [name, [kind, call]] of Object.entries(contract)) {
    for (const cwd of ['', undefined, 0, 42, {}, []]) {
      assert.throws(() => call(cwd), new RegExp(`${name}: cwd must be a non-empty string`), `${name} accepted cwd ${JSON.stringify(cwd)}, or threw from somewhere else`);
    }
    if (kind === REQUIRES) assert.throws(() => call(null), new RegExp(`${name}: cwd must be a non-empty string`), `${name} accepted cwd null`);
    else assert.doesNotThrow(() => call(null), `${name} is the documented skip mode and must accept null`);
  }
});

test('an empty LFB_LOG_NAME falls back to the default rather than turning the gate off', () => {
  const dir = repo();
  const bare = write(dir, LOG + '\n## 2026-09-03 — Bare\n\nno block\n');
  // `??` defaulted on null and undefined only, so "" survived, no basename ever
  // matched it, and every write returned null with nothing said.
  assert.equal(logNameFrom({ LFB_LOG_NAME: '' }), 'LESSONS.md');
  assert.equal(logNameFrom({ LFB_LOG_NAME: 'NOTES.md' }), 'NOTES.md');
  assert.equal(logNameFrom({}), 'LESSONS.md');
  assert.equal(decide(bare, { LFB_LOG_NAME: '' }).hookSpecificOutput.permissionDecision, 'deny');
});

// 2026-09-10, blocker A. The issue block answered for every nominated prior and
// the theme block answered for none, so writing `Theme:` instead of `Class:`
// bought silence on the whole nominated set at zero cost, and the saving was
// largest exactly where nomination was heaviest. Driven through decide() rather
// than the helper, because the asymmetry is between two paths decide() picks.
const themeWithRows = (rows, count) => THEME({ rows: rows.join('\n'), Count: String(count) });
// THEME() is a block without a heading, which is what validateEntry takes. A
// write needs the heading too or newEntries sees no new entry and decide()
// returns null: an allow that means "nothing was read", not "this passed".
const themeWrite = (rows, count) => '\n## 2026-09-10 — A theme entry\n\n' + themeWithRows(rows, count);

test('a theme entry must answer for every nominated prior, the way an issue entry does', () => {
  const dir = repo({ touch: ['src/dates.js'], backdate: { 'src/dates.js': ['2026-02-09', '2026-04-02'] } });
  assert.ok(
    nominate({ cwd: dir, logPath: logIn(dir), headings: headingsOf(LOG) }).length > 0,
    'the fixture must nominate something or this test asserts nothing',
  );
  // Through decide(), which is what picks between the two blocks and what
  // supplies the nomination to whichever it picks.
  const asTheme = decide(write(dir, LOG + themeWrite(['- 2026-06-11 malformed timestamp: qa'], 1)));
  assert.ok(codes(asTheme).includes('deny_theme_ignores_nomination'), JSON.stringify(codes(asTheme)));
  // The same work written as an issue entry was already denied for this. The
  // point of the fix is that neither block is now the cheaper one to pick.
  const asIssue = decide(write(dir, LOG + '\n' + GOOD.replace('- 2026-04-02 CSV export: same-theme\n', '').replace('Instance: 4', 'Instance: 3')));
  assert.ok(codes(asIssue).includes('deny_prior_not_dispositioned'), JSON.stringify(codes(asIssue)));
});

test('a nominated prior is answered by claiming it or by dismissing it, and a dismissal is not a member', () => {
  const dir = repo({ touch: ['src/dates.js'], backdate: { 'src/dates.js': ['2026-02-09', '2026-04-02'] } });
  const nominated = nominate({ cwd: dir, logPath: logIn(dir), headings: headingsOf(LOG) });
  const codesFor = (rows, count) => validateEntry(
    { date: 'd', title: 't', body: themeWithRows(rows, count) },
    { onDisk: LOG, nominated, cwd: dir, logPath: logIn(dir) },
  ).map((f) => f.code);
  const claimed = ['- 2026-06-11 malformed timestamp: qa', '- 2026-04-02 CSV export: user', '- 2026-02-09 activity heading: nobody'];
  assert.deepEqual(codesFor(claimed, 3), [], 'claiming every nomination as a member passes');
  // Requiring a member row per nomination would force false membership: against
  // a tree touching the skill files, git nominates most of the log. So the
  // honest account for a nomination that is not part of the theme is a
  // dismissal, and it must not inflate Count.
  const dismissed = ['- 2026-06-11 malformed timestamp: qa', '- 2026-04-02 CSV export: not-a-member', '- 2026-02-09 activity heading: nobody'];
  assert.deepEqual(codesFor(dismissed, 2), [], 'dismissing one nomination passes with Count excluding it');
  assert.ok(codesFor(dismissed, 3).includes('deny_theme_count'), 'a dismissal counted as a member is refused');
});

// 2026-09-10, the reviewer's finding 8. The Window's line count was checked
// against the number written beside it and against nothing else, so a
// one-item retrieval carried any number of members: the members were never
// bound to the retrieval that was supposed to have found them. Worst for the
// recommended `gh ... --json` form, which is one line however many issues it
// holds.
test('the Window has to reach at least as far as the members it retrieved', () => {
  const dir = repo({ touch: ['src/dates.js'], backdate: { 'src/dates.js': ['2026-02-09', '2026-04-02'] } });
  const codes = themeCodes(dir, { Window: '`git log -1 --format=%h` → 1 items' });
  assert.ok(codes.includes('deny_window_too_small'), codes.join(','));
  // One member against a one-item window is the honest small case and stays fine.
  assert.deepEqual(
    themeCodes(dir, { Window: '`git log -1 --format=%h` → 1 items', Count: '1', rows: '- 2026-06-11 malformed timestamp: qa' }),
    [],
  );
});

// 2026-09-10, the reviewer's finding on the referent deny message. On a clean
// tree whose only change is a new untracked file, the deny said "nothing has
// changed since the log was last committed, so there is no work here for it to
// be part of". Something had changed, the file is right there, and the text
// named no way out. `git add` is the way out and the deny now says so.
test('an untracked referent on an otherwise clean tree is told how to become one', () => {
  const dir = repo();
  fs.writeFileSync(path.join(dir, 'src/lookup.js'), 'export function mustFind() {}\n');
  assert.deepEqual(touchedFiles({ cwd: dir, logPath: path.join(dir, 'docs/LESSONS.md') }), []);
  const fails = validateEntry(
    { date: 'd', title: 't', body: THEME({ Landed: 'Landed: 4 one shared lookup, src/lookup.js' }) },
    { onDisk: LOG, nominated: [], cwd: dir, logPath: logIn(dir) },
  );
  const f = fails.find((x) => x.code === 'deny_landed_referent_untouched');
  assert.ok(f, fails.map((x) => x.code).join(','));
  assert.match(f.detail, /git add src\/lookup\.js/);
  assert.doesNotMatch(f.detail, /nothing has changed/);
});

// 2026-09-10, the reviewer's finding 7. The member scan read the whole body and
// claimed any "- x: y" line, so a prose bullet became a bogus member row, and a
// row that missed the shape was dropped without a word, surfacing later as a
// Count mismatch that named the wrong problem. The issue block has
// deny_prior_malformed for exactly this; the theme block shipped without it.
test('member rows are read from the rows region, and a bullet there that is not a row is named', () => {
  const dir = repo({ touch: ['src/dates.js'], backdate: { 'src/dates.js': ['2026-02-09', '2026-04-02'] } });
  const withProse = THEME().replace('Prose about the pattern.', 'Prose about the pattern.\n\n- the queue drains late: sometimes');
  const proseCodes = validateEntry(
    { date: 'd', title: 't', body: withProse },
    { onDisk: LOG, nominated: [], cwd: dir, logPath: logIn(dir) },
  ).map((f) => f.code);
  assert.deepEqual(proseCodes, [], 'a prose bullet outside the rows region is prose');
  const broken = themeCodes(dir, { rows: '- 2026-06-11 malformed timestamp: QA\n- 2026-04-02 CSV export: user\n- 2026-02-09 activity heading: nobody' });
  assert.ok(broken.includes('deny_member_malformed'), broken.join(','));
});

// 2026-09-10, the reviewer's finding 9. Two of the minors, each a place where a
// check answered a slightly different question than its rule asked.
test('a label registers from an entry block, not from a sentence that opens like one', () => {
  const ghostLog = `# Lessons

## 2026-06-11 — An entry whose prose opens a line the way a block field does

Theme: ghost label written in prose, never a field

Class: input validation
`;
  const codesFor = (theme) => validateEntry(
    { date: 'd', title: 't', body: THEME({ Theme: theme }) },
    { onDisk: ghostLog, nominated: [], cwd: null },
  ).map((f) => f.code);
  assert.ok(codesFor('ghost label written in prose, never a field').includes('deny_class_unknown'));
  assert.ok(!codesFor('input validation').includes('deny_class_unknown'));
});

test('a Window that returned nothing may say so, and the count may sit anywhere in the observation', () => {
  const dir = repo({ touch: ['src/dates.js'] });
  // The plan said "nothing" against empty output passes and the gate refused it
  // for stating no count. It passes now, and the members answer to the
  // too-small check rather than to a phantom number.
  const nothing = themeCodes(dir, { Window: '`grep -n zzzznomatch docs/LESSONS.md` → nothing', Count: '1', rows: '- 2026-06-11 malformed timestamp: qa' });
  assert.ok(!nothing.includes('deny_window_mismatch'), nothing.join(','));
  assert.ok(nothing.includes('deny_window_too_small'), nothing.join(','));
  // A Sweep observation may carry the count anywhere in the text; the Window
  // took whichever integer came first, which is a different rule in the same file.
  assert.deepEqual(themeCodes(dir, { Window: "`grep -n '^## ' docs/LESSONS.md` → 2026 saw 3 items" }), []);
});

// 2026-09-10, critic findings 1 and 5. The dated branch deduped through `seen`
// and the ticket branch did not, so three rows naming one ticket certified
// Count: 3 for a pattern with one incident under it. And the accommodation that
// a dismissed ticket is not looked for in the Window was the only branch in the
// file with no test that killed it.
test('one row per member holds for ticket ids too, not only for log entries', () => {
  const dir = repo({ touch: ['src/dates.js'] });
  fs.writeFileSync(path.join(dir, 'tickets.txt'), 'PROJ-101 the first\nPROJ-102 the second\nPROJ-103 the third\n');
  const win = { Window: '`cat tickets.txt` → 3 items' };
  assert.deepEqual(themeCodes(dir, { ...win, Count: '3', rows: '- PROJ-101: qa\n- PROJ-102: user\n- PROJ-103: agent' }), []);
  const repeated = themeCodes(dir, { ...win, Count: '3', rows: '- PROJ-101: qa\n- PROJ-101: user\n- PROJ-101: agent' });
  assert.ok(repeated.includes('deny_member_duplicate'), repeated.join(','));
});

test('a dismissed ticket id is not looked for in the window, and a claimed one still is', () => {
  const dir = repo({ touch: ['src/dates.js'] });
  fs.writeFileSync(path.join(dir, 'tickets.txt'), 'PROJ-101 the first\n');
  const win = { Window: '`cat tickets.txt` → 1 items' };
  // Claimed but absent from the retrieval: refused.
  assert.ok(themeCodes(dir, { ...win, Count: '2', rows: '- PROJ-101: qa\n- PROJ-999: user' }).includes('deny_member_not_in_window'));
  // The same id dismissed: accepted, and not counted as a member.
  assert.deepEqual(themeCodes(dir, { ...win, Count: '1', rows: '- PROJ-101: qa\n- PROJ-999: not-a-member' }), []);
});

// 2026-09-10, critic finding 4. Rows written below Bucket: fell outside the
// region, so the count deny said "Count: 3 but 0 member row(s) follow it", and
// following that to Count: 0 said the count must be at least 1. Two denies
// contradicting each other, neither naming the placement, and no path between
// them. The message this batch already replaced was replaced for exactly that.
test('member rows written outside the rows region are told where they belong', () => {
  const dir = repo({ touch: ['src/dates.js'] });
  const misplaced = THEME({ rows: '' }).replace(
    'Critic: not-run',
    '- 2026-06-11 malformed timestamp: qa\n- 2026-04-02 CSV export: user\n- 2026-02-09 activity heading: nobody\nCritic: not-run',
  );
  const fails = validateEntry(
    { date: 'd', title: 't', body: misplaced },
    { onDisk: LOG, nominated: [], cwd: dir, logPath: logIn(dir) },
  );
  const f = fails.find((x) => x.code === 'deny_member_misplaced');
  assert.ok(f, fails.map((x) => x.code).join(','));
  assert.match(f.detail, /above `Bucket:`/);
});

// 2026-09-10, critic finding 6. Predates this batch. newEntries treats a heading
// already on disk as a re-save, so copying an existing heading verbatim smuggled
// a whole entry past the gate with no block at all: the cheapest bypass
// available, and cheaper than either block. The auditor catches the resulting
// log, but the auditor runs in this repo's CI and the hook ships to other
// people's repos, where nothing runs it.
test('an entry smuggled under a heading that already exists is denied at the write', () => {
  const dir = repo();
  const heading = '## 2026-06-11 — A malformed timestamp put rows under a bucket headed "undefined"';
  const smuggled = LOG + `\n${heading}\n\nA new lesson under an old heading. No block at all.\n`;
  const out = decide(write(dir, smuggled));
  assert.ok(codes(out).includes('deny_log_duplicate_heading'), JSON.stringify(codes(out)));
  // Re-saving the file, and adding an entry under a heading of its own, are both
  // unaffected: the count of entries under a given heading is what changes.
  assert.equal(decide(write(dir, LOG + '\nfootnote\n')), null);
  assert.ok(!codes(decide(write(dir, LOG + '\n' + GOOD))).includes('deny_log_duplicate_heading'));
});

// 2026-09-10, critic finding 2. The forward half of this was already fixed:
// landedRows asks gitReachable before ruling on a referent. The backward half
// was not. nominate() swallows every git failure into [], and an empty
// nomination is indistinguishable from "this fix touched nothing", so an entry
// that answers for no prior at all was permitted wherever git could not answer.
// gitReachable alone is not the test: a repo with no commits answers
// rev-parse --git-dir and still cannot produce a single prior.
test('where git cannot answer the backward sweep, the gate says so instead of permitting', () => {
  const withEntries = (dir) => {
    fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'docs/LESSONS.md'), LOG);
    fs.writeFileSync(path.join(dir, 'src.js'), 'v0\n');
    return decide(write(dir, LOG + '\n' + GOOD));
  };
  const notARepo = fs.mkdtempSync(path.join(os.tmpdir(), 'lfb-nogit-'));
  assert.ok(codes(withEntries(notARepo)).includes('deny_nomination_unverifiable'));

  const noCommits = fs.mkdtempSync(path.join(os.tmpdir(), 'lfb-nocommit-'));
  execFileSync('git', ['init', '-q'], { cwd: noCommits, stdio: ['ignore', 'pipe', 'ignore'] });
  assert.equal(gitReachable(noCommits), true, 'rev-parse --git-dir answers here, which is why it is not the test');
  assert.ok(codes(withEntries(noCommits)).includes('deny_nomination_unverifiable'));

  // A log with nothing in it yet has no priors to nominate, so nothing is lost
  // and nothing is claimed. That case must stay open.
  const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'lfb-fresh-'));
  fs.mkdirSync(path.join(fresh, 'docs'));
  fs.writeFileSync(path.join(fresh, 'docs/LESSONS.md'), '# Lessons\n');
  const out = decide(write(fresh, '# Lessons\n\n' + GOOD));
  assert.ok(!codes(out).includes('deny_nomination_unverifiable'), JSON.stringify(codes(out)));

  // And a healthy repo is untouched.
  const healthy = repo({ touch: ['src/dates.js'] });
  assert.ok(!codes(decide(write(healthy, LOG + '\n' + GOOD))).includes('deny_nomination_unverifiable'));
});

// 2026-09-10. Nothing here had ever put cwd below the repo root, and the hook
// takes whatever directory the session runs in. From a subdirectory the two
// halves of the touched set disagree: `git diff --name-only` names files from
// the repo root and `git ls-files --others` names them from the cwd, so they
// were being merged in two different coordinate systems and compared against a
// third. A theme entry written from src/ could name no referent at all: the
// file as the author sees it read as untouched, and the file as git names it
// read as unresolved. A trap with no string that satisfies it.
test('the gate reads the repo that holds the log, not the directory the session sits in', () => {
  const dir = repo({ touch: ['src/dates.js'] });
  fs.writeFileSync(path.join(dir, 'src/created.js'), 'export function mustFind() {}\n');
  // Through decide(), because the anchoring is decide()'s job and a cwd it never
  // passes is a configuration production does not produce. Driving validateEntry
  // with one is how the 2026-09-09 defect hid.
  const themed = (referent) => `## 2026-09-12 — A theme written from wherever

Prose.

Theme: input validation
Window: \`grep -n '^## ' docs/LESSONS.md\` → 3 items
Count: 1
- 2026-06-11 malformed timestamp: qa
Bucket: unrecorded
Landed: 4 the template asks the question, ${referent}
Critic: not-run
`;
  const at = (cwd, referent) => codes(decide({
    tool_name: 'Write',
    cwd,
    tool_input: { file_path: path.join(dir, 'docs/LESSONS.md'), content: LOG + '\n' + themed(referent) },
  })).filter((c) => c.startsWith('deny_landed') || c.startsWith('deny_sweep') || c.startsWith('deny_window'));

  // One spelling, the one git prints, from wherever the session happens to be.
  // The Window command is written from the repo root for the same reason, and it
  // is executed there rather than wherever the session sits.
  assert.deepEqual(at(dir, 'src/dates.js'), [], 'from the root');
  assert.deepEqual(at(path.join(dir, 'src'), 'src/dates.js'), [], 'from a subdirectory, same spelling, same answer');
  assert.deepEqual(at(path.join(dir, 'src'), 'src/created.js'), [], 'a file this work created, likewise');
  assert.ok(at(path.join(dir, 'src'), 'src/other.js').includes('deny_landed_referent_untouched'), 'and an untouched file is still refused');
  // The cwd-relative spelling is not the rule, and the deny says what is.
  const wrong = decide({
    tool_name: 'Write',
    cwd: path.join(dir, 'src'),
    tool_input: { file_path: path.join(dir, 'docs/LESSONS.md'), content: LOG + '\n' + themed('dates.js') },
  });
  assert.ok(codes(wrong).includes('deny_landed_referent_unresolved'), JSON.stringify(codes(wrong)));
  assert.match(wrong.hookSpecificOutput.permissionDecisionReason, /written from the repo root/);
});

// 2026-09-10. deny_nomination_unverifiable asked git about the session's cwd,
// which is not always the project. Claude Code opened at a folder holding
// several projects, or at a workspace root one level above, is an ordinary
// setup, and it permanently refused every entry after the first with a message
// that never named the cwd as the cause. The log's own directory says which
// repo the question is about, and it is known and absolute at that point.
test('a session sitting above the project still writes to the project log', () => {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'lfb-ws-'));
  const proj = path.join(ws, 'myproject');
  fs.mkdirSync(path.join(proj, 'docs'), { recursive: true });
  fs.mkdirSync(path.join(proj, 'src'), { recursive: true });
  const git = (...a) => execFileSync('git', a, { cwd: proj, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  git('init', '-q'); git('config', 'user.email', 't@t'); git('config', 'user.name', 't');
  fs.writeFileSync(path.join(proj, 'docs/LESSONS.md'), LOG);
  fs.writeFileSync(path.join(proj, 'src/dates.js'), 'export function fmtDayKey() {}\n');
  git('add', '.'); git('commit', '-q', '-m', 'scaffold');
  fs.appendFileSync(path.join(proj, 'src/dates.js'), '// working change\n');

  const payload = (cwd) => ({
    tool_name: 'Write',
    cwd,
    tool_input: { file_path: path.join(proj, 'docs/LESSONS.md'), content: LOG + '\n' + GOOD },
  });
  // The workspace above the repo is not itself a repo, and that is not the
  // question the gate is asking.
  assert.ok(!codes(decide(payload(ws))).includes('deny_nomination_unverifiable'), JSON.stringify(codes(decide(payload(ws)))));
  assert.ok(!codes(decide(payload(proj))).includes('deny_nomination_unverifiable'));
  // A log that genuinely sits in no repo is still refused: the sweep cannot run.
  const loose = fs.mkdtempSync(path.join(os.tmpdir(), 'lfb-loose-'));
  fs.mkdirSync(path.join(loose, 'docs'));
  fs.writeFileSync(path.join(loose, 'docs/LESSONS.md'), LOG);
  const out = decide({ tool_name: 'Write', cwd: loose, tool_input: { file_path: path.join(loose, 'docs/LESSONS.md'), content: LOG + '\n' + GOOD } });
  assert.ok(codes(out).includes('deny_nomination_unverifiable'), JSON.stringify(codes(out)));
});

// 2026-09-10. The allowlist names read-only commands because the gate executes
// the line, and the comment above it cites the 2026-09-04 loss of two sessions
// of uncommitted work to a command that rewrote the tree. Two vetted commands
// did exactly that anyway: `sort -o FILE` truncated an uncommitted file to zero
// bytes and reported a clean run, and `git diff --output=FILE` overwrote one.
// Neither needs a shell redirect, so the redirection check never saw them.
// `uniq IN OUT` writes its second positional argument for the same reason.
test('a vetted command may not write to a file, whatever spelling it uses', () => {
  for (const cmd of [
    'sort -o src/dates.js /dev/null',
    'sort --output=src/dates.js /dev/null',
    'sort /dev/null -o src/dates.js',
    'git diff --output=src/dates.js HEAD',
    'git diff --output src/dates.js HEAD',
    'uniq src/dates.js src/dates.js',
    'grep -c x src/dates.js | sort -o src/dates.js',
  ]) {
    assert.ok(vetCommand(cmd), `"${cmd}" was vetted and it writes`);
  }
  // The read-only spellings these must not catch. `grep -o` prints matches, and
  // sorting or de-duplicating a pipeline is the ordinary shape of a sweep.
  for (const cmd of [
    "grep -o 'deny_[a-z_]*' src/dates.js",
    'grep -c fmtDayKey src/dates.js | sort',
    'grep -n x src/dates.js | sort | uniq -c',
    'git log --date=short --format=%ad -- src/dates.js',
    'git diff --name-only HEAD',
    'uniq -c src/dates.js',
  ]) {
    assert.equal(vetCommand(cmd), null, `"${cmd}" is read-only and was refused: ${vetCommand(cmd)}`);
  }
});

// 2026-09-10. The anchor fell back to a bare `cwd` when the log's directory did
// not exist yet, losing the repo-root normalisation as well as the repo. So the
// first lesson ever written in a project, before docs/ exists, was refused
// whenever the session was not opened exactly at the repo root, which is the
// same regression the anchor was added to close. Walk up to the nearest existing
// ancestor instead: the log's path says which project it belongs to whether or
// not its directory has been created.
test('the first entry in a project is written before its docs directory exists', () => {
  const build = () => {
    const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'lfb-first-'));
    const proj = path.join(ws, 'myproject');
    fs.mkdirSync(path.join(proj, 'src'), { recursive: true });
    const git = (...a) => execFileSync('git', a, { cwd: proj, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    git('init', '-q'); git('config', 'user.email', 't@t'); git('config', 'user.name', 't');
    fs.writeFileSync(path.join(proj, 'src/dates.js'), 'export function fmtDayKey() {}\n');
    git('add', '.'); git('commit', '-q', '-m', 'scaffold');
    fs.appendFileSync(path.join(proj, 'src/dates.js'), '// working change\n');
    return { ws, proj };
  };
  const { ws, proj } = build();
  // docs/ does not exist: this write creates it. A first entry has no priors to
  // dispose of, so GOOD's rows would be denied for naming entries no log holds.
  const first = `# Lessons

## 2026-09-12 — The first lesson this project ever wrote

Body.

Class: new — a first label in an empty log; nothing exists to reuse
Instance: 1
Level: call-site
Bucket: missing
Not one up: contract would be a wider rule and one instance does not buy it
Sweep: \`grep -c fmtDayKey src/dates.js\` → 1
Priors: \`git log --date=short --format=%ad -- src/dates.js\` → 0 nominated
Landed: 3 a note in the log
Critic: not-run
`;
  const payload = (cwd) => ({ tool_name: 'Write', cwd, tool_input: { file_path: path.join(proj, 'docs/LESSONS.md'), content: first } });
  assert.ok(!fs.existsSync(path.join(proj, 'docs')), 'the fixture must not have docs/ or this asserts nothing');
  for (const [label, cwd] of [['repo root', proj], ['above the repo', ws], ['a subdirectory', path.join(proj, 'src')]]) {
    const got = codes(decide(payload(cwd)));
    assert.deepEqual(got, [], `from ${label}: ${JSON.stringify(got)}`);
  }
});

// 2026-09-10, and it is the gate mis-modelling the tool it gates. resultingText
// used String.replace with a string pattern, which substitutes the first match
// only. An Edit carrying replace_all: true substitutes every match, so a single
// edit could land the same heading twice and the duplicate-heading check, reading
// a one-substitution model of the result, saw nothing. The duplicate is then
// permanent, because a heading already on disk is grandfathered.
test('an Edit that replaces every occurrence is read the way the tool would apply it', () => {
  const dir = repo();
  const marker = '<!-- next entry above this line -->';
  const onDisk = `# Lessons\n\n## 2026-06-11 — Alpha\n\nBody.\nClass: input validation\n\n${marker}\n\n## 2026-04-02 — Beta\n\nBody.\nClass: null safety\n\n${marker}\n`;
  fs.writeFileSync(path.join(dir, 'docs/LESSONS.md'), onDisk);
  const added = '## 2026-09-12 — Gamma\n\nBody. No block at all.\n\n' + marker;
  const edit = (replaceAll) => ({
    tool_name: 'Edit',
    cwd: dir,
    tool_input: { file_path: path.join(dir, 'docs/LESSONS.md'), old_string: marker, new_string: added, replace_all: replaceAll },
  });
  // One substitution adds one Gamma, which is a new entry and answers for itself.
  assert.ok(!codes(decide(edit(false))).includes('deny_log_duplicate_heading'));
  // Every substitution adds two, and the gate must see the result the tool makes.
  const all = codes(decide(edit(true)));
  assert.ok(all.includes('deny_log_duplicate_heading'), JSON.stringify(all));
});

// 2026-09-10. The first write-flag refusal matched tokens exactly, so it closed
// `sort -o F` and left `-oF`, bundled `-no`, and `-o=F`. Three of six findings in
// that review were further spellings, which is the signature of a denylist
// matching text rather than concepts. Short flags are walked as clusters now,
// stopping at the first letter that takes a value, so a spelling cannot slip and
// `sort -Tsomeodir` is not mistaken for one.
test('a command that writes a file is refused however the flag is spelled', () => {
  for (const cmd of [
    'sort -o src/dates.js /dev/null',
    'sort -osrc/dates.js /dev/null',
    'sort -o=src/dates.js /dev/null',
    'sort -no src/dates.js /dev/null',
    'sort -uo src/dates.js /dev/null',
    'sort --output=src/dates.js /dev/null',
    'sort --output src/dates.js /dev/null',
    'git diff --output=src/dates.js HEAD',
    'grep -c x src/dates.js | sort -osrc/dates.js',
  ]) {
    assert.ok(vetCommand(cmd), `"${cmd}" was vetted and it writes`);
  }
  // Value-taking short flags whose values merely contain the write letter.
  for (const cmd of ['sort -T /tmp src/dates.js', 'sort -Tsomeodir src/dates.js', 'sort -k2 src/dates.js', 'sort -t, -k1 src/dates.js']) {
    assert.equal(vetCommand(cmd), null, `"${cmd}" is read-only and was refused: ${vetCommand(cmd)}`);
  }
});

test('find may not write through its output predicates, and git may not be handed a pager', () => {
  for (const cmd of [
    'find . -name "*.js" -fprint victim.txt',
    'find . -name "*.js" -fprint0 victim.txt',
    'find . -name "*.js" -fprintf victim.txt %p',
    'find . -name "*.js" -fls victim.txt',
    'git grep --open-files-in-pager=./mypager pattern',
    'git grep --open-files-in-pager ./mypager pattern',
    'rg --pre ./mypre pattern',
    'rg --pre-glob "*.js" pattern',
  ]) {
    assert.ok(vetCommand(cmd), `"${cmd}" was vetted and it writes or executes`);
  }
  assert.equal(vetCommand('find . -name "*.mjs"'), null);
  assert.equal(vetCommand('git grep -n pattern'), null);
});

// The uniq rule counted a flag's value as a second path, so `uniq -f 2 in.txt`
// was refused with a message telling the author to pass one path, which they had.
test('uniq refuses a second file but not a flag value that looks like one', () => {
  for (const cmd of ['uniq -f 2 dup.txt', 'uniq -s 3 dup.txt', 'uniq -w 10 dup.txt', 'uniq -c dup.txt', 'uniq --skip-fields=2 dup.txt', 'uniq dup.txt']) {
    assert.equal(vetCommand(cmd), null, `"${cmd}" is read-only and was refused: ${vetCommand(cmd)}`);
  }
  for (const cmd of ['uniq in.txt out.txt', 'uniq -c in.txt out.txt', 'uniq -f 2 in.txt out.txt']) {
    assert.ok(vetCommand(cmd), `"${cmd}" was vetted and it writes its second path`);
  }
});

// The commands this log actually uses, and the ones its references recommend. A
// refusal rule is only worth having if the corpus it governs still passes it.
test('every command the log already uses still vets', () => {
  const log = fs.readFileSync(new URL('../../../docs/LESSONS.md', import.meta.url), 'utf8');
  const cmds = [...log.matchAll(/^(?:Sweep|Priors|Window):[ \t]*`([^`]+)`/gm)].map((m) => m[1]);
  assert.ok(cmds.length >= 10, `expected the log's own corpus, found ${cmds.length}`);
  for (const cmd of cmds) assert.equal(vetCommand(cmd), null, `the log already uses "${cmd}" and it is now refused: ${vetCommand(cmd)}`);
  for (const cmd of [
    'gh issue list --state closed --limit 200 --json number,title,labels,closedAt',
    'gh pr list --state merged --limit 200 --json number,title,body,mergedAt',
    'git log --oneline --since="3 months ago"',
    'git log --since="3 months ago" --format="%h %s%n%b" | grep -i "fix\\|bug\\|broken"',
  ]) {
    assert.equal(vetCommand(cmd), null, `history-sources.md recommends "${cmd}" and it is refused: ${vetCommand(cmd)}`);
  }
});

// A heading carrying `$&` walked through the duplicate check, because
// String.replace reads `$&`, `` $` ``, `$'` and `$$` in the replacement as
// specials, so the gate modelled text the tool would not write. The replace_all
// branch was immune, which is why only its sibling leaked.
test('a heading containing a replacement special is still seen twice', () => {
  const dir = repo();
  // `$$` and not `$&`: `$&` re-inserts the matched text and `` $` `` re-inserts
  // the whole preceding document, which duplicates the heading by accident and
  // makes the assertion pass for the wrong reason. `$$` collapses to a single
  // `$`, so the modelled heading merely differs from the one the tool writes,
  // which is the defect and nothing else.
  const heading = '## 2026-09-10 — a $$ in a heading';
  const onDisk = `# Lessons\n\n${heading}\n\nBody.\nClass: input validation\n\n<!-- end -->\n`;
  fs.writeFileSync(path.join(dir, 'docs/LESSONS.md'), onDisk);
  const out = decide({
    tool_name: 'Edit',
    cwd: dir,
    tool_input: { file_path: path.join(dir, 'docs/LESSONS.md'), old_string: '<!-- end -->', new_string: `${heading}\n\nBody again.\n` },
  });
  assert.ok(codes(out).includes('deny_log_duplicate_heading'), JSON.stringify(codes(out)));
});

// The derivation matched `export function` only, and this file already uses
// `export const` for ticketPattern, so a repo-reading export written in arrow
// form would have got no contract and no failure.
test('the derived export list sees both declaration forms', () => {
  const both = "export function alpha({ cwd }) {}\nexport const beta = ({ cwd }) => {};\nexport const gamma = (cwd) => {};\nexport const delta = () => {};\n";
  assert.deepEqual(cwdTakingExportsIn(both), ['alpha', 'beta', 'gamma']);
});

// 2026-09-10. Two reviews in a row found this rule leaking one spelling at a
// time: `-o F` closed, then `-oF`, `-no` and `-o=F` open. A reader finds those
// one per round, which is the shape of a check that needs a generator rather
// than another pair of eyes. The human input here is the concept, what each
// allowlisted command can be made to write or run. The spellings are expanded
// mechanically, so a form nobody thought of is still covered.
//
// The map is deliberately independent of WRITE_LONG and WRITE_SHORT in the hook.
// Asserting the implementation's own tables against themselves would prove
// nothing, which is this log's 2026-09-09 entry in one line.
const DANGEROUS = {
  sort: { prefix: 'sort', short: ['o'], long: ['output'], booleans: 'nur', reads: ['sort -n f.txt', 'sort -T /tmp f.txt', 'sort -k2 f.txt', 'sort -t, -k1 f.txt'] },
  git: { prefix: 'git diff', long: ['output'], reads: ['git diff --name-only HEAD', 'git log --oneline', 'git grep -n pattern', 'git show --stat HEAD'] },
  rg: { prefix: 'rg', long: ['output', 'pre', 'pre-glob', 'hostname-bin'], reads: ['rg -n pattern', 'rg --json pattern'] },
  find: { prefix: 'find .', predicates: ['-delete', '-exec', '-execdir', '-ok', '-okdir', '-fprint', '-fprint0', '-fprintf', '-fls'], reads: ['find . -name "*.mjs"', 'find . -type f'] },
  uniq: { prefix: 'uniq', secondPath: true, reads: ['uniq -c f.txt', 'uniq -f 2 f.txt', 'uniq -s 3 f.txt', 'uniq f.txt'] },
  grep: { prefix: 'grep', reads: ['grep -o pattern f.txt', 'grep -rn pattern dir', 'grep -c pattern f.txt'] },
  gh: { prefix: 'gh issue list', reads: ['gh issue list --state closed --limit 200', 'gh pr list --state merged'] },
  ls: { prefix: 'ls', reads: ['ls -la'] },
  wc: { prefix: 'wc', reads: ['wc -l f.txt'] },
  cut: { prefix: 'cut', reads: ['cut -d, -f2 f.txt'] },
  head: { prefix: 'head', reads: ['head -n 5 f.txt'] },
  tail: { prefix: 'tail', reads: ['tail -n 5 f.txt'] },
  cat: { prefix: 'cat', reads: ['cat f.txt'] },
  tr: { prefix: 'tr', reads: ["tr -d ' ' f.txt"] },
};

// Every spelling of "hand this flag a path" that a shell accepts.
function spellings({ prefix, short = [], long = [], booleans = '', predicates = [], secondPath = false }) {
  const out = [];
  const victim = 'VICTIM.txt';
  for (const s of short) {
    out.push(`${prefix} -${s} ${victim}`, `${prefix} -${s}${victim}`, `${prefix} -${s}=${victim}`);
    for (const b of booleans) out.push(`${prefix} -${b}${s} ${victim}`, `${prefix} -${b}${s}${victim}`);
    out.push(`${prefix} f.txt -${s} ${victim}`);
  }
  for (const l of long) out.push(`${prefix} --${l} ${victim}`, `${prefix} --${l}=${victim}`);
  for (const pred of predicates) out.push(`${prefix} -name "*.js" ${pred} ${victim}`);
  if (secondPath) out.push(`${prefix} in.txt ${victim}`, `${prefix} -c in.txt ${victim}`, `${prefix} -f 2 in.txt ${victim}`);
  return out;
}

test('every allowlisted command is accounted for, so a new one cannot arrive unexamined', () => {
  assert.deepEqual(
    Object.keys(ALLOWED).sort(),
    Object.keys(DANGEROUS).sort(),
    'a command was added to or removed from ALLOWED; say here what it can be made to write or run, even if the answer is nothing',
  );
});

test('no spelling of a write or exec flag survives vetting, generated rather than listed', () => {
  let checked = 0;
  for (const [name, spec] of Object.entries(DANGEROUS)) {
    for (const cmd of spellings(spec)) {
      assert.ok(vetCommand(cmd), `${name}: "${cmd}" was vetted and it writes or runs something`);
      checked += 1;
      // Inside a pipeline too, since that is where a sweep line hides one.
      const piped = `grep -c x f.txt | ${cmd}`;
      assert.ok(vetCommand(piped), `${name}: "${piped}" was vetted and it writes or runs something`);
      checked += 1;
    }
  }
  assert.ok(checked >= 60, `the generator produced only ${checked} spellings, which is too few to be measuring anything`);
});

test('the read-only spellings of the same commands still pass', () => {
  for (const [name, spec] of Object.entries(DANGEROUS)) {
    for (const cmd of spec.reads ?? []) {
      assert.equal(vetCommand(cmd), null, `${name}: "${cmd}" is read-only and was refused: ${vetCommand(cmd)}`);
    }
  }
});
