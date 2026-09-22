#!/usr/bin/env node
// PreToolUse gate on the incident log. A new entry lands only with the trailing
// block SKILL.md step 6 specifies, and the block's claims are checked against the
// log, the git history, and the repo itself rather than read as prose. What it
// binds: the label set, the prior entries, the git-nominated priors, the instance
// arithmetic, the mechanism numbers, and that every Sweep command runs and its
// observation matches the output. What it cannot bind: whether a disposition or
// a level is right, which is the critic's question. Cooperative backstop: a
// Bash-side write bypasses it.
//
// Modes: LFB_LEDGER_MODE=block (default) | warn | off. Unknown values block.
// Log name: LFB_LOG_NAME (default LESSONS.md); hooks.json filters on the same.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const LEVELS = ['call-site', 'contract', 'convention', 'process'];
export const DISPOSITIONS = ['same-theme', 'adjacent', 'unrelated'];
export const BUCKETS = ['missing', 'unread', 'unrecorded', 'misunderstood', 'none'];
// Who caught each member of a theme. Not the issue block's dispositions: a
// member row answers "who found this one", not "how does it relate to that one".
export const CAUGHT_BY = ['qa', 'user', 'agent', 'nobody'];
// A theme entry has to account for every entry git nominates, and the honest
// account for most of them is "not part of this theme". Without a way to say
// that, requiring a row per nomination would force false membership: on this
// repo git nominates 14 of the log's entries against a working tree that
// touches the skill files. So a row is either a member, ending in who caught
// it, or a dismissal. Dismissals do not count toward Count: and are not looked
// for in the Window.
export const NOT_A_MEMBER = 'not-a-member';
export const MEMBER_DISPOSITIONS = [...CAUGHT_BY, NOT_A_MEMBER];
// A ticket id is checked for form only. The gate does not reach a tracker, and
// a member row's id is bound to the Window output rather than to a real ticket.
export const ticketPattern = (env = process.env) =>
  new RegExp(env.LFB_TICKET_PATTERN ?? '^([A-Z][A-Z0-9]+-\\d+|#\\d+)$');
// Read-only commands a Sweep or Priors line may name. Anything else is refused,
// since the gate executes the line. `gh` is two levels deep: the subcommand and
// the verb both have to be read-only, so `gh issue list` runs and `gh issue
// delete` does not.
// git subcommands deliberately absent, and why: checkout, restore, stash, clean,
// reset. Each rewrites the working tree from the index, so each can silently
// destroy the uncommitted work the entry is about. `git checkout -- <file>` did
// exactly that to this skill's own SKILL.md on 2026-09-04, discarding two
// sessions of edits to answer a question a read would have answered. A sweep
// command never needs one.
export const ALLOWED = {
  git: ['log', 'diff', 'show', 'grep', 'ls-files', 'blame', 'rev-list', 'status'],
  gh: ['issue', 'pr'],
  grep: null, rg: null, find: null, ls: null, wc: null, sort: null, uniq: null,
  cut: null, head: null, tail: null, cat: null, tr: null,
};
const GH_VERBS = ['list', 'view'];
// Being on the allowlist is not the same as being read-only. Some of these
// commands write a file, or run another program, when asked, with no shell
// redirect for the redirection check to catch. The first version of this matched
// whole tokens, so it closed `sort -o F` and left `-oF`, `-no` and `-o=F`: a
// denylist matching text rather than concepts leaks one spelling at a time.
// Short flags are walked as a cluster now, stopping at the first letter that
// takes a value, so `sort -Tsomeodir` is not mistaken for one.
// Long flags that hand a command a file to write or a program to run. Global,
// because none of them is ever wanted in a retrieval whose output we read.
const WRITE_LONG = new Set(['output', 'output-file', 'open-files-in-pager', 'pre', 'pre-glob', 'hostname-bin', 'exec', 'execdir']);
// Short flags that write, per command, because the same letter differs: `sort -o`
// writes a file and `grep -o` prints the matching part.
const WRITE_SHORT = { sort: 'o' };
// Short flags whose next characters are their value, so the walk stops there
// rather than reading the value as more flags.
const SHORT_TAKES_VALUE = { sort: 'ktTSo', uniq: 'fswD', head: 'nc', tail: 'nc', cut: 'dfbc', grep: 'emABC', rg: 'emABC' };
// find writes through predicates rather than flags, and BSD and GNU differ, so
// the ones GNU has are refused whether or not this machine's find has them.
const FIND_WRITES = ['-delete', '-exec', '-execdir', '-ok', '-okdir', '-fprint', '-fprint0', '-fprintf', '-fls'];
// Commands whose second positional argument is an output file.
const SECOND_PATH_WRITES = new Set(['uniq']);

function writesAFile(argv) {
  const bin = argv[0];
  let positionals = 0;
  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '-' || !arg.startsWith('-')) { positionals += 1; continue; }
    if (arg.startsWith('--')) {
      const name = arg.slice(2).split('=')[0];
      if (WRITE_LONG.has(name)) return `${bin} may not be given \`--${name}\`; the gate reads, it does not write or run`;
      continue;
    }
    const writes = WRITE_SHORT[bin] ?? '';
    const takesValue = SHORT_TAKES_VALUE[bin] ?? '';
    const cluster = arg.slice(1);
    for (let c = 0; c < cluster.length; c += 1) {
      const ch = cluster[c];
      if (writes.includes(ch)) return `${bin} may not be given \`-${ch}\`; that names a file to write and the gate reads`;
      if (takesValue.includes(ch)) {
        // The value is the rest of the token, or the next one when the token
        // ends here. Counting that next token as a path is what refused
        // `uniq -f 2 dup.txt`, telling an author to pass one path when they had.
        if (c === cluster.length - 1) i += 1;
        break;
      }
    }
  }
  if (bin === 'find' && argv.some((a) => FIND_WRITES.includes(a))) return 'find may not delete, exec, or print to a file';
  if (SECOND_PATH_WRITES.has(bin) && positionals > 1) return `${bin} writes its second file argument; pass one path, or pipe into it`;
  return null;
}

const HEADING = /^## (\d{4}-\d{2}-\d{2})\s*[—–-]\s*(.+)$/;
const DASH = '[—–-]';

function headingsIn(text) {
  const out = [];
  for (const line of text.split('\n')) {
    const m = line.match(HEADING);
    if (m) out.push({ date: m[1], title: m[2].trim() });
  }
  return out;
}

// A prior row names one entry, not one day. Seven entries in this project's own
// log share 2026-08-31 and three share 2026-09-01, so a row keyed by date said
// "one of these seven" and the gate scored it as a match on all of them. The key
// is the date plus a substring of that entry's heading title, and it has to
// resolve to exactly one entry or the row is refused.
function entryKey(h) { return `${h.date} ${h.title}`; }

export function resolvePrior(date, slug, headings) {
  const onDay = headings.filter((h) => h.date === date);
  const needle = String(slug ?? '').trim().toLowerCase();
  if (!needle) return { matches: [], onDay };
  return { matches: onDay.filter((h) => h.title.toLowerCase().includes(needle)), onDay };
}

export function entriesIn(text) {
  const lines = text.split('\n');
  const starts = [];
  lines.forEach((l, i) => { if (HEADING.test(l)) starts.push(i); });
  return starts.map((s, k) => {
    const end = starts[k + 1] ?? lines.length;
    const m = lines[s].match(HEADING);
    return { date: m[1], title: m[2].trim(), body: lines.slice(s, end).join('\n') };
  });
}

// The label a Class: line carries, minted or reused: the `new —` prefix stripped
// and the reason after the first `;` dropped. Both sides of the reuse check
// normalize through here, so what a mint registers is what a later entry types.
// The mint shape, in one place because two copies of it drifted apart within a
// week: `Theme: new — everything is people not reading the docs` was accepted
// while the identical `Class:` form was refused, and the merged label namespace
// then made that sentence reusable.
export function mintShapeFault(value) {
  const isNew = new RegExp(`^new\\s*${DASH}\\s*\\S`, 'i').test(value);
  if (!isNew) return null;
  if (!value.includes(';') || !labelOf(value)) {
    return 'a mint names its label before the reason: "new — <the label>; <why no existing label fits>"';
  }
  return null;
}

export function labelOf(value) {
  const stripped = value.replace(new RegExp(`^new\\s*${DASH}\\s*`, 'i'), '');
  return stripped.split(';')[0].trim().toLowerCase();
}

// Minted labels join the set. They did not, so the set could only ever grow from
// a bare label, which the gate refuses unless it is already in the set: the label
// reuse the backward sweep depends on was unreachable by construction, and every
// entry could only mint again. Found on 2026-09-04 by writing an entry that
// wanted the label the 2026-09-03 entry had minted.
function classLabelsIn(text) {
  const set = new Set();
  // Harvested body-wide, this took any line opening "Class:" or "Theme:",
  // including one written in prose, so a sentence could register a label the
  // gate would then accept from anybody. The block sits at the end of an entry
  // and carries one label, so each entry contributes its last such line and
  // nothing else.
  for (const entry of entriesIn(text)) {
    const found = [...entry.body.matchAll(/^(?:Class|Theme):[ \t]*(.+?)\s*$/gm)];
    if (found.length === 0) continue;
    const label = labelOf(found[found.length - 1][1].trim());
    if (label) set.add(label);
  }
  return set;
}

// Dates of log entries whose day matches a commit touching a file this fix
// touches: the working tree, the index, and the commit at HEAD, so committing
// the fix before writing the entry does not empty the set. This is the
// mechanical half of the backward sweep: the agent disposes of what git
// nominates, it does not choose the candidates.
// The files this fix touches, in three steps, first non-empty wins. Uncommitted
// work is the fix. Otherwise every file changed since the log was last
// committed, so a fix landed in several commits, or an audit committed per
// site, is still one fix. Otherwise the HEAD commit, for a repo whose log has
// never been committed. Unioning all three was wrong: it dragged in every file
// of an unrelated HEAD commit and nominated dates the fix never touched.
// 2026-09-10. Every function below reads the repo, and every one of them used
// to answer `[]` when handed a cwd it could not use. `[]` is the answer to "what
// did this fix touch", so an unusable cwd read as "nothing", which is a
// different question answered confidently. The contract is stated once here and
// asserted against the module's own exports in the test file, so a new
// repo-reading export is covered without anyone remembering to cover it.
export function requireCwd(cwd, fn) {
  if (typeof cwd !== 'string' || cwd === '') {
    throw new Error(`${fn}: cwd must be a non-empty string, got ${JSON.stringify(cwd)}. An empty result here would read as "this fix touched nothing" rather than "the repo could not be read".`);
  }
}

// An empty LFB_LOG_NAME turned the gate off outright: `??` defaults on null and
// undefined only, so `""` survived, no basename ever equalled it, and every
// write returned null. Normalising to the default is a substitution, but it is
// the one that fails closed, so it is made explicit rather than incidental.
export function logNameFrom(env) {
  const raw = env.LFB_LOG_NAME;
  return typeof raw === 'string' && raw !== '' ? raw : 'LESSONS.md';
}

// Where the repo starts, or null when git cannot say. The hook is handed
// whatever directory the session runs in, which is not always the repo root, and
// git answers in two different coordinate systems from down there: `git diff
// --name-only` names files from the root while `git ls-files --others` names
// them from the cwd. Reading everything from the root makes one system of them.
// git answers with the real path, and the caller's cwd may reach it through a
// symlink: on macOS every temp directory does, /var being a link to /private/var.
// Relativising one against the other without this produces a path of `..` hops
// that matches nothing.
function realpath(p) {
  try { return fs.realpathSync(p); } catch { return p; }
}

export function repoRoot(cwd) {
  requireCwd(cwd, 'repoRoot');
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch { return null; }
}

// What counts as this work: the files, and the git arguments that print the
// change they carry. One function so a referent is read against the same change
// it was admitted by; touchedFiles and addedLines each kept their own copy of
// this branching would drift the first time one of them was fixed.
function thisWork({ cwd, logPath, env = process.env }) {
  const root = repoRoot(cwd) ?? cwd;
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const base = logPath ? path.basename(logPath) : logNameFrom(env);
  const clean = (list) => [...new Set(list)].filter((f) => f && path.basename(f) !== base);
  const head = () => ({ files: clean(git(['show', '--name-only', '--format=', 'HEAD']).split('\n')), diff: ['show', '--format=', 'HEAD'] });
  try {
    const dirty = clean([
      ...git(['diff', '--name-only', 'HEAD']).split('\n'),
      ...git(['diff', '--name-only', '--cached']).split('\n'),
    ]);
    if (dirty.length) return { files: dirty, diff: ['diff', 'HEAD'] };
    // Pathspec has to be the repo-relative path: `-- LESSONS.md` does not match
    // `docs/LESSONS.md`. With no logPath there is nothing to measure from, so
    // fall through to HEAD rather than handing git a path outside the repo.
    if (!logPath) return head();
    const rel = path.relative(root, realpath(logPath)) || base;
    const lastLogCommit = git(['log', '-1', '--format=%H', '--', rel]).trim();
    if (lastLogCommit) {
      const range = `${lastLogCommit}..HEAD`;
      return { files: clean(git(['diff', '--name-only', range]).split('\n')), diff: ['diff', range] };
    }
    return head();
  } catch { return { files: [], diff: null }; }
}

export function touchedFiles({ cwd, logPath, env = process.env }) {
  requireCwd(cwd, 'touchedFiles');
  return thisWork({ cwd, logPath, env }).files;
}

// The lines this work added to one repo-relative path. A file the fix created
// is added whole, since git diff never lists it.
export function addedLines({ cwd, logPath, env = process.env, rel }) {
  requireCwd(cwd, 'addedLines');
  const root = repoRoot(cwd) ?? cwd;
  if (untrackedFiles({ cwd }).includes(rel)) return fs.readFileSync(path.join(root, rel), 'utf8').split('\n');
  const { diff } = thisWork({ cwd, logPath, env });
  if (!diff) return [];
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  try {
    // A renamed file named alone diffs as wholly added, so renaming a template
    // that already asked something would clear the row. Pair it with its old
    // path and git reads the rename as the edit it is.
    const renamed = git([...diff, '-M', '--name-status', '--no-color'])
      .split('\n').map((l) => l.split('\t')).find((f) => /^R\d*$/.test(f[0]) && f[2] === rel);
    const paths = renamed ? [renamed[1], rel] : [rel];
    const out = git([...diff, '-M', '--no-color', '--no-ext-diff', '--', ...paths]);
    return out.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1));
  } catch { return []; }
}

// A question added to a template shows as a question mark ending a phrase, or
// an unticked box. "Ending a phrase" is what keeps code out: a ternary has a
// space before its ?, `?.` and `??` and `x?:` run into more punctuation, and a
// URL's query runs into a letter. Any ? at all let a 4 row over a code file
// pass on the first optional chain.
const QUESTION = /[\p{L}\p{N})"'”’*_`]\?(?=$|[\s"')\]”’*_`])/u;
const asksSomething = (line) => QUESTION.test(line) || /^\s*[-*]\s+\[ \]/.test(line);

// Nominations are entries too. Keyed by date, a nomination against a day
// carrying seven entries asked for one row, took a verdict on whichever one the
// author picked, and left six unread with the gate green: a precise row against
// an imprecise nomination is a check that cannot fail. Every entry on a
// nominated day is nominated.
// Is git answering at all? The catches below return [] on failure, and an empty
// set is indistinguishable from "this fix touched nothing" unless something
// asks. Without this the gate said "that file is not among the files this fix
// touched" in a directory where git was never reachable, which is a confident
// claim about work it could not see.
export function gitReachable(cwd) {
  requireCwd(cwd, 'gitReachable');
  try {
    execFileSync('git', ['rev-parse', '--git-dir'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return true;
  } catch { return false; }
}

// Whether git can answer the backward sweep at all, which is a stronger question
// than whether a .git directory exists: a repo with no commits answers
// rev-parse --git-dir and still cannot produce one prior, because every path
// into nomination runs through the commit history. The catches below return []
// on failure and an empty nomination reads as "nothing to answer for", so
// something has to ask.
export function gitHasHistory(cwd) {
  requireCwd(cwd, 'gitHasHistory');
  try {
    execFileSync('git', ['rev-parse', '--verify', 'HEAD'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return true;
  } catch { return false; }
}

// Files the fix created. `git diff --name-only HEAD` never lists these, so a
// convention-level fix whose whole point is a new shared helper could not name
// the file it added. Referent-only: nomination has no use for a file with no
// history, and widening the touched set would change what nominates.
export function untrackedFiles({ cwd }) {
  requireCwd(cwd, 'untrackedFiles');
  try {
    return execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: repoRoot(cwd) ?? cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\n').map((f) => f.trim()).filter(Boolean);
  } catch { return []; }
}

export function nominate({ cwd, logPath, headings }) {
  requireCwd(cwd, 'nominate');
  const git = (args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const files = touchedFiles({ cwd, logPath });
  const byDate = new Map();
  for (const h of headings) {
    if (!byDate.has(h.date)) byDate.set(h.date, []);
    byDate.get(h.date).push(h);
  }
  const out = new Map();
  for (const f of files) {
    try {
      for (const d of git(['log', '--date=short', '--format=%ad', '--', f]).split('\n')) {
        if (d && byDate.has(d)) for (const h of byDate.get(d)) out.set(entryKey(h), h);
      }
    } catch { /* untracked, nothing to nominate from */ }
  }
  return [...out.values()].sort((a, b) => entryKey(a).localeCompare(entryKey(b)));
}

// Split on shell metacharacters that sit outside quotes. A `|` inside a quoted
// argument is data, not a pipe: `gh issue list --jq '.[] | .number'` is one
// command, and treating its filter as a pipeline refused a legitimate retrieval.
function splitUnquoted(cmd, chars) {
  const out = [];
  let cur = '';
  let quote = null;
  for (const ch of cmd) {
    if (quote) {
      if (ch === quote) quote = null;
      cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
    } else if (chars.includes(ch)) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return { parts: out, unterminated: quote !== null };
}

function argvOf(seg) {
  // Tokenize on unquoted whitespace, then strip surrounding quotes per token.
  const { parts } = splitUnquoted(seg.trim(), ' \t');
  return parts.filter(Boolean).map((t) => t.replace(/^(['"])(.*)\1$/s, '$2'));
}

// A single pipeline of allowlisted read-only commands, or a refusal reason.
export function vetCommand(cmd) {
  const { unterminated } = splitUnquoted(cmd, '');
  if (unterminated) return 'unbalanced quote';
  const { parts: dangerous } = splitUnquoted(cmd, '<>;&`$\n');
  if (dangerous.length > 1) return 'redirection, chaining, or substitution is not allowed';
  const { parts: segs } = splitUnquoted(cmd, '|');
  for (const seg of segs) {
    const argv = argvOf(seg);
    const bin = argv[0];
    if (!bin) return 'empty command in the pipeline';
    if (!(bin in ALLOWED)) return `"${bin}" is not a read-only command the gate will run (${Object.keys(ALLOWED).join(', ')})`;
    if (ALLOWED[bin] && !ALLOWED[bin].includes(argv[1])) return `${bin} ${argv[1] ?? ''} is not one of ${ALLOWED[bin].join(', ')}`;
    if (bin === 'gh' && !GH_VERBS.includes(argv[2])) return `gh ${argv[1]} ${argv[2] ?? ''} is not one of ${GH_VERBS.join(', ')}`;
    const writes = writesAFile(argv);
    if (writes) return writes;
  }
  return null;
}

export function runCommand(cmd, cwd) {
  requireCwd(cwd, 'runCommand');
  try {
    return { out: execFileSync('sh', ['-c', cmd], { cwd, encoding: 'utf8', timeout: 8000, maxBuffer: 4e6, stdio: ['ignore', 'pipe', 'pipe'] }), ok: true };
  } catch (e) {
    // grep exits 1 on no match; that is an empty result, not a failure.
    return { out: String(e.stdout ?? ''), ok: e.status === 1 && !String(e.stderr ?? '').trim() };
  }
}

// The observation must carry something only the output could have supplied:
// a number equal to the output's line count, "nothing"/"none" against empty
// output, a double-quoted fragment found verbatim, or a token of 8+ characters
// found verbatim (a path, an identifier).
export function observationMatches(observation, out) {
  const lines = out.split('\n').filter((l) => l.trim() !== '');
  const obs = observation.trim();
  if (obs === '') return false;
  if (lines.length === 0 && /\b(nothing|none|no (matches|hits|results)|0)\b/i.test(obs)) return true;
  for (const m of obs.matchAll(/\b(\d+)\b/g)) if (Number(m[1]) === lines.length) return true;
  for (const m of obs.matchAll(/"([^"]{4,})"/g)) if (out.includes(m[1])) return true;
  for (const tok of obs.split(/\s+/)) {
    const t = tok.replace(/^[("'`,.]+|[)"'`,.:;]+$/g, '');
    if (t.length >= 8 && out.includes(t)) return true;
  }
  return false;
}

export function splitSearchLine(v) {
  const m = v.match(/^`([^`]+)`\s*(?:→|->|=>)?\s*(.*)$/);
  return m ? { cmd: m[1].trim(), observation: m[2].trim() } : null;
}

// Returns [] when the entry passes, else a list of {code, detail}.
// Landed rows, shared by both blocks. The mechanism number is a claim: a check
// that has never been red against the defect is not a 1, whatever it is wired
// into. A theme entry additionally has to end each row in a referent, because a
// theme's whole risk is landing as prose about a pattern with nothing to point
// at.
function landedRows({ body, fails, cwd, env, logPath, requireReferent }) {
  const landed = [...body.matchAll(/^Landed:[ \t]*(\d{1,2})\b(.*)$/gm)].map((m) => ({ n: Number(m[1]), rest: m[2] }));
  if (landed.length === 0) {
    fails.push({ code: 'deny_missing_field', detail: 'Landed: <mechanism 1-10> <what>' });
    return;
  }
  let touched = null;
  for (const l of landed) {
    if (l.n < 1 || l.n > 10) fails.push({ code: 'deny_landed_rank', detail: `Landed: ${l.n} is not a step 5 mechanism (1-10)` });
    if ((l.n === 1 || l.n === 2) && !/\bred:/.test(l.rest)) fails.push({ code: 'deny_landed_no_red', detail: `Landed: ${l.n} claims a check or test; add "red: <how it was seen failing against the defect>" or claim the narrower number` });
    if (!requireReferent) continue;
    const tail = l.rest.split(',').pop().trim();
    if (!tail || l.rest.indexOf(',') === -1) {
      fails.push({ code: 'deny_landed_no_referent', detail: `Landed: ${l.n} ends in no referent; finish the row ", <path this fix touched | ticket id>"` });
      continue;
    }
    if (ticketPattern(env).test(tail)) continue;
    if (cwd === null) continue; // null is the only skip; anything else was refused at the boundary
    if (!gitReachable(cwd)) {
      fails.push({ code: 'deny_landed_referent_unverifiable', detail: `git does not answer here, so whether "${tail}" is part of this work cannot be checked. Run this where the repo is, or claim a ticket id instead.` });
      continue;
    }
    if (touched === null) {
      const changed = touchedFiles({ cwd, logPath, env });
      // Untracked paths count only alongside a real change. `git ls-files
      // --others` is every uncommitted non-ignored path in the tree, not the
      // files this fix created, so on its own it turned the rule into "name a
      // file that exists and is not committed": on a clean tree with no fix at
      // all, `touch the-rule.md` was an acceptable referent.
      touched = new Set(changed.length ? [...changed, ...untrackedFiles({ cwd })] : []);
    }
    // Root-relative, because that is how git named everything in `touched`.
    const rel = path.relative(repoRoot(cwd) ?? cwd, realpath(path.resolve(cwd, tail)));
    if (!fs.existsSync(path.resolve(cwd, tail))) {
      fails.push({ code: 'deny_landed_referent_unresolved', detail: `"${tail}" is not a path in this repo and does not match ${ticketPattern(env).source}. Paths here are written from the repo root, the way \`git diff --name-only\` prints them, whatever directory you are working in.` });
    } else if (!touched.has(rel)) {
      // The empty-touched message used to say "nothing has changed since the log
      // was last committed", which is false when the change is a new untracked
      // file sitting right there, and it named no way out. Untracked paths count
      // only beside a tracked change, so `git add` is the way out and the deny
      // says it rather than leaving the author to work it out.
      const staysUntracked = touched.size === 0 && untrackedFiles({ cwd }).includes(rel);
      fails.push({ code: 'deny_landed_referent_untouched', detail: staysUntracked
        ? `"${tail}" is untracked and nothing else here has changed, so git cannot tell it from a stray file this work never touched. Run \`git add ${rel}\` and the row stands.`
        : touched.size === 0
          ? `"${tail}" exists, but nothing has changed since the log was last committed, so there is no work here for it to be part of`
          : `"${tail}" exists but is not among the files this fix touched or created, so the row points at something this work did not change` });
    } else if (l.n === 4 && !addedLines({ cwd, logPath, env, rel }).some(asksSomething)) {
      // 4 is the one number whose claim the diff can show. The rest are the
      // author's word: a red check is green by the time the entry is written,
      // and a relocation's origin is usually somewhere the repo cannot see.
      fails.push({ code: 'deny_landed_question_not_added', detail: `Landed: 4 claims a question added to a template, but nothing this work added to "${tail}" asks one (no line with a "?" ending a phrase, and no "- [ ]" box). Claim 3, a written-down rule, or add the question.` });
    }
  }
}

// The theme block's member-row region and its parsed rows: the rows sit in one
// place by definition, between the header fields (Count/Window/Theme) and
// Bucket:/Landed:/Critic:, so that is where they are read from. Falling back to
// the whole body when the anchor is missing keeps a block with no Count: from
// losing its rows as well as its count. Exported so the gate and a reader
// grading a theme entry (evals/score.mjs) share one parse rather than each
// keeping its own copy of the anchor/close logic.
export function themeMemberRows(body) {
  const bodyLines = body.split('\n');
  const anchor = bodyLines.findIndex((l) => /^(Count|Window|Theme):/.test(l.trim()));
  const closes = bodyLines.findIndex((l, i) => i > anchor && /^(Bucket|Landed|Critic):/.test(l.trim()));
  const region = anchor === -1 ? bodyLines : bodyLines.slice(anchor + 1, closes === -1 ? bodyLines.length : closes);
  const rows = region
    .map((l) => l.trim())
    .map((l) => ({ l, m: l.match(/^- (.+?):[ \t]*([a-z-]+)$/) }))
    .filter(({ m }) => m)
    .map(({ l, m }) => ({ key: m[1].trim(), caught: m[2], raw: l }));
  return { bodyLines, anchor, closes, region, rows };
}

// A theme entry records a recurring pattern across incidents, so it has no
// single fix diff and git cannot nominate for it. Its members are named by the
// author and bound to an executed retrieval instead: the Window runs, its line
// count has to equal the stated N, and every member row has to appear in what
// that command returned. The block is otherwise the issue block's sibling.
function validateThemeEntry({ body, field, need, fails, onDisk, nominated, cwd, env, logPath }) {
  const theme = need('Theme');
  if (theme) {
    const known = classLabelsIn(onDisk);
    const isNew = new RegExp(`^new\\s*${DASH}\\s*\\S`, 'i').test(theme);
    if (!isNew && !known.has(labelOf(theme))) {
      fails.push({ code: 'deny_class_unknown', detail: `"${theme}" matches no Class: or Theme: in the log; reuse one, or write "Theme: new — <label>; <why no existing label fits>"` });
    }
    const fault = mintShapeFault(theme);
    if (fault) fails.push({ code: 'deny_class_mint_shape', detail: fault });
  }

  // Nomination does not apply, and Priors: is the issue block's field. An entry
  // carrying both is two blocks in a trench coat, and the deny says which.
  if (field('Priors') !== null) {
    fails.push({ code: 'deny_theme_has_priors', detail: 'a theme entry has no single fix diff for git to nominate from, so it carries Window: and member rows rather than Priors:. Drop the Priors: line, or write this as an issue entry with Class:.' });
  }

  const headings = headingsIn(onDisk);
  // The scan used to read the whole body, so a prose bullet anywhere above the
  // block was claimed as a member row. themeMemberRows is the single copy of
  // where the rows sit and how they parse.
  const { bodyLines, region: rowRegion, rows: memberLines } = themeMemberRows(body);
  // A row that misses the shape used to be dropped without a word, and surfaced
  // later as a Count mismatch naming the wrong problem. Same treatment the issue
  // block gives a malformed prior row: any bullet in the rows region is either a
  // row or an error.
  for (const line of rowRegion.map((l) => l.trim())) {
    if (!/^[-*\u2013\u2014\u2022]/.test(line)) continue;
    if (memberLines.some((r) => r.raw === line)) continue;
    fails.push({ code: 'deny_member_malformed', detail: `"${line}" sits among the member rows and is not one. A row is "- <YYYY-MM-DD> <words from that entry's heading>: ${MEMBER_DISPOSITIONS.join(' | ')}" or "- <ticket-id>: <the same>", one space after the dash and the disposition in lower case. Dropped silently before 2026-09-10, taking its claimed member with it.` });
  }
  // A row that looks like a member row but sits outside the region is a
  // placement mistake, and it used to surface as "Count: 3 but 0 member row(s)
  // follow it", which names the wrong problem and leads to "Count: must be an
  // integer ≥ 1" if followed. Say where the rows go.
  const outside = bodyLines
    .map((l) => l.trim())
    .filter((l) => !rowRegion.map((x) => x.trim()).includes(l))
    .filter((l) => /^- (.+?):[ \t]*([a-z-]+)$/.test(l))
    .filter((l) => {
      const key = l.match(/^- (.+?):/)[1].trim();
      return /^\d{4}-\d{2}-\d{2}\b/.test(key) || ticketPattern(env).test(key);
    });
  for (const line of outside) {
    fails.push({ code: 'deny_member_misplaced', detail: `"${line}" reads as a member row but sits outside the rows. They go together, under \`Count:\` and above \`Bucket:\`, and only rows written there are counted.` });
  }
  const tickets = [];
  const seen = new Set();
  for (const r of memberLines) {
    if (!MEMBER_DISPOSITIONS.includes(r.caught)) {
      fails.push({ code: 'deny_member_disposition', detail: `"${r.raw}" ends in "${r.caught}", which is not one of ${MEMBER_DISPOSITIONS.join(' | ')}` });
    }
    const dismissed = r.caught === NOT_A_MEMBER;
    const dated = r.key.match(/^(\d{4}-\d{2}-\d{2})(?:[ \t]+(.*))?$/);
    if (dated) {
      // Same key as a Priors: row, and refused the same way. A day is not an
      // entry; this log has seven entries on one of its days.
      const slug = (dated[2] ?? '').trim();
      const { matches, onDay } = resolvePrior(dated[1], slug, headings);
      if (onDay.length === 0) fails.push({ code: 'deny_member_date_unknown', detail: `${dated[1]} is not the date of any entry in the log` });
      else if (!slug) fails.push({ code: 'deny_member_bare_date', detail: `"${r.raw}" names a day, not an entry. Add words from the heading. On ${dated[1]}: ${onDay.map((h) => `"${h.title}"`).join('; ')}` });
      else if (matches.length === 0) fails.push({ code: 'deny_member_no_match', detail: `no entry on ${dated[1]} has "${slug}" in its heading` });
      else if (matches.length > 1) fails.push({ code: 'deny_member_ambiguous', detail: `"${slug}" matches ${matches.length} entries on ${dated[1]}, so the row does not say which is a member` });
      else if (seen.has(entryKey(matches[0]))) fails.push({ code: 'deny_member_duplicate', detail: `two rows name the same entry, "${matches[0].title}" (${dated[1]}); one row per member` });
      else seen.add(entryKey(matches[0]));
    } else if (ticketPattern(env).test(r.key)) {
      // One row per member holds for a ticket as much as for a log entry. The
      // dated branch deduped through `seen` and this one did not, so three rows
      // naming one ticket certified Count: 3 for a pattern with one incident
      // under it, in the block whose whole job is that the count is not
      // something you remember.
      if (seen.has(r.key)) fails.push({ code: 'deny_member_duplicate', detail: `two rows name the same ticket, ${r.key}; one row per member` });
      else {
        seen.add(r.key);
        if (!dismissed) tickets.push(r.key);
      }
    } else {
      fails.push({ code: 'deny_member_key', detail: `"${r.key}" is neither a log entry (a date plus words from its heading) nor a ticket id matching ${ticketPattern(env).source}` });
    }
  }

  const members = memberLines.filter((r) => r.caught !== NOT_A_MEMBER);
  const countRaw = need('Count');
  if (countRaw !== null && countRaw !== '') {
    const k = Number(countRaw);
    if (!Number.isInteger(k) || k < 1) fails.push({ code: 'deny_theme_count_shape', detail: 'Count: must be an integer ≥ 1' });
    else if (k !== members.length) fails.push({ code: 'deny_theme_count', detail: `Count: ${k} but ${members.length} member row(s) follow it; the count is derived from the rows, not asserted beside them, and ${NOT_A_MEMBER} rows are dismissals rather than members` });
  }

  // Blocker A. The issue block answers for every nomination and the theme block
  // answered for none, so writing `Theme:` instead of `Class:` bought silence on
  // the whole nominated set at no cost, and the saving was largest exactly when
  // nomination was heaviest. Selection between the two blocks is now free of a
  // reason to prefer one.
  for (const e of nominated ?? []) {
    if (!seen.has(entryKey(e))) {
      fails.push({ code: 'deny_theme_ignores_nomination', detail: `git nominates "${e.title}" (${e.date}), a commit on a file this work touches sharing its day; add "- ${e.date} <words from that heading>: ${CAUGHT_BY.join(' | ')}", or ": ${NOT_A_MEMBER}" if it is not part of this theme` });
    }
  }

  // The Window is executed and its line count has to match the stated N, so the
  // number is read off the command's output rather than typed. Member ticket
  // ids then have to appear in that output: an id nobody retrieved is a claim.
  const windowLine = need('Window');
  if (windowLine) {
    const parsed = splitSearchLine(windowLine);
    if (!parsed) {
      fails.push({ code: 'deny_sweep_no_command', detail: `Window: "${windowLine.slice(0, 60)}" is not \`<command>\` → <N> items` });
    } else {
      const vet = vetCommand(parsed.cmd);
      if (vet) fails.push({ code: 'deny_sweep_command_refused', detail: `\`${parsed.cmd}\`: ${vet}` });
      else if (cwd !== null) {
        const r = runCommand(parsed.cmd, cwd);
        if (!r.ok) fails.push({ code: 'deny_sweep_command_failed', detail: `\`${parsed.cmd}\` did not run cleanly here` });
        else {
          const lines = r.out.split('\n').filter((l) => l.trim() !== '');
          // Read the way observationMatches reads a Sweep observation: any
          // integer in the text may be the count, rather than whichever came
          // first. And "nothing" against an empty retrieval is a count, which
          // the plan said passed and which this refused.
          const nums = [...parsed.observation.matchAll(/\b(\d+)\b/g)].map((m) => Number(m[1]));
          const saysNothing = lines.length === 0 && /\b(nothing|none|no (matches|hits|results))\b/i.test(parsed.observation);
          if (nums.length === 0 && !saysNothing) fails.push({ code: 'deny_window_mismatch', detail: `Window: "${parsed.observation}" states no count; it must say how many items came back` });
          else if (nums.length > 0 && !nums.includes(lines.length)) fails.push({ code: 'deny_window_mismatch', detail: `Window: says ${nums.join(' or ')} but \`${parsed.cmd}\` returned ${lines.length} line(s)` });
          // The count was checked against the number written beside it and
          // against nothing else, so a one-item retrieval carried any number of
          // members and the members were never bound to the retrieval that was
          // supposed to have found them. Worst for a `--json` form, which is one
          // line however many items it holds.
          else if (lines.length < members.length) fails.push({ code: 'deny_window_too_small', detail: `Window: \`${parsed.cmd}\` returned ${lines.length} line(s) but ${members.length} member row(s) follow it, so the retrieval did not reach the members it is supposed to have found. A --json form is one line however many items it holds; drop it where something counts lines.` });
          for (const id of tickets) {
            const bare = id.replace(/^#/, '');
            if (!r.out.includes(bare)) fails.push({ code: 'deny_member_not_in_window', detail: `${id} is a member row but does not appear in what \`${parsed.cmd}\` returned` });
          }
        }
      }
    }
  }

  const bucket = need('Bucket');
  if (bucket && !BUCKETS.includes(bucket)) {
    fails.push({ code: 'deny_bucket', detail: `Bucket must be one of ${BUCKETS.join(' | ')}, got "${bucket}"` });
  }

  landedRows({ body, fails, cwd, env, logPath, requireReferent: true });

  const critic = need('Critic');
  if (critic && !['ran', 'not-run'].includes(critic)) {
    fails.push({ code: 'deny_critic', detail: `Critic must be ran | not-run, got "${critic}"` });
  }
  return fails;
}

// A field is read body-wide, not block-wide: the gate places no requirement on
// field order, so `need('Bucket')` and `need('Level')` have to find the line
// wherever it sits in the entry. Exported so a reader grading an entry (evals/
// score.mjs) reads fields the same way the gate accepts them, rather than
// scoping its own read to a slice of the body and disagreeing with the gate on
// a placement the gate blesses.
export function fieldOf(body, name) {
  // [ \t]* rather than \s*: a bare "Field:" must not capture the next line.
  const m = body.match(new RegExp(`^${name}:[ \\t]*(.*)$`, 'm'));
  return m ? m[1].trim() : null;
}

export function validateEntry(entry, { onDisk, nominated, cwd, env = process.env, logPath = null }) {
  // A caller with a cwd and no logPath used to get a different check rather than
  // an error: touchedFiles fell back to HEAD, so the touched set was whatever
  // the last commit held. A test helper took that path and every referent
  // assertion ran green against a set that could never be empty. An optional
  // argument with a silent fallback is where a check goes to hide, so the
  // combination is refused. decide() always passes both; nothing in production
  // reaches this.
  // The guard above was itself a truthiness test, which is the same class one
  // step nearer: `''` is falsy, so it read as the `cwd: null` safe mode and
  // skipped every check that reads the repo without saying so. The contract is
  // explicit instead. Only `null` means skip.
  if (cwd !== null) {
    if (typeof cwd !== 'string' || cwd === '') {
      throw new Error(`validateEntry: cwd must be a non-empty string, or null to skip every check that reads the repo. Got ${JSON.stringify(cwd)}, which is neither, and treating it as the skip mode turns the gate off in silence.`);
    }
    if (!logPath) {
      throw new Error('validateEntry: cwd was given without logPath. Which files a fix touched cannot be answered without knowing where the log is, and guessing produces a green that means nothing. Pass logPath, or pass cwd: null to skip every check that reads the repo.');
    }
  }
  const fails = [];
  const body = entry.body;
  const field = (name) => fieldOf(body, name);
  const need = (name) => {
    const v = field(name);
    if (v === null || v === '') fails.push({ code: 'deny_missing_field', detail: `${name}:` });
    return v;
  };

  // Which block this is. Carrying both is refused rather than resolved: an
  // entry that named a theme took the theme path and skipped every incident
  // rule, including the git nomination it was there to answer, so block
  // selection was free and the cheapest way past a refusal was to declare a
  // different block.
  const hasTheme = field('Theme') !== null;
  const hasClass = field('Class') !== null;
  if (hasTheme && hasClass) {
    fails.push({ code: 'deny_two_blocks', detail: 'this entry carries both Theme: and Class:, so it claims to be a theme and an incident at once. A theme entry has no fix diff and answers no nomination; an incident entry does both. Keep one and delete the other.' });
    return fails;
  }
  if (hasTheme) return validateThemeEntry({ body, field, need, fails, onDisk, nominated, cwd, env, logPath });

  const cls = need('Class');
  if (cls) {
    const known = classLabelsIn(onDisk);
    const isNew = new RegExp(`^new\\s*${DASH}\\s*\\S`, 'i').test(cls);
    if (!isNew && !known.has(labelOf(cls))) {
      fails.push({ code: 'deny_class_unknown', detail: `"${cls}" matches no Class: in the log; reuse one, or write "Class: new — <label>; <why no existing label fits>"` });
    }
    // A mint that is only a reason registers that reason as the label, and the
    // next instance cannot reuse a sentence written about this one. Shared with
    // the Theme half through mintShapeFault, because two copies of this rule
    // drifted apart inside a week.
    const fault = mintShapeFault(cls);
    if (fault) fails.push({ code: 'deny_class_mint_shape', detail: `${fault}; got "${cls.slice(0, 60)}"` });
  }

  const level = need('Level');
  if (level && !LEVELS.includes(level)) {
    fails.push({ code: 'deny_level', detail: `Level must be one of ${LEVELS.join(' | ')}, got "${level}"` });
  }
  const bucket = need('Bucket');
  if (bucket && !BUCKETS.includes(bucket)) {
    fails.push({ code: 'deny_bucket', detail: `Bucket must be one of ${BUCKETS.join(' | ')}, got "${bucket}"` });
  }
  const notUp = field('Not one up');
  if (level !== 'process' && (!notUp || notUp.split(/\s+/).length < 5)) {
    fails.push({ code: 'deny_missing_field', detail: 'Not one up: <name the next level and why it was rejected>' });
  }

  // Sweep lines are executed. The observation has to match what came back.
  const sweeps = [...body.matchAll(/^Sweep:[ \t]*(.*)$/gm)].map((m) => m[1]);
  if (sweeps.length === 0) fails.push({ code: 'deny_missing_field', detail: 'Sweep:' });
  for (const s of sweeps) {
    const parsed = splitSearchLine(s);
    if (!parsed) { fails.push({ code: 'deny_sweep_no_command', detail: `Sweep: "${s.slice(0, 60)}" is not \`<command>\` → <observation>` }); continue; }
    const vet = vetCommand(parsed.cmd);
    if (vet) { fails.push({ code: 'deny_sweep_command_refused', detail: `\`${parsed.cmd}\`: ${vet}` }); continue; }
    if (cwd === null) continue; // null is the only skip; anything else was refused at the boundary
    const r = runCommand(parsed.cmd, cwd);
    if (!r.ok) { fails.push({ code: 'deny_sweep_command_failed', detail: `\`${parsed.cmd}\` did not run cleanly here` }); continue; }
    if (!observationMatches(parsed.observation, r.out)) {
      const head = r.out.split('\n').filter(Boolean).slice(0, 3).join(' | ') || '(empty)';
      fails.push({ code: 'deny_sweep_observation_mismatch', detail: `\`${parsed.cmd}\` → "${parsed.observation}" does not match its output; it returned ${r.out.split('\n').filter((l) => l.trim()).length} line(s): ${head.slice(0, 160)}` });
    }
  }

  // The Priors command runs too, but the candidates come from the gate's own
  // nomination, so its observation is not scored.
  const priorsLine = need('Priors');
  if (priorsLine) {
    const parsed = splitSearchLine(priorsLine);
    if (!parsed) fails.push({ code: 'deny_sweep_no_command', detail: 'Priors: names no backticked retrieval command' });
    else {
      const vet = vetCommand(parsed.cmd);
      if (vet) fails.push({ code: 'deny_sweep_command_refused', detail: `\`${parsed.cmd}\`: ${vet}` });
      else if (cwd !== null && !runCommand(parsed.cmd, cwd).ok) fails.push({ code: 'deny_sweep_command_failed', detail: `\`${parsed.cmd}\` did not run cleanly here` });
    }
  }
  // The last colon splits the key from the disposition, so a heading substring
  // may itself carry one. The slug group is optional in the pattern only so the
  // bare-date form is caught and named rather than silently unparsed.
  const rows = [...body.matchAll(/^- (\d{4}-\d{2}-\d{2})(?:[ \t]+(.*))?:[ \t]*([a-z-]+)\s*$/gm)]
    .map((m) => ({ date: m[1], slug: (m[2] ?? '').trim(), disp: m[3], raw: m[0].trim() }));
  const headings = headingsIn(onDisk);
  const dispositioned = new Map();
  const titlesOn = (onDay) => onDay.map((h) => `"${h.title}"`).join('; ');
  for (const r of rows) {
    if (!DISPOSITIONS.includes(r.disp)) fails.push({ code: 'deny_prior_disposition', detail: `${r.date}: "${r.disp}" is not one of ${DISPOSITIONS.join(' | ')}` });
    const { matches, onDay } = resolvePrior(r.date, r.slug, headings);
    if (onDay.length === 0) {
      fails.push({ code: 'deny_prior_not_in_log', detail: `${r.date} is not the date of any entry in the log` });
    } else if (!r.slug) {
      fails.push({ code: 'deny_prior_no_slug', detail: `"${r.raw}" names a day, not an entry. Add words from the heading: "- ${r.date} <words> : ${r.disp}". On ${r.date}: ${titlesOn(onDay)}` });
    } else if (matches.length === 0) {
      fails.push({ code: 'deny_prior_not_in_log', detail: `no entry on ${r.date} has "${r.slug}" in its heading. On ${r.date}: ${titlesOn(onDay)}` });
    } else if (matches.length > 1) {
      const identical = matches.every((h) => h.title === matches[0].title);
      fails.push(identical
        ? { code: 'deny_prior_ambiguous', detail: `${matches.length} entries on ${r.date} carry the identical heading "${matches[0].title}", so no row can separate them. The row is not the defect; the log is. Retitle one of them.` }
        : { code: 'deny_prior_ambiguous', detail: `"${r.slug}" matches ${matches.length} entries on ${r.date}, so the row does not say which was read: ${titlesOn(matches)}` });
    } else if (dispositioned.has(entryKey(matches[0]))) {
      // Two rows resolving to one entry read as two priors. Under the day-keyed
      // grammar three identical rows counted three, and the entry-keyed grammar
      // inherited it: the instance number is over entries, not lines.
      fails.push({ code: 'deny_prior_duplicate', detail: `two rows dispose of the same entry, "${matches[0].title}" (${r.date}); one row per prior` });
    } else {
      dispositioned.set(entryKey(matches[0]), r.disp);
    }
  }
  const bodyLines = body.split('\n');
  {
    const wellFormed = new Set(rows.map((r) => r.raw));
    for (let i = 0; i < bodyLines.length; i += 1) {
      const line = bodyLines[i].trim();
      // Any bullet marker and any date-shaped opening. Requiring a correctly
      // formatted date first meant a mistyped one, the commonest way to write a
      // line that looks like a row and is not one, was never called a row at all.
      // Read body-wide, the same span the strict pattern reads, because a broken
      // row outside the block window was dropped while its well-formed twin in
      // the same position was honoured.
      if (!/^[-*\u2013\u2014\u2022]\s*\d{4}\D\d{1,2}\D\d{1,2}\b/.test(line)) continue;
      if (wellFormed.has(line)) continue;
      fails.push({ code: 'deny_prior_malformed', detail: `"${line}" sits among the prior rows and is not one. A row is "- <YYYY-MM-DD> <words from that entry's heading>: ${DISPOSITIONS.join(' | ')}", one space after the dash and the disposition in lower case. Dropped silently before 2026-09-09, taking its claimed prior with it.` });
    }
  }
  for (const e of nominated) {
    if (!dispositioned.has(entryKey(e))) fails.push({ code: 'deny_prior_not_dispositioned', detail: `git nominates "${e.title}" (${e.date}), a commit on a file this fix touches sharing its day; add "- ${e.date} <words from that heading>: same-theme | adjacent | unrelated"` });
  }

  const inst = need('Instance');
  if (inst !== null) {
    const n = Number(inst);
    const same = [...dispositioned.values()].filter((d) => d === 'same-theme').length;
    if (!Number.isInteger(n) || n < 1) fails.push({ code: 'deny_instance_count', detail: 'Instance: must be an integer ≥ 1' });
    else if (n !== same + 1) fails.push({ code: 'deny_instance_count', detail: `Instance: ${n} but ${same} prior(s) are dispositioned same-theme, so it is ${same + 1}` });
  }

  landedRows({ body, fails, cwd, env, logPath, requireReferent: false });

  const critic = need('Critic');
  if (critic !== null && !['ran', 'not-run'].includes(critic)) fails.push({ code: 'deny_critic', detail: 'Critic: ran | not-run' });
  return fails;
}

// The text the write leaves behind. A Write carries it whole; an Edit carries a
// fragment, so the result has to be assembled before anything counts headings in
// it.
function resultingText({ toolName, toolInput, onDisk }) {
  if (toolName !== 'Edit') return toolInput.content ?? '';
  const before = toolInput.old_string ?? '';
  const after = toolInput.new_string ?? '';
  if (!before || !onDisk.includes(before)) return `${onDisk}\n${after}`;
  // replace_all is the tool's flag, and String.replace with a string pattern
  // substitutes the first match only. Modelling every Edit as one substitution
  // let a single replace_all land the same heading twice, invisibly to the
  // duplicate check, and a duplicate already on disk is then grandfathered.
  // A function replacer, because a string one is scanned for `$&`, `` $` ``, `$'`
  // and `$$`, so a heading carrying any of them was modelled as text the tool
  // would not write and its duplicate went unseen.
  return toolInput.replace_all ? onDisk.split(before).join(after) : onDisk.replace(before, () => after);
}

// Grandfathering by construction had a hole in it: newEntries treats a heading
// already on disk as a re-save, so an entry written under a heading that already
// exists was never a new entry and never reached the block rules at all. That is
// the cheapest bypass the gate has, cheaper than either block. The auditor
// catches the resulting log, but the auditor runs in this repo's CI and this hook
// ships into other people's repos, where nothing runs it. Counted per heading, so
// a re-save is unaffected and a log that already carries duplicates keeps them.
export function duplicateHeadings({ toolName, toolInput, onDisk }) {
  const counted = (text) => {
    const m = new Map();
    for (const h of headingsIn(text)) {
      const k = `${h.date} ${h.title}`;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  };
  const before = counted(onDisk);
  const after = counted(resultingText({ toolName, toolInput, onDisk }));
  const out = [];
  for (const [k, n] of after) if (n > 1 && n > (before.get(k) ?? 0)) out.push(k);
  return out;
}

// New entries are the ones the incoming text adds, counted per date, so a
// retitle of an existing entry is not new and a second entry on the same day
// is. Existing entries re-save and edit freely: grandfathering by construction.
export function newEntries({ toolName, toolInput, onDisk }) {
  const text = toolName === 'Edit' ? (toolInput.new_string ?? '') : (toolInput.content ?? '');
  const before = toolName === 'Edit' ? (toolInput.old_string ?? '') : onDisk;
  const beforeByDate = new Map();
  for (const h of headingsIn(before)) beforeByDate.set(h.date, (beforeByDate.get(h.date) ?? 0) + 1);
  const onDiskTitles = new Set(headingsIn(onDisk).map((h) => `${h.date} ${h.title}`));
  const incoming = entriesIn(text);
  const byDate = new Map();
  for (const e of incoming) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
  const out = [];
  for (const [date, list] of byDate) {
    const extra = list.length - (beforeByDate.get(date) ?? 0);
    if (extra <= 0) continue;
    const candidates = list.filter((e) => !onDiskTitles.has(`${e.date} ${e.title}`));
    out.push(...candidates.slice(0, extra));
  }
  return out;
}

export function decide(input, env = process.env) {
  const mode = env.LFB_LEDGER_MODE ?? 'block';
  if (mode === 'off') return null;
  const logName = logNameFrom(env);
  const { tool_name: toolName, tool_input: toolInput = {}, cwd = process.cwd() } = input;
  if (!['Write', 'Edit'].includes(toolName)) return null;
  const fp = toolInput.file_path ?? '';
  if (path.basename(fp) !== logName) return null;
  // `cwd = process.cwd()` defaults on undefined only, so every other unusable
  // value arrived intact and validateEntry's truthiness guard read the falsy
  // ones as its documented skip mode. A payload cwd is either a usable path or
  // the gate cannot run, and a gate that cannot run denies.
  if (typeof cwd !== 'string' || cwd === '') {
    return gateOutput(mode, 'learn-from-bugs ledger gate: the gate could not run against the repo, so it is denying rather than passing an unchecked entry.', [{
      entry: path.basename(fp),
      code: 'deny_bad_cwd',
      detail: `cwd must be a non-empty string, got ${JSON.stringify(cwd)}. Every check that reads the repo needs it, and skipping them silently is how the entry gets through unexamined.`,
    }]);
  }
  const logPath = path.isAbsolute(fp) ? fp : path.join(cwd, fp);
  // The gate's frame of reference is the project that owns the log, not the
  // directory the session happens to sit in. Those are the same thing often
  // enough that it went unnoticed, and different often enough to matter: a
  // session opened at a folder holding several projects, or one level above the
  // repo, asked git about the wrong directory and refused every entry after the
  // first. The log's own path says which repo the question is about. Everything
  // downstream, the nomination, the referents and the executed sweeps, reads
  // from here, so a block written in the log means the same thing whoever writes
  // it and from wherever.
  // Walking up to the nearest existing ancestor, because the first lesson a
  // project ever writes creates its own directory: falling back to the session
  // cwd there lost both the repo and the root normalisation, and refused that
  // first entry whenever the session was not opened exactly at the root.
  let logDir = path.dirname(logPath);
  while (!fs.existsSync(logDir) && path.dirname(logDir) !== logDir) logDir = path.dirname(logDir);
  const anchor = repoRoot(logDir) ?? (fs.existsSync(logDir) ? logDir : cwd);
  const onDisk = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
  const dupes = duplicateHeadings({ toolName, toolInput, onDisk });
  if (dupes.length > 0) {
    return gateOutput(mode, 'learn-from-bugs ledger gate: an entry is being written under a heading the log already carries.', dupes.map((k) => ({
      entry: k,
      code: 'deny_log_duplicate_heading',
      detail: `"${k}" would appear twice. A prior row is keyed by a date plus words from the heading, so two entries sharing both leave no string that names one of them, and an entry written under an existing heading skips the block rules entirely. Give it a heading of its own.`,
    })));
  }
  const entries = newEntries({ toolName, toolInput, onDisk });
  if (entries.length === 0) return null;
  // The forward half of this already existed: landedRows asks before ruling on a
  // referent. The backward half did not, so wherever git could not answer, the
  // sweep nominated nothing and an entry answering for no prior was permitted in
  // silence. Only when the log already carries entries: an empty log has no
  // priors to find, so there is nothing to be quiet about.
  if (headingsIn(onDisk).length > 0 && !(gitReachable(anchor) && gitHasHistory(anchor))) {
    return gateOutput(mode, 'learn-from-bugs ledger gate: the log carries entries and git cannot be read here, so the backward sweep would nominate nothing and say nothing.', [{
      entry: path.basename(logPath),
      code: 'deny_nomination_unverifiable',
      detail: 'git answers no history in this directory, so which prior entries this work touches cannot be checked and an entry that answers for none of them would pass unexamined. Write the entry where the repo is, or make the first commit.',
    }]);
  }
  const nominated = nominate({ cwd: anchor, logPath, headings: headingsIn(onDisk) });
  const fails = [];
  for (const e of entries) {
    for (const f of validateEntry(e, { onDisk, nominated, cwd: anchor, env, logPath })) fails.push({ entry: e.date, ...f });
  }
  if (fails.length === 0) return null;
  return gateOutput(mode, 'learn-from-bugs ledger gate: the new entry does not carry the step 6 block.', fails);
}

export function gateOutput(mode, lead, fails) {
  const reason = [lead]
    .concat(fails.map((f) => `  [${f.code}] ${f.entry}: ${f.detail}`))
    .concat(['Grammar is in SKILL.md step 6. Set LFB_LEDGER_MODE=warn to record without blocking.'])
    .join('\n');
  return mode === 'warn'
    ? { systemMessage: `[ledger gate warn-only] ${reason}` }
    : { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => { raw += c; });
  process.stdin.on('end', () => {
    let input;
    try { input = JSON.parse(raw); } catch { process.exit(0); }
    let out;
    try {
      out = decide(input);
    } catch (err) {
      // A PreToolUse hook exiting non-zero and non-2 is a non-blocking error,
      // so an uncaught throw here is a permit. The guard is only as good as
      // its container.
      out = { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: `learn-from-bugs ledger gate: the gate threw and is denying rather than failing open. ${err?.message ?? err}` } };
    }
    if (out) process.stdout.write(JSON.stringify(out));
    process.exit(0);
  });
}
