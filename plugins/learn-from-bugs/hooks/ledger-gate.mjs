#!/usr/bin/env node
// PreToolUse gate on the incident log. A new entry lands only with the trailing
// block SKILL.md step 6 specifies, and the block's claims are checked against the
// log, the git history, and the repo itself rather than read as prose. What it
// binds: the label set, the prior dates, the git-nominated priors, the instance
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

function entriesIn(text) {
  const lines = text.split('\n');
  const starts = [];
  lines.forEach((l, i) => { if (HEADING.test(l)) starts.push(i); });
  return starts.map((s, k) => {
    const end = starts[k + 1] ?? lines.length;
    const m = lines[s].match(HEADING);
    return { date: m[1], title: m[2].trim(), body: lines.slice(s, end).join('\n') };
  });
}

function classLabelsIn(text) {
  const set = new Set();
  for (const m of text.matchAll(/^Class:[ \t]*(.+?)\s*$/gm)) {
    const v = m[1].trim();
    if (!/^new\s*[—–-]/i.test(v)) set.add(v.toLowerCase());
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
export function touchedFiles({ cwd, logPath }) {
  const git = (args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const base = path.basename(logPath);
  const clean = (list) => [...new Set(list)].filter((f) => f && path.basename(f) !== base);
  try {
    const dirty = clean([
      ...git(['diff', '--name-only', 'HEAD']).split('\n'),
      ...git(['diff', '--name-only', '--cached']).split('\n'),
    ]);
    if (dirty.length) return dirty;
    // Pathspec has to be the repo-relative path: `-- LESSONS.md` does not match
    // `docs/LESSONS.md`.
    const rel = path.relative(cwd, logPath) || base;
    const lastLogCommit = git(['log', '-1', '--format=%H', '--', rel]).trim();
    if (lastLogCommit) {
      const since = clean(git(['diff', '--name-only', `${lastLogCommit}..HEAD`]).split('\n'));
      if (since.length) return since;
      return [];
    }
    return clean(git(['show', '--name-only', '--format=', 'HEAD']).split('\n'));
  } catch { return []; }
}

export function nominate({ cwd, logPath, logDates }) {
  const git = (args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const files = touchedFiles({ cwd, logPath });
  const dates = new Set();
  for (const f of files) {
    try {
      for (const d of git(['log', '--date=short', '--format=%ad', '--', f]).split('\n')) {
        if (d && logDates.has(d)) dates.add(d);
      }
    } catch { /* untracked, nothing to nominate from */ }
  }
  return [...dates].sort();
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
    if (bin === 'find' && argv.some((a) => ['-delete', '-exec', '-execdir', '-ok', '-okdir'].includes(a))) return 'find may not delete or exec';
  }
  return null;
}

export function runCommand(cmd, cwd) {
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

function splitSearchLine(v) {
  const m = v.match(/^`([^`]+)`\s*(?:→|->|=>)?\s*(.*)$/);
  return m ? { cmd: m[1].trim(), observation: m[2].trim() } : null;
}

// Returns [] when the entry passes, else a list of {code, detail}.
export function validateEntry(entry, { onDisk, nominated, cwd }) {
  const fails = [];
  const body = entry.body;
  const field = (name) => {
    // [ \t]* rather than \s*: a bare "Field:" must not capture the next line.
    const m = body.match(new RegExp(`^${name}:[ \\t]*(.*)$`, 'm'));
    return m ? m[1].trim() : null;
  };
  const need = (name) => {
    const v = field(name);
    if (v === null || v === '') fails.push({ code: 'deny_missing_field', detail: `${name}:` });
    return v;
  };

  const cls = need('Class');
  if (cls) {
    const known = classLabelsIn(onDisk);
    const isNew = new RegExp(`^new\\s*${DASH}\\s*\\S`, 'i').test(cls);
    if (!isNew && !known.has(cls.toLowerCase())) {
      fails.push({ code: 'deny_class_unknown', detail: `"${cls}" matches no Class: in the log; reuse one, or write "Class: new — <why no existing label fits>"` });
    }
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
    if (!cwd) continue;
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
      else if (cwd && !runCommand(parsed.cmd, cwd).ok) fails.push({ code: 'deny_sweep_command_failed', detail: `\`${parsed.cmd}\` did not run cleanly here` });
    }
  }
  const rows = [...body.matchAll(/^- (\d{4}-\d{2}-\d{2}):[ \t]*([a-z-]+)\s*$/gm)].map((m) => ({ date: m[1], disp: m[2] }));
  const logDates = new Set(headingsIn(onDisk).map((h) => h.date));
  for (const r of rows) {
    if (!DISPOSITIONS.includes(r.disp)) fails.push({ code: 'deny_prior_disposition', detail: `${r.date}: "${r.disp}" is not one of ${DISPOSITIONS.join(' | ')}` });
    if (!logDates.has(r.date)) fails.push({ code: 'deny_prior_not_in_log', detail: `${r.date} is not the date of any entry in the log` });
  }
  const rowDates = new Set(rows.map((r) => r.date));
  for (const d of nominated) {
    if (!rowDates.has(d)) fails.push({ code: 'deny_prior_not_dispositioned', detail: `git nominates ${d} (a commit on a file this fix touches shares its day with a log entry); add "- ${d}: same-theme | adjacent | unrelated"` });
  }

  const inst = need('Instance');
  if (inst !== null) {
    const n = Number(inst);
    const same = rows.filter((r) => r.disp === 'same-theme').length;
    if (!Number.isInteger(n) || n < 1) fails.push({ code: 'deny_instance_count', detail: 'Instance: must be an integer ≥ 1' });
    else if (n !== same + 1) fails.push({ code: 'deny_instance_count', detail: `Instance: ${n} but ${same} prior(s) are dispositioned same-theme, so it is ${same + 1}` });
  }

  const landed = [...body.matchAll(/^Landed:[ \t]*(\d{1,2})\b(.*)$/gm)].map((m) => ({ n: Number(m[1]), rest: m[2] }));
  if (landed.length === 0) fails.push({ code: 'deny_missing_field', detail: 'Landed: <mechanism 1-10> <what>' });
  for (const l of landed) {
    if (l.n < 1 || l.n > 10) fails.push({ code: 'deny_landed_rank', detail: `Landed: ${l.n} is not a step 5 mechanism (1-10)` });
    if ((l.n === 1 || l.n === 2) && !/\bred:/.test(l.rest)) fails.push({ code: 'deny_landed_no_red', detail: `Landed: ${l.n} claims a check or test; add "red: <how it was seen failing against the defect>" or claim the narrower number` });
  }

  const critic = need('Critic');
  if (critic !== null && !['ran', 'not-run'].includes(critic)) fails.push({ code: 'deny_critic', detail: 'Critic: ran | not-run' });
  return fails;
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
  const logName = env.LFB_LOG_NAME ?? 'LESSONS.md';
  const { tool_name: toolName, tool_input: toolInput = {}, cwd = process.cwd() } = input;
  if (!['Write', 'Edit'].includes(toolName)) return null;
  const fp = toolInput.file_path ?? '';
  if (path.basename(fp) !== logName) return null;
  const logPath = path.isAbsolute(fp) ? fp : path.join(cwd, fp);
  const onDisk = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
  const entries = newEntries({ toolName, toolInput, onDisk });
  if (entries.length === 0) return null;
  const logDates = new Set(headingsIn(onDisk).map((h) => h.date));
  const nominated = nominate({ cwd, logPath, logDates });
  const fails = [];
  for (const e of entries) {
    for (const f of validateEntry(e, { onDisk, nominated, cwd })) fails.push({ entry: e.date, ...f });
  }
  if (fails.length === 0) return null;
  const reason = ['learn-from-bugs ledger gate: the new entry does not carry the step 6 block.']
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
    const out = decide(input);
    if (out) process.stdout.write(JSON.stringify(out));
    process.exit(0);
  });
}
