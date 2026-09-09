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
import { decide, validateEntry, nominate, newEntries, vetCommand, observationMatches, touchedFiles } from './ledger-gate.mjs';

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
const v = (dir, body, nominated = []) => validateEntry({ date: 'd', title: 't', body }, { onDisk: LOG, nominated, cwd: dir }).map((f) => f.code);

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
