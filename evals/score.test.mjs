// Red/green cover for the backlog-read theme signals in score.mjs. Each of the
// four hand-written entries in fixtures/backlog-read/hand/ is dry-run through
// the ledger gate's own decide() first — this repo's rule is a dry run before
// a drive run — then physically written into a fresh arm and scored for real
// by running score.mjs as a child process, the same way the drive harness
// would. Assertions are exactly the values PREREGISTRATION.md's "Values a
// hand-written entry must produce" section lists; nothing beyond that is
// asserted here, since a deny from the gate on the other three entries does
// not stop score.mjs from reading their text.
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

function runScore(dir, transcriptPath) {
  const out = execFileSync('node', [SCORE, dir, transcriptPath, ANSWER_KEY], { encoding: 'utf8' });
  return JSON.parse(out);
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
      symptom_tally_as_finding: false,
      rate_observation_as_finding: false,
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
    },
  },
  {
    name: 'symptom',
    touchTemplate: false,
    expectDenies: [],
    expect: {
      symptom_tally_as_finding: true,
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
      symptom_tally_as_finding: false,
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
      rate_observation_as_finding: true,
      symptom_tally_as_finding: false,
      bucket: 'unread',
    },
  },
  {
    name: 'prose-only',
    touchTemplate: false,
    // No block at all, so every required field is missing. The no-skill arm
    // writes this shape with the plugin disabled, so no gate runs there; here
    // the dry run records exactly what the gate would have said.
    expectDenies: Array(9).fill('deny_missing_field'),
    expect: {
      block_kind: 'none',
      bucket: null,
      bucket_in_prose: 'unread',
      member_recall: 0.83,
      member_recall_mode: 'prose',
      // Review F1: the pre-fix detector matched "that" and scored this true.
      symptom_tally_as_finding: false,
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
    const codes = denyCodes(decision);
    // Asserted for every entry, not only the clean one: a boolean that only
    // fired when true let the other three drift unobserved (review F9).
    assert.deepEqual(codes, c.expectDenies, `${c.name}.md: gate codes expected ${JSON.stringify(c.expectDenies)}, got ${JSON.stringify(codes)}`);

    // Physically write the entry the dry run proposed, uncommitted, then
    // score it the way the drive harness would.
    fs.writeFileSync(logPath, proposed);
    const transcriptPath = writeTranscript(dir, c.name);
    const result = runScore(dir, transcriptPath);

    for (const [key, value] of Object.entries(c.expect)) {
      assert.deepEqual(result[key], value, `${c.name}.md: ${key} expected ${JSON.stringify(value)}, got ${JSON.stringify(result[key])}`);
    }
  });
}

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
