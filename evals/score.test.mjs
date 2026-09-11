// Red/green cover for the backlog-read theme signals in score.mjs. Each of the
// seven hand-written entries in fixtures/backlog-read/hand/ is dry-run through
// the ledger gate's own decide() first — this repo's rule is a dry run before
// a drive run — then physically written into a fresh arm and scored for real
// by running score.mjs as a child process, the same way the drive harness
// would. Assertions include the values PREREGISTRATION.md's "Values a
// hand-written entry must produce" section lists, and also the gate's deny
// codes (or, for the two no-block entries, their sorted detail strings) and
// the extra fields the 2026-09-11 fresh read found verified-but-unasserted
// — neither of which comes from that section.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { decide } from '../plugins/learn-from-bugs/hooks/ledger-gate.mjs';

const FIXTURE = path.join(import.meta.dirname, 'fixtures', 'backlog-read');
const ANSWER_KEY = path.join(FIXTURE, 'ANSWER-KEY.md');
const SCORE = path.join(import.meta.dirname, 'score.mjs');
const LOG_HEADER = fs.readFileSync(path.join(FIXTURE, 'docs', 'LESSONS.md'), 'utf8');

function git(args, cwd) {
  execFileSync('git', args, { cwd, encoding: 'utf8' });
}

// A fresh arm the way an agent's own working tree looks going into the
// session: tickets.jsonl and the docs folder committed, docs/LESSONS.md
// carrying only its shipped header, nothing about this run's entry yet.
function buildArm() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'backlog-read-arm-'));
  fs.copyFileSync(path.join(FIXTURE, 'tickets.jsonl'), path.join(dir, 'tickets.jsonl'));
  fs.mkdirSync(path.join(dir, 'docs'));
  fs.copyFileSync(path.join(FIXTURE, 'docs', 'ticket-template.md'), path.join(dir, 'docs', 'ticket-template.md'));
  fs.copyFileSync(path.join(FIXTURE, 'docs', 'definition-of-done.md'), path.join(dir, 'docs', 'definition-of-done.md'));
  fs.writeFileSync(path.join(dir, 'docs', 'LESSONS.md'), LOG_HEADER);
  git(['init', '-q'], dir);
  git(['config', 'user.email', 'test@example.com'], dir);
  git(['config', 'user.name', 'backlog-read test'], dir);
  git(['add', '-A'], dir);
  git(['commit', '-q', '-m', 'baseline'], dir);
  return dir;
}

function writeTranscript(dir, name) {
  const transcriptPath = path.join(dir, 'transcript.jsonl');
  const sessionId = `stub-${name}`;
  const lines = [
    JSON.stringify({
      session_id: sessionId,
      type: 'assistant',
      message: { content: [{ type: 'tool_use', name: 'Skill', input: { skill: 'learn-from-bugs:learn-from-bugs' } }] },
    }),
    JSON.stringify({ session_id: sessionId, type: 'result', subtype: 'success', terminal_reason: 'complete' }),
  ];
  fs.writeFileSync(transcriptPath, `${lines.join('\n')}\n`);
  return transcriptPath;
}

// decide() in block mode returns a permissionDecisionReason with one
// "  [code] entry: detail" line per fail; this reads the codes back out
// rather than re-deriving them, so the dry run and the report agree.
function denyCodes(result) {
  if (!result) return [];
  const reason = result.hookSpecificOutput?.permissionDecisionReason ?? result.systemMessage ?? '';
  return [...reason.matchAll(/\[(deny_[a-z_]+)\]/g)].map((m) => m[1]);
}

// denyCodes alone cannot distinguish what a deny_missing_field is for: nine
// different missing fields collapse to nine identical strings, so a change
// that makes one required field optional and another optional field required
// leaves the count at nine and the assertion green. This reads the detail
// half of each line too (entry is a bare date, which never contains a colon,
// so splitting on the first ": " after it is unambiguous).
function denyDetails(result) {
  if (!result) return [];
  const reason = result.hookSpecificOutput?.permissionDecisionReason ?? result.systemMessage ?? '';
  return [...reason.matchAll(/^\s*\[deny_[a-z_]+\] [^:]+: (.+)$/gm)].map((m) => m[1]);
}

function runScore(dir, transcriptPath) {
  const out = execFileSync('node', [SCORE, dir, transcriptPath, ANSWER_KEY], { encoding: 'utf8' });
  return JSON.parse(out);
}

// bucket_in_prose, prose-mode member_recall (and member_recall_mode),
// symptom_tally_as_finding (and symptom_match) and rate_observation_as_finding
// live under result.reported rather than flat (2026-09-11 re-verdict). A
// dotted key ('reported.bucket_in_prose') reads through it; a bare key reads
// result directly, unchanged for every other assertion in this file.
function getPath(obj, key) {
  return key.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

const CASES = [
  {
    name: 'correct',
    touchTemplate: true,
    expectDenies: [],
    expect: {
      bucket: 'unread',
      member_recall: 1,
      decoys_misfiled: 0,
      'reported.symptom_tally_as_finding': false,
      'reported.rate_observation_as_finding': false,
      level: 'process',
      landed_mechanisms: [6],
      landed_mechanism_hit: true,
      // The rest of the skill-arm column (PREREGISTRATION.md's main table):
      // the one signal bound to an executed command rather than a text match,
      // plus the fields review F3 found verified-but-unasserted.
      window_ran: true,
      window_count: 12,
      block_kind: 'theme',
      entry_is_new: true,
      critic: 'not-run',
      landed_referents_touched: ['docs/ticket-template.md'],
      // Review F9: sum_check_flag is asserted true for everything.md and
      // nowhere asserted false, the same asymmetry the deny-code assertion
      // already had once (a boolean that only fires when true lets the other
      // entries drift unobserved).
      sum_check_flag: false,
    },
  },
  {
    name: 'symptom',
    touchTemplate: false,
    expectDenies: [],
    expect: {
      'reported.symptom_tally_as_finding': true,
      bucket: 'missing',
      member_recall: 0.17,
      decoys_misfiled: 1,
    },
  },
  {
    name: 'everything',
    touchTemplate: false,
    expectDenies: [],
    expect: {
      member_recall: 1,
      decoys_misfiled: 6,
      sum_check_flag: true,
      // Review F1: the pre-fix detector matched "export" (a distinctive-title-
      // word false positive) and scored this true. Neither a fixture label
      // nor a reopen-rate observation appears in the first paragraph.
      'reported.symptom_tally_as_finding': false,
    },
  },
  {
    // Review R1: the answer key's other not-a-pass shape, a reopen rate stated
    // as the finding. The block is correct.md's, so only the first paragraph
    // differs and the gate accepts it.
    name: 'rate',
    touchTemplate: true,
    expectDenies: [],
    expect: {
      'reported.rate_observation_as_finding': true,
      'reported.symptom_tally_as_finding': false,
      bucket: 'unread',
    },
  },
  {
    name: 'prose-only',
    touchTemplate: false,
    // No block at all, so every required field is missing. The no-skill arm
    // writes this shape with the plugin disabled, so no gate runs there; here
    // the dry run records exactly what the gate would have said. Nine copies
    // of `deny_missing_field` cannot distinguish which nine fields are
    // missing, so a change that makes one required field optional and
    // another optional field required would leave the count at nine and a
    // codes-only assertion green (2026-09-11 fresh read). Assert the sorted
    // detail strings instead.
    expectDenyDetails: [
      'Bucket:',
      'Class:',
      'Critic:',
      'Instance:',
      'Landed: <mechanism 1-10> <what>',
      'Level:',
      'Not one up: <name the next level and why it was rejected>',
      'Priors:',
      'Sweep:',
    ],
    expect: {
      block_kind: 'none',
      bucket: null,
      // member_recall lives only under `reported` in prose mode -- the
      // top-level, scored field is null, so a later change that starts
      // scoring a prose number is a visible shape change here, not a silent
      // one.
      member_recall: null,
      // Second re-verdict C1: the two signals fed by the same prose-derived
      // claimed set are null at the top level too, and reported beside it.
      decoys_misfiled: null,
      sum_check_flag: null,
      bucket_correct: null,
      'reported.bucket_in_prose': 'unread',
      'reported.member_recall': 0.83,
      'reported.member_recall_mode': 'prose',
      'reported.decoys_misfiled': 0,
      'reported.sum_check_flag': false,
      // Review F1: the pre-fix detector matched "that" and scored this true.
      'reported.symptom_tally_as_finding': false,
    },
  },
  {
    // 2026-09-11 fresh read, probes P1a/P1c: prose-only.md's content plus
    // the ordinary sentence "the requirement was missing from the
    // description" and the ids as a bullet list under the sentence naming
    // the bucket, so the bucket-word-by-array-order bug and the
    // sentence-scoped id-collection bug are each exercised on their own.
    // Watched red against the pre-fix scorer first (bucket_in_prose:
    // "missing", member_recall: 0). The list sits under a blank line (the
    // 2026-09-11 re-verdict's B3: the harder, more ordinary Markdown
    // spacing, not the one the original fix happened to pass).
    name: 'prose-missing',
    touchTemplate: false,
    expectDenyDetails: [
      'Bucket:',
      'Class:',
      'Critic:',
      'Instance:',
      'Landed: <mechanism 1-10> <what>',
      'Level:',
      'Not one up: <name the next level and why it was rejected>',
      'Priors:',
      'Sweep:',
    ],
    expect: {
      member_recall: null,
      decoys_misfiled: null,
      sum_check_flag: null,
      bucket_correct: null,
      'reported.bucket_in_prose': 'unread',
      'reported.member_recall': 0.83,
      'reported.member_recall_mode': 'prose',
      'reported.decoys_misfiled': 0,
    },
  },
  {
    // 2026-09-11 fresh read, probe P10-adjacent: correct.md's own block under
    // a first paragraph that names several of the fixture's own labels while
    // describing the tickets as varied, not tallying them. Regression cover
    // for the subject/tally-shape narrowing in symptom_tally_as_finding, on
    // top of the three specific probe sentences (P2b/P2d/P2e) below. Watched
    // red first is not meaningful here the way it is for prose-missing.md,
    // since the old detector already scored plain label mentions true; this
    // entry is new cover for the fix, not a repro of a bug that predates it.
    name: 'correct-varied',
    touchTemplate: true,
    expectDenies: [],
    expect: {
      'reported.symptom_tally_as_finding': false,
      bucket: 'unread',
      member_recall: 1,
      decoys_misfiled: 0,
      decoys_dismissed: 6,
    },
  },
];

for (const c of CASES) {
  test(`backlog-read hand entry: ${c.name}`, (t) => {
    const dir = buildArm();
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

    const entryText = fs.readFileSync(path.join(FIXTURE, 'hand', `${c.name}.md`), 'utf8');
    const logPath = path.join(dir, 'docs', 'LESSONS.md');
    const proposed = `${LOG_HEADER}\n${entryText}`;

    // correct.md's Landed: row ends in docs/ticket-template.md, so that path
    // has to be a real, uncommitted change here before the dry run, or the
    // gate has nothing to call touched — a bare mtime touch would not do it,
    // since git compares content, not mtime.
    if (c.touchTemplate) {
      fs.appendFileSync(path.join(dir, 'docs', 'ticket-template.md'), '\n<!-- comment-promotion reviewed -->\n');
    }

    // Dry run before the drive run.
    const decision = decide(
      { tool_name: 'Write', tool_input: { file_path: logPath, content: proposed }, cwd: dir },
      { ...process.env, LFB_LEDGER_MODE: 'block' },
    );
    // Asserted for every entry, not only the clean one: a boolean that only
    // fired when true let the other three drift unobserved (review F9).
    // Two entries (no block at all) assert the sorted detail strings instead
    // of nine copies of one code, which cannot tell one missing field from
    // another.
    if (c.expectDenyDetails) {
      const details = denyDetails(decision).slice().sort();
      assert.deepEqual(details, c.expectDenyDetails, `${c.name}.md: deny details expected ${JSON.stringify(c.expectDenyDetails)}, got ${JSON.stringify(details)}`);
    } else {
      const codes = denyCodes(decision);
      assert.deepEqual(codes, c.expectDenies, `${c.name}.md: gate codes expected ${JSON.stringify(c.expectDenies)}, got ${JSON.stringify(codes)}`);
    }

    // Physically write the entry the dry run proposed, uncommitted, then
    // score it the way the drive harness would.
    fs.writeFileSync(logPath, proposed);
    const transcriptPath = writeTranscript(dir, c.name);
    const result = runScore(dir, transcriptPath);

    for (const [key, value] of Object.entries(c.expect)) {
      const got = getPath(result, key);
      assert.deepEqual(got, value, `${c.name}.md: ${key} expected ${JSON.stringify(value)}, got ${JSON.stringify(got)}`);
    }
  });
}

// Reported-value regression cover, 2026-09-11 re-verdict. bucket_in_prose,
// symptom_tally_as_finding and prose-mode member_recall are leads a person
// confirms, never verdicts -- a five-minute probe refutes any heuristic fix
// attempted on them (see the comment above symptom_tally_as_finding in
// score.mjs for B1/B2/B3 in full). These cases pin what `reported` actually
// says today, on the reader's own probe sentences, so a later change that
// makes a reported value MORE wrong is caught even though leaving it exactly
// this wrong is not, by itself, a regression to fix. correct.md's block is
// read from the file rather than retyped, so it cannot drift from the hand
// entry it stands in for.
const CORRECT_MD_TEXT = fs.readFileSync(path.join(FIXTURE, 'hand', 'correct.md'), 'utf8');
const CORRECT_BLOCK = CORRECT_MD_TEXT.slice(CORRECT_MD_TEXT.indexOf('Theme:'));

function scoreReportedEntry(name, entryBody) {
  const dir = buildArm();
  const logPath = path.join(dir, 'docs', 'LESSONS.md');
  fs.writeFileSync(logPath, `${LOG_HEADER}\n## 2026-09-11 — reported-value probe: ${name}\n\n${entryBody}\n`);
  const transcriptPath = writeTranscript(dir, name);
  const result = runScore(dir, transcriptPath);
  fs.rmSync(dir, { recursive: true, force: true });
  return result;
}

const REPORTED_CASES = [
  // B1: the subject-or-tally narrowing holds on the three sentences it was
  // written against (probes P2b/P2d/P2e, run against correct.md's own
  // block, ordinary English uses of two of the fixture's labels).
  {
    name: 'B1-narrowing-holds-P2d',
    entryBody: `Not one of these is a bug in the usual sense.\n\n${CORRECT_BLOCK}`,
    expect: { 'reported.symptom_tally_as_finding': false, 'reported.symptom_match': null },
  },
  {
    name: 'B1-narrowing-holds-P2e',
    entryBody: `This is not a UX problem.\n\n${CORRECT_BLOCK}`,
    expect: { 'reported.symptom_tally_as_finding': false, 'reported.symptom_match': null },
  },
  {
    name: 'B1-narrowing-holds-P2b',
    entryBody: `The symptoms differ every time, from a security tab left open to a mobile filter bar, but six tickets carry one shape.\n\n${CORRECT_BLOCK}`,
    expect: { 'reported.symptom_tally_as_finding': false, 'reported.symptom_match': null },
  },
  // B1's own rejection probes: the same "twelve different symptoms, one
  // shape underneath" framing the answer key itself uses, written with a
  // leading article before the label. The subject branch's article is
  // optional, so these still fire -- a known, documented residual, not a
  // pass condition.
  {
    name: 'B1-residual-fires-C1',
    entryBody: `The bug reports cluster into one shape rather than twelve.\n\n${CORRECT_BLOCK}`,
    expect: { 'reported.symptom_tally_as_finding': true, 'reported.symptom_match': 'bug' },
  },
  {
    name: 'B1-residual-fires-C2',
    entryBody: `A security gap, a rounding error and a keyboard trap look unrelated.\n\n${CORRECT_BLOCK}`,
    expect: { 'reported.symptom_tally_as_finding': true, 'reported.symptom_match': 'security' },
  },
  {
    name: 'B1-residual-fires-C3',
    entryBody: `These ux tickets are not really about layout.\n\n${CORRECT_BLOCK}`,
    expect: { 'reported.symptom_tally_as_finding': true, 'reported.symptom_match': 'ux' },
  },
  // B2: last-mention bucket-word selection is a position bias, not a fix.
  // Both entries name unread and all five members in one sentence, prose
  // mode (no block); only the closing sentence differs.
  {
    name: 'B2-residual-none',
    entryBody: 'Reading through the twelve tickets end to end, the requirement sat unread in\n'
      + 'a comment on INV-101, INV-104, INV-107, INV-110 and INV-113 before the\n'
      + 'description was ever updated. None of the remaining tickets shares it.',
    expect: { 'reported.bucket_in_prose': 'none', 'reported.member_recall': 0.83 },
  },
  {
    name: 'B2-residual-missing',
    entryBody: 'Reading through the twelve tickets end to end, the requirement sat unread in\n'
      + 'a comment on INV-101, INV-104, INV-107, INV-110 and INV-113 before the\n'
      + 'description was ever updated. In each case it was missing from the description.',
    expect: { 'reported.bucket_in_prose': 'missing', 'reported.member_recall': 0.83 },
  },
  // B3: fixed. A bullet list set off from its naming sentence by a blank
  // line -- the more ordinary Markdown spacing, and the form
  // prose-missing.md above now uses -- used to drop recall from 0.83 to 0;
  // both spacings now read the same list.
  {
    name: 'B3-fixed-no-blank-line',
    entryBody: 'Reading through the twelve tickets end to end, the requirement sat unread\n'
      + 'until the ticket reopened, on:\n- INV-101\n- INV-104\n- INV-107\n- INV-110\n- INV-113\n\n'
      + 'That is the pattern worth fixing first.',
    expect: { 'reported.member_recall': 0.83 },
  },
  {
    name: 'B3-fixed-blank-line-before-list',
    entryBody: 'Reading through the twelve tickets end to end, the requirement sat unread\n'
      + 'until the ticket reopened, on:\n\n- INV-101\n- INV-104\n- INV-107\n- INV-110\n- INV-113\n\n'
      + 'That is the pattern worth fixing first.',
    expect: { 'reported.member_recall': 0.83 },
  },
];

for (const c of REPORTED_CASES) {
  test(`backlog-read reported value: ${c.name}`, () => {
    const result = scoreReportedEntry(c.name, c.entryBody);
    for (const [key, value] of Object.entries(c.expect)) {
      const got = getPath(result, key);
      assert.deepEqual(got, value, `${c.name}: ${key} expected ${JSON.stringify(value)}, got ${JSON.stringify(got)}`);
    }
  });
}

// N2 (2026-09-11 re-verdict): critic_unsupported and entries_in_log were
// emitted with no assertion anywhere. critic_unsupported here rather than in
// the correct.md case above: correct.md's Critic: not-run makes the
// conjunction vacuous (not-run is never unsupported), so this needs an entry
// that claims Critic: ran with no subagent transcript, which is every arm
// this test suite ever builds -- writeTranscript's stub transcript names no
// session with subagent files on this machine.
test('backlog-read: critic_unsupported and entries_in_log', () => {
  const dir = buildArm();
  fs.appendFileSync(path.join(dir, 'docs', 'ticket-template.md'), '\n<!-- comment-promotion reviewed -->\n');
  const entryText = CORRECT_MD_TEXT.replace('Critic: not-run', 'Critic: ran');
  fs.writeFileSync(path.join(dir, 'docs', 'LESSONS.md'), `${LOG_HEADER}\n${entryText}`);
  const transcriptPath = writeTranscript(dir, 'critic-unsupported');
  const result = runScore(dir, transcriptPath);
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(result.critic, 'ran');
  assert.equal(result.critic_unsupported, true, 'Critic: ran with zero subagent transcripts should read as unsupported');
  assert.equal(result.entries_in_log, 1);
});

// Review F6: ANSWER-KEY.md's expected_symptom_themes_max_size claims to be
// "a property of the fixture, asserted by the build" — no build asserted it.
// This is that assertion: no label groups more ticket ids than the key
// allows, so a later edit adding a third ticket to one symptom cannot
// silently make a symptom tally a valid answer without this test catching it
// first.
test('no label in tickets.jsonl groups more tickets than expected_symptom_themes_max_size allows', () => {
  const keyText = fs.readFileSync(ANSWER_KEY, 'utf8');
  const key = JSON.parse(keyText.match(/```json\n([\s\S]*?)```/)[1]);
  assert.ok(
    Number.isInteger(key.expected_symptom_themes_max_size),
    'ANSWER-KEY.md carries no expected_symptom_themes_max_size to assert against',
  );
  const rows = fs.readFileSync(path.join(FIXTURE, 'tickets.jsonl'), 'utf8')
    .split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const byLabel = new Map();
  for (const t of rows) {
    for (const label of t.labels ?? []) {
      if (!byLabel.has(label)) byLabel.set(label, []);
      byLabel.get(label).push(t.id);
    }
  }
  for (const [label, ids] of byLabel) {
    assert.ok(
      ids.length <= key.expected_symptom_themes_max_size,
      `label "${label}" groups ${ids.length} tickets (${ids.join(', ')}), over expected_symptom_themes_max_size (${key.expected_symptom_themes_max_size}); a symptom tally on this label would now be a defensible read and the fixture's answer key needs a second look`,
    );
  }
});
