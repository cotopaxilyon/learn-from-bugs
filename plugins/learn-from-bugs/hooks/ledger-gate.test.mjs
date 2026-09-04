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
- 2026-06-11: same-theme
- 2026-04-02: same-theme
- 2026-02-09: same-theme
Landed: 2 round-trip test at the calendar boundary, red: fails on 2026-02-30 before the fix
Landed: 3 test/dates.test.js header names the convention
Critic: ran
`;

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
  assert.ok(!w('new — nothing in the log covers it').includes('deny_class_unknown'));
  assert.ok(w('new —').includes('deny_class_unknown'));
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
  assert.ok(v(null, GOOD.replace('- 2026-02-09: same-theme', '- 2026-02-10: same-theme')).includes('deny_prior_not_in_log'));
  assert.ok(v(null, GOOD.replace('- 2026-02-09: same-theme', '- 2026-02-09: related').replace('Instance: 4', 'Instance: 3')).includes('deny_prior_disposition'));
});

test('a git-nominated prior the entry does not dispose of is denied', () => {
  assert.ok(v(null, GOOD.replace('- 2026-04-02: same-theme\n', '').replace('Instance: 4', 'Instance: 3'), ['2026-04-02']).includes('deny_prior_not_dispositioned'));
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
  const logDates = new Set(['2026-06-11', '2026-04-02', '2026-02-09']);
  const dir = repo({ touch: ['src/dates.js'], backdate: { 'src/dates.js': ['2026-02-09', '2026-04-02', '2026-06-11'], 'src/other.js': ['2026-02-09'] } });
  assert.deepEqual(nominate({ cwd: dir, logPath: path.join(dir, 'docs/LESSONS.md'), logDates }), ['2026-02-09', '2026-04-02', '2026-06-11']);
  const dir2 = repo({ touch: ['src/other.js'], backdate: { 'src/dates.js': ['2026-04-02'], 'src/other.js': ['2026-02-09'] } });
  assert.deepEqual(nominate({ cwd: dir2, logPath: path.join(dir2, 'docs/LESSONS.md'), logDates }), ['2026-02-09']);
});

test('committing the fix before writing the entry still nominates it', () => {
  const logDates = new Set(['2026-06-11', '2026-04-02', '2026-02-09']);
  const dir = repo({ touch: ['src/dates.js'], backdate: { 'src/dates.js': ['2026-04-02'] }, commitTouched: true });
  assert.deepEqual(nominate({ cwd: dir, logPath: path.join(dir, 'docs/LESSONS.md'), logDates }), ['2026-04-02']);
});

test('a dirty tree is the fix; HEAD contributes nothing to it', () => {
  // The union rule dragged in every file of an unrelated HEAD commit. Here
  // HEAD touches src/other.js, whose history carries a log-heading date, and
  // the fix is src/dates.js. Only the fix's dates may be nominated.
  const logDates = new Set(['2026-06-11', '2026-04-02', '2026-02-09']);
  const dir = repo({ backdate: { 'src/other.js': ['2026-02-09'], 'src/dates.js': ['2026-04-02'] }, touch: ['src/dates.js'] });
  assert.deepEqual(touchedFiles({ cwd: dir, logPath: path.join(dir, 'docs/LESSONS.md') }), ['src/dates.js']);
  assert.deepEqual(nominate({ cwd: dir, logPath: path.join(dir, 'docs/LESSONS.md'), logDates }), ['2026-04-02']);
});

test('with only the log dirty, the set is every file changed since the log was last committed', () => {
  // The shape that broke the earlier clean-tree wording: fix A, commit, write
  // entry A, fix B, commit B, and the log is still uncommitted. B must nominate.
  const logDates = new Set(['2026-06-11', '2026-04-02', '2026-02-09']);
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
  assert.deepEqual(nominate({ cwd: dir, logPath, logDates }), ['2026-02-09', '2026-04-02']);
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
  const logDates = new Set(['2026-06-11', '2026-04-02', '2026-02-09']);
  const dir = repo({ backdate: { 'src/dates.js': ['2026-04-02'], 'src/other.js': ['2026-02-09'] } });
  const logPath = path.join(dir, 'docs/LESSONS.md');
  assert.deepEqual(touchedFiles({ cwd: dir, logPath }).sort(), ['src/dates.js', 'src/other.js']);
  assert.deepEqual(nominate({ cwd: dir, logPath, logDates }), ['2026-02-09', '2026-04-02']);
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
    nominate({ cwd: dir, logPath: path.join(dir, 'docs/LESSONS.md'), logDates: new Set(['2026-09-04']) }),
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
  const entry = GOOD.replace('- 2026-04-02: same-theme\n', '').replace('Instance: 4', 'Instance: 3');
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
