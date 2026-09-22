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
// Takes the fixture directory so the dates variant, whose docs/ is a copy of
// this one's and whose tickets.jsonl is not, builds its arm through the same
// path rather than a second copy of it.
function buildArm(fixture = FIXTURE) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'backlog-read-arm-'));
  fs.copyFileSync(path.join(fixture, 'tickets.jsonl'), path.join(dir, 'tickets.jsonl'));
  fs.mkdirSync(path.join(dir, 'docs'));
  fs.copyFileSync(path.join(fixture, 'docs', 'ticket-template.md'), path.join(dir, 'docs', 'ticket-template.md'));
  fs.copyFileSync(path.join(fixture, 'docs', 'definition-of-done.md'), path.join(dir, 'docs', 'definition-of-done.md'));
  fs.writeFileSync(path.join(dir, 'docs', 'LESSONS.md'), fs.readFileSync(path.join(fixture, 'docs', 'LESSONS.md'), 'utf8'));
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

function runScore(dir, transcriptPath, answerKey = ANSWER_KEY) {
  const out = execFileSync('node', [SCORE, dir, transcriptPath, answerKey], { encoding: 'utf8' });
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

// One case, run against one fixture. Parameterised so the dates variant's two
// hand entries (below, near its own fixture's tests) assert the same
// expectation objects these do rather than a retyped copy of them: "the same
// values against the new key as against the old" is then a property of the
// code, not of two lists agreeing.
function runHandEntryCase(t, c, fixture = FIXTURE, answerKey = ANSWER_KEY) {
  const dir = buildArm(fixture);
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const entryText = fs.readFileSync(path.join(fixture, 'hand', `${c.name}.md`), 'utf8');
  const logPath = path.join(dir, 'docs', 'LESSONS.md');
  const logHeader = fs.readFileSync(path.join(fixture, 'docs', 'LESSONS.md'), 'utf8');
  const proposed = `${logHeader}\n${entryText}`;

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
  const result = runScore(dir, transcriptPath, answerKey);

  for (const [key, value] of Object.entries(c.expect)) {
    const got = getPath(result, key);
    assert.deepEqual(got, value, `${c.name}.md: ${key} expected ${JSON.stringify(value)}, got ${JSON.stringify(got)}`);
  }
}

for (const c of CASES) {
  test(`backlog-read hand entry: ${c.name}`, (t) => runHandEntryCase(t, c));
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
// The bundle an arm clones and the files this suite reads are built from the
// same tree by build-bundle.sh; this holds them to it, so an edit to either
// without a rebuild is a red here rather than a fixture that quietly differs
// from its own test. The clone also proves the README's restore command.
// Parameterised by fixture, not copied per fixture: backlog-read-dates ships
// the same two files through the same build script, and a second copy of this
// assertion would be a second place to forget.
function assertBundleParity(fixtureDir, fixtureName) {
  const bundle = path.join(fixtureDir, `${fixtureName}.bundle`);
  assert.ok(fs.existsSync(bundle), `${fixtureName}.bundle is missing; run evals/fixtures/${fixtureName}/build-bundle.sh`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${fixtureName}-clone-`));
  execFileSync('git', ['clone', '-q', bundle, path.join(dir, 'work')], { encoding: 'utf8' });
  const work = path.join(dir, 'work');
  const shipped = execFileSync('git', ['-C', work, 'ls-files'], { encoding: 'utf8' }).trim().split('\n').sort();
  const expected = ['tickets.jsonl', ...fs.readdirSync(path.join(fixtureDir, 'docs')).map((f) => `docs/${f}`)].sort();
  assert.deepEqual(shipped, expected);
  for (const f of shipped) {
    assert.equal(fs.readFileSync(path.join(work, f), 'utf8'), fs.readFileSync(path.join(fixtureDir, f), 'utf8'), `${f} in the bundle differs from the tracked file`);
  }
  const day = execFileSync('git', ['-C', work, 'log', '--date=short', '--format=%ad'], { encoding: 'utf8' }).trim();
  assert.equal(day, '2026-08-10', 'the bundle has one commit, dated to the log header');
  fs.rmSync(dir, { recursive: true, force: true });
}

test('backlog-read.bundle clones to exactly the tracked tickets.jsonl and docs/', () => {
  assertBundleParity(FIXTURE, 'backlog-read');
});

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

// evals/README.md, "Fixture rules": a fixture's export may not state any
// bucket, planted or decoy. Two checks, both over every ticket's comments:
// no sentence in a comment body matches a confession regex from the
// fixture's own answer key (checked per bucket -- unread, missing,
// unrecorded, misunderstood, none -- case-insensitively), and no comment
// dated on or after a ticket's reopen contains a date string equal to an
// earlier comment's date on the same ticket. Both live here rather than in
// the fixture's own build, since backlog-read (the confessing sibling, kept
// on purpose per its own "Known artificialities") has to be checkable too,
// as the red proof below. Matching is sentence-scoped -- a comment body is
// split on sentence boundaries and each regex is tried against one sentence
// at a time -- so a compound regex requiring two words to co-occur only
// fires when they share a sentence, not merely a comment (2026-09-11
// maintainer ruling, after a fresh review found three false positives on
// bare "did not see"/"never saw" and six decoys that confess their own
// bucket in plain language the old flat list never looked for).

function readAnswerKeyJson(answerKeyPath) {
  const keyText = fs.readFileSync(answerKeyPath, 'utf8');
  return JSON.parse(keyText.match(/```json\n([\s\S]*?)```/)[1]);
}

function readTickets(ticketsPath) {
  return fs.readFileSync(ticketsPath, 'utf8')
    .split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

// The "at" of the first comment whose body contains "reopen" (case-
// insensitive) is the reopen point for every one of backlog-read's six
// confessing members, and for its one reopen-count-1 decoy that uses the
// word (INV-111) -- read from the export, this is the shape: a later comment
// literally says "Reopening." Two decoys carry reopen_count: 1 with no
// comment ever using the word (INV-102, INV-114); for those there is no
// textual reopen marker, so this falls back to the comment right after the
// first "PR up"/"closed" comment, the export's other signal of a round trip
// through review. A ticket with neither signal has no reopen point and is
// left out of the date-citation half of the check below -- there is nothing
// there for it to leak. (Correction, 2026-09-11 review: an earlier version of
// this comment named INV-108 as a decoy that uses the word; INV-108 carries
// reopen_count: 0 and no comment on it says "reopen" at all -- confirmed by
// running reopenAt(INV-108), which returns null. It never reaches either
// branch and is simply excluded, same as INV-105 and INV-117.)
function reopenAt(ticket) {
  const comments = ticket.comments ?? [];
  const named = comments.find((c) => /reopen/i.test(c.body ?? ''));
  if (named) return named.at;
  if (ticket.reopen_count === 1) {
    const markerIdx = comments.findIndex((c) => /pr up|closed/i.test(c.body ?? ''));
    if (markerIdx >= 0 && comments[markerIdx + 1]) return comments[markerIdx + 1].at;
  }
  return null;
}

function shortForm(isoDate) {
  return isoDate.slice(5); // "2026-03-04" -> "03-04"
}

// A YYYY-MM-DD or MM-DD token in a comment's body, equal to an earlier
// comment's own "at" date on the same ticket. "Earlier" is by position in
// the comments array, which is the export's own chronological order.
function dateCitations(ticket) {
  const comments = ticket.comments ?? [];
  const hits = [];
  for (let i = 0; i < comments.length; i++) {
    const body = comments[i].body ?? '';
    const tokens = body.match(/\b\d{4}-\d{2}-\d{2}\b|\b\d{2}-\d{2}\b/g) ?? [];
    for (const token of tokens) {
      for (let j = 0; j < i; j++) {
        const earlier = comments[j].at;
        if (!earlier) continue;
        const matches = token.length === 10 ? token === earlier : token === shortForm(earlier);
        if (matches) hits.push({ commentAt: comments[i].at, token, citedAt: earlier });
      }
    }
  }
  return hits;
}

// Sentence boundaries: split after ./!/? followed by whitespace. Good enough
// for this fixture family's short, plainly-punctuated comments; it is not a
// general sentence tokenizer and does not need to be one here.
function sentencesOf(body) {
  return (body ?? '').split(/(?<=[.!?])\s+/).filter(Boolean);
}

// confessionPhrasesByBucket: { bucket: [regexSourceString, ...], ... }, from
// the fixture's own answer key. Every sentence of every comment is tested
// against every regex in every bucket; a hit records which bucket's
// vocabulary fired, so a decoy stating its own bucket is caught exactly like
// a member stating unread.
function bucketConfessionHits(ticketsPath, confessionPhrasesByBucket) {
  const tickets = readTickets(ticketsPath);
  const hits = [];
  for (const ticket of tickets) {
    for (const c of ticket.comments ?? []) {
      const sentences = sentencesOf(c.body);
      for (const [bucket, patterns] of Object.entries(confessionPhrasesByBucket)) {
        for (const pattern of patterns) {
          const re = new RegExp(pattern, 'i');
          if (sentences.some((s) => re.test(s))) {
            hits.push({ id: ticket.id, at: c.at, bucket, pattern });
          }
        }
      }
    }
  }
  return hits;
}

function findFindingLeaks(ticketsPath, confessionPhrasesByBucket) {
  const tickets = readTickets(ticketsPath);
  const phraseHits = bucketConfessionHits(ticketsPath, confessionPhrasesByBucket);
  const dateHits = [];
  for (const ticket of tickets) {
    const reopen = reopenAt(ticket);
    if (reopen != null) {
      for (const hit of dateCitations(ticket)) {
        if (hit.commentAt >= reopen) dateHits.push({ id: ticket.id, ...hit });
      }
    }
  }
  return { phraseHits, dateHits };
}

const DATES_FIXTURE = path.join(import.meta.dirname, 'fixtures', 'backlog-read-dates');
const DATES_ANSWER_KEY = path.join(DATES_FIXTURE, 'ANSWER-KEY.md');
const DATES_TICKETS = path.join(DATES_FIXTURE, 'tickets.jsonl');

// backlog-read is exempt from the auto-scan below on purpose: its answer key
// carries no confession_phrases (it is the sibling that confesses by design,
// per its own "Known artificialities" section), and it is exercised
// separately, on demand, as the red proof that the check can fail. Named here
// so a future answer key edit that accidentally adds confession_phrases to
// backlog-read/ANSWER-KEY.md does not silently fold it into the governed set.
const RED_PROOF_EXEMPT = new Set(['backlog-read']);

// Every fixture directory whose answer key carries confession_phrases is
// governed by the "does not state its finding" rule (evals/README.md,
// "Fixture rules") -- not one hardcoded const. A fixture with no
// tickets.jsonl yet skips, naming why; convention-spread and date-validity
// carry no confession_phrases at all and are not scanned, since the rule has
// no mechanism to apply to a fixture with no ticket export.
function governedFixtures() {
  const fixturesDir = path.join(import.meta.dirname, 'fixtures');
  const dirs = fs.readdirSync(fixturesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => !RED_PROOF_EXEMPT.has(name));
  const governed = [];
  for (const name of dirs) {
    const answerKeyPath = path.join(fixturesDir, name, 'ANSWER-KEY.md');
    if (!fs.existsSync(answerKeyPath)) continue;
    const key = readAnswerKeyJson(answerKeyPath);
    if (key.confession_phrases && typeof key.confession_phrases === 'object') {
      governed.push({ name, dir: path.join(fixturesDir, name), answerKeyPath });
    }
  }
  return governed;
}

// Coverage floor for the date half (2026-09-11 second review, R1): the count
// of tickets with a non-null reopenAt() must meet a number the fixture's own
// answer key carries (`expected_reopen_points`), not merely "no reopen_count
// 1 ticket lacks a point" -- that weaker form is satisfied vacuously by a
// mutation that also zeroes reopen_count, and the review demonstrated it
// passing silently. This lives in the governed, per-fixture test (the one
// that guards fixtures as they ship), not only in the red test against the
// sibling below -- the first pass put it in the wrong place.
function reopenPointCount(ticketsPath) {
  return readTickets(ticketsPath).filter((t) => reopenAt(t) != null).length;
}

for (const gf of governedFixtures()) {
  test(`a fixture's export does not state its finding: ${gf.name}`, (t) => {
    const ticketsPath = path.join(gf.dir, 'tickets.jsonl');
    if (!fs.existsSync(ticketsPath)) {
      t.skip(`${gf.name}/tickets.jsonl does not exist yet -- the fixture files (tickets.jsonl, docs/, bundle) have not been built`);
      return;
    }
    const key = readAnswerKeyJson(gf.answerKeyPath);
    const { phraseHits, dateHits } = findFindingLeaks(ticketsPath, key.confession_phrases);
    assert.deepEqual(phraseHits, [], `confession phrase(s) found in ${gf.name}: ${JSON.stringify(phraseHits)}`);
    assert.deepEqual(dateHits, [], `comment(s) at or after a reopen citing an earlier comment's date in ${gf.name}: ${JSON.stringify(dateHits)}`);

    // Required, not opt-in: a governed fixture whose key omits the field would
    // skip the floor and the date half could go quiet unseen (third review).
    assert.ok(
      Number.isInteger(key.expected_reopen_points),
      `${gf.name}'s answer key must carry expected_reopen_points, the count of tickets with a detectable reopen point, so the date half of this check cannot go quiet silently`,
    );
    const actual = reopenPointCount(ticketsPath);
    assert.equal(
      actual,
      key.expected_reopen_points,
      `expected ${key.expected_reopen_points} tickets with a detectable reopen point in ${gf.name}, found ${actual}. Either a ticket was added or removed (update the key) or the reopen vocabulary ("Reopening.", "PR up") drifted out from under reopenAt()`,
    );
  });
}

// Watched red: the same two checks against the confessing sibling, using
// backlog-read-dates's confession_phrases -- fixture-specific vocabulary
// shared by both, since backlog-read-dates's six members are the same twelve
// tickets with only the confessions edited out. This must fail on both
// halves independently, not only in their union: a phrase list gutted to one
// entry still leaves the date half at six members, which would keep a
// union-only assertion green while the phrase half stopped covering anything
// (2026-09-11 review, verified by shrinking the list to one phrase). Each
// half's own member count is asserted separately here.
test("a fixture's export does not state its finding: backlog-read fails this check (red, expected)", () => {
  const confessionPhrasesByBucket = readAnswerKeyJson(DATES_ANSWER_KEY).confession_phrases;
  const { phraseHits, dateHits } = findFindingLeaks(path.join(FIXTURE, 'tickets.jsonl'), confessionPhrasesByBucket);

  const unreadPhraseHits = phraseHits.filter((h) => h.bucket === 'unread');
  const unreadPhraseMembers = new Set(unreadPhraseHits.map((h) => h.id));
  assert.ok(
    unreadPhraseMembers.size >= 5,
    `expected the unread phrase list alone to cover at least five members, found ${unreadPhraseMembers.size}: ${[...unreadPhraseMembers].sort().join(', ')}`,
  );

  const dateMembers = new Set(dateHits.map((h) => h.id));
  assert.ok(
    dateMembers.size >= 5,
    `expected the date-citation half alone to cover at least five members, found ${dateMembers.size}: ${[...dateMembers].sort().join(', ')}`,
  );

  // Extra, per the 2026-09-11 maintainer ruling: a fixture may not state any
  // bucket, so backlog-read's six decoys -- each of which confesses its own
  // non-unread bucket in plain language -- must also register as hits, under
  // their own bucket names, not the unread one.
  const decoyBucketHits = phraseHits.filter((h) => h.bucket !== 'unread');
  const decoyMembers = new Set(decoyBucketHits.map((h) => h.id));
  assert.ok(
    decoyMembers.size >= 6,
    `expected all six decoys to confess their own bucket, found ${decoyMembers.size}: ${[...decoyMembers].sort().join(', ')}`,
  );

  // Coverage floor, sibling copy: the same count check the governed test now
  // runs (above), against backlog-read itself, pinned against
  // backlog-read-dates's expected_reopen_points since both fixtures share the
  // same twelve tickets and reopen vocabulary. Keeping this copy here, next
  // to the phrase- and date-half assertions it sits beside, is fine per the
  // 2026-09-11 review; the defect was that it was the ONLY copy.
  const expectedReopenPoints = readAnswerKeyJson(DATES_ANSWER_KEY).expected_reopen_points;
  const actualReopenPoints = reopenPointCount(path.join(FIXTURE, 'tickets.jsonl'));
  assert.equal(
    actualReopenPoints,
    expectedReopenPoints,
    `expected ${expectedReopenPoints} tickets with a detectable reopen point in backlog-read, found ${actualReopenPoints}`,
  );
});

// The reviewer's own reopen-marker candidate (2026-09-11 second review, R1):
// reword the tracker's reopen vocabulary ("Reopening." -> "Sending back.",
// "PR up" -> "Change is ready") while leaving reopen_count and every date
// citation untouched. The first version of the coverage floor missed this --
// it lived only in the red test above, filtered to reopen_count === 1 first,
// so a mutation that also zeroed reopen_count would have passed vacuously,
// and this one (which does not even touch reopen_count) passed silently
// against the un-floored governed test. Built here as a real mutation of the
// sibling's own comments, not described.
test('coverage floor catches the reviewer\'s reopen-vocabulary-drift candidate', () => {
  const expectedReopenPoints = readAnswerKeyJson(DATES_ANSWER_KEY).expected_reopen_points;
  const tickets = readTickets(path.join(FIXTURE, 'tickets.jsonl'));
  assert.equal(
    tickets.filter((t) => reopenAt(t) != null).length,
    expectedReopenPoints,
    'sanity: the unmutated sibling should hit the expected reopen-point count before mutation',
  );

  const reworded = tickets.map((t) => ({
    ...t,
    comments: (t.comments ?? []).map((c) => ({
      ...c,
      body: (c.body ?? '').replace(/Reopening\./gi, 'Sending back.').replace(/PR up/gi, 'Change is ready'),
    })),
  }));
  const afterCount = reworded.filter((t) => reopenAt(t) != null).length;
  assert.notEqual(
    afterCount,
    expectedReopenPoints,
    `expected the reopen-vocabulary reword to drop the reopen-point count below ${expectedReopenPoints}, found it unchanged at ${afterCount} -- the coverage floor would not catch this candidate`,
  );
  // Every date citation the reviewer's candidate keeps is still visible to
  // the export; only the reopen-point count reads it as quiet.
  const citationCount = reworded.reduce((n, t) => n + dateCitations(t).length, 0);
  assert.ok(citationCount > 0, 'sanity: the reworded candidate should still carry date citations in its comment bodies');
});

// Sentence-scoped matching, regression cover, extended to every bucket
// (2026-09-11 second review, R5: the record-noun gate was applied to the
// unread list only; the four decoy lists carried the same defect, with
// `\bagreed on\b.*\bcall\b` also matching inside "call-to-action" on top of
// it). False positives are built, not described; true positives are the
// fixture's own real member/decoy text, so a future change to a gate is
// caught even if someone edits the fixture out from under it.
function confessionPatterns(bucket) {
  return readAnswerKeyJson(DATES_ANSWER_KEY).confession_phrases[bucket];
}

function hitsInBucket(body, bucket) {
  const sentences = sentencesOf(body);
  const hits = [];
  for (const pattern of confessionPatterns(bucket)) {
    const re = new RegExp(pattern, 'i');
    if (sentences.some((s) => re.test(s))) hits.push(pattern);
  }
  return hits;
}

const SENTENCE_SCOPE_CASES = [
  {
    bucket: 'unread',
    falsePositives: [
      'on a slow connection the toast fires and clears before the page paints, so the user never saw the confirmation',
      'They did not see the overdue badge at all on the tablet breakpoint.',
      'The empty state renders behind the modal. Testers on the 13-inch screen did not see it.',
    ],
    truePositive: 'Did not see that comment, built to the description. Fixed.',
  },
  {
    bucket: 'missing',
    // R5: "The export dialog never specified a filename" reads like the same
    // shape as the real confession without the first-person subject; "no
    // character limit on the requirement field anywhere in the editor" reads
    // like the real confession without the developer's own "built against"
    // framing; "Nothing in the ticket queue view..." names a ticket without
    // pairing it with "design", which the real confession always does.
    falsePositives: [
      'The export dialog never specified a filename.',
      'no character limit on the requirement field anywhere in the editor',
      'Nothing in the ticket queue view tells the user which filter is active.',
    ],
    truePositive: 'We never specified what happens offline or on a failed save. Nothing in the ticket, nothing in the design.',
  },
  {
    bucket: 'unrecorded',
    // R5: "no way to know" needs the same record-noun gate as the unread
    // perception phrases; "agreed on ... call" needed a boundary against
    // "call-to-action", not just a record noun, since \bcall\b already
    // matches inside a hyphenated word.
    falsePositives: [
      'the customer has no way to know the invoice was not sent',
      'We agreed on the call-to-action wording in the design review.',
      'no way to know which of the two accounts the session belongs to',
    ],
    truePositive: "Different dev built the PDF path and had no way to know that, it was only in the call. As agreed on Tuesday's call, rounding is per line, then summed.",
  },
  {
    // No false positive was demonstrated against this list; it is included
    // for parity of coverage (every bucket gets a pinned true-positive check)
    // rather than because a defect was found here.
    bucket: 'misunderstood',
    falsePositives: [],
    truePositive: 'We read hidden as excluded. Both readings fit the sentence. We assumed the other one. Neither was written.',
  },
  {
    bucket: 'none',
    // R5: nearly the same wording as the real confession, describing a
    // different report entirely -- the gate requires "test" in the same
    // sentence, which the real confession names and this does not.
    falsePositives: ['The report checks the status, not the rows.'],
    truePositive: 'The test passed because it checks the status, not the rows.',
  },
];

for (const c of SENTENCE_SCOPE_CASES) {
  test(`sentence-scoped ${c.bucket} confession matching: false positives clear, real text still fires`, () => {
    for (const body of c.falsePositives) {
      assert.deepEqual(hitsInBucket(body, c.bucket), [], `expected no ${c.bucket} confession hit on ordinary prose: "${body}"`);
    }
    assert.ok(hitsInBucket(c.truePositive, c.bucket).length > 0, `expected the real ${c.bucket} text to still register as a confession`);
  });
}

// ---------------------------------------------------------------------------
// backlog-read-dates: the dates-only variant's own build checks.
//
// The no-confession check above already governs this fixture (its answer key
// carries confession_phrases, so governedFixtures() picks it up). What follows
// is the rest of its build: that it differs from the sibling in comment
// bodies and nothing else, that its bundle matches its tracked files, and that
// the two hand entries carried over from the sibling score the same values
// against the new key as against the old.
// ---------------------------------------------------------------------------

// Every comment body this fixture rewrites, as { ticket id: [comment index] }.
// Pinned rather than derived, so a later edit that rewrites one more comment
// -- the cheapest way to accidentally re-open a route -- is a red here and not
// a quiet fixture change.
//
// The plan's contract said "the reopen comment body and the developer reply
// body" for each member, and "a comment naming a date" for a decoy. What the
// build actually did is wider on the decoy side and narrower on two members:
// INV-104 and INV-110 needed only their developer reply rewritten, and every
// decoy needed the comment that stated its own bucket removed, per the
// maintainer ruling that a fixture may not state ANY bucket. This map is the
// build as it stands, not as it was specified.
const DATES_REWRITTEN_BODIES = {
  'INV-101': [2, 3],
  'INV-102': [3],
  'INV-104': [4],
  'INV-105': [2],
  'INV-107': [2, 3],
  'INV-108': [1],
  'INV-110': [4],
  'INV-111': [3],
  'INV-113': [2, 3],
  'INV-114': [2, 3],
  'INV-116': [2, 3],
  'INV-117': [1, 2],
};

test('backlog-read-dates differs from backlog-read in comment bodies only, at pinned positions', () => {
  const sibling = readTickets(path.join(FIXTURE, 'tickets.jsonl'));
  const dates = readTickets(DATES_TICKETS);
  assert.equal(dates.length, sibling.length, 'the two exports carry a different number of tickets');

  const changed = {};
  for (let i = 0; i < sibling.length; i++) {
    const a = sibling[i];
    const b = dates[i];
    assert.equal(b.id, a.id, `ticket ${i} is ${b.id} in backlog-read-dates and ${a.id} in backlog-read; the order is part of the export`);

    for (const field of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (field === 'comments') continue;
      assert.deepEqual(b[field], a[field], `${a.id}: field "${field}" differs between the two exports; only comment bodies may differ`);
    }

    const ca = a.comments ?? [];
    const cb = b.comments ?? [];
    assert.equal(cb.length, ca.length, `${a.id}: comment count differs between the two exports`);
    for (let j = 0; j < ca.length; j++) {
      for (const field of new Set([...Object.keys(ca[j]), ...Object.keys(cb[j])])) {
        if (field === 'body') continue;
        assert.deepEqual(cb[j][field], ca[j][field], `${a.id} comment[${j}]: field "${field}" differs; the date window the fixture turns on is built from "at" and "role"`);
      }
      if (cb[j].body !== ca[j].body) {
        if (!changed[a.id]) changed[a.id] = [];
        changed[a.id].push(j);
      }
    }
  }

  assert.deepEqual(changed, DATES_REWRITTEN_BODIES, 'the set of rewritten comment bodies is not the pinned one');
});

test('backlog-read-dates.bundle clones to exactly the tracked tickets.jsonl and docs/', () => {
  assertBundleParity(DATES_FIXTURE, 'backlog-read-dates');
});

test('backlog-read-dates ships the same docs/ as backlog-read', () => {
  const files = fs.readdirSync(path.join(FIXTURE, 'docs')).sort();
  assert.deepEqual(fs.readdirSync(path.join(DATES_FIXTURE, 'docs')).sort(), files);
  for (const f of files) {
    assert.equal(
      fs.readFileSync(path.join(DATES_FIXTURE, 'docs', f), 'utf8'),
      fs.readFileSync(path.join(FIXTURE, 'docs', f), 'utf8'),
      `docs/${f} differs between the two fixtures; the variant changes the export, not the docs an arm lands on`,
    );
  }
});

// "correct.md and prose-only.md score the same values against the new key as
// against the old" -- the plan's own test line. The expectation objects are
// the sibling's, read out of CASES by name, so neither list can be edited to
// agree with the other.
// The block is what carries over byte for byte; the prose above it does not,
// and asserting that it did was itself a defect (2026-09-22 fresh review).
// correct.md's sibling prose cites the reopen notes as saying the comment went
// unseen, which is true of backlog-read and false here -- this batch is what
// removed that wording from the export. The dates copy cites the only evidence
// its own export carries, the comment dates, so the fixture's worked correct
// answer does not claim an observation a reader cannot make.
for (const name of ['correct', 'prose-only']) {
  const c = CASES.find((x) => x.name === name);
  test(`backlog-read-dates hand entry: ${name} scores as it does on the sibling`, (t) => {
    assert.ok(c, `${name} is no longer one of the sibling's CASES`);
    const here = fs.readFileSync(path.join(DATES_FIXTURE, 'hand', `${name}.md`), 'utf8');
    const there = fs.readFileSync(path.join(FIXTURE, 'hand', `${name}.md`), 'utf8');
    if (name === 'prose-only') {
      assert.equal(here, there, 'hand/prose-only.md is a copy on purpose: it carries no block, and its prose cites no confession either way');
    } else {
      const block = (text) => text.slice(text.indexOf('Theme:'));
      assert.equal(block(here), block(there), `hand/${name}.md's block differs between the fixtures; the block does not depend on which export it is written against`);
      assert.doesNotMatch(here, /went unseen|did not see|never saw/i, `hand/${name}.md cites a confession this fixture's export does not carry`);
    }
    runHandEntryCase(t, c, DATES_FIXTURE, DATES_ANSWER_KEY);
  });
}

// The property the whole fixture turns on, asserted rather than assumed
// (2026-09-22 fresh review): a coordinated edit moving one member's product
// comment past its in_progress_at, in both exports at once, left all 33 tests
// green while destroying that member's only intended route. The field diff
// pins this fixture's dates to the sibling's, and the sibling's dates are
// pinned nowhere.
test('backlog-read-dates: the created_at/in_progress_at window selects exactly the member tickets', () => {
  const key = readAnswerKeyJson(DATES_ANSWER_KEY);
  const selected = readTickets(DATES_TICKETS)
    .filter((t) => (t.comments ?? []).some((c) => /^(product|design)$/.test(c.role) && c.at > t.created_at && c.at < t.in_progress_at))
    .map((t) => t.id);
  assert.deepEqual(
    selected.slice().sort(),
    key.expected_bucket_members.slice().sort(),
    'the date window no longer selects the six members and only them; either a comment date moved or a ticket\'s in_progress_at did, and the fixture\'s intended route is gone',
  );
});
