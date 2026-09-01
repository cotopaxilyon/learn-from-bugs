# Where the issue history lives

Companion to `SKILL.md` step 4 and `backlog-read.md`. **This is the only file that
describes retrieval**. The others point here.

Every source below carries a fidelity. A commit-log sweep and a labeled
tracker query are not the same evidence, and a read that doesn't say which one it
used is a read nobody can weigh.

## Day one, before a single label exists

Three sources need no tracker at all: the issue itself (steps 1–3 and the
sideways sweep work at a sample size of one), the codebase and its git history,
and the project's own Claude Code configuration, `CLAUDE.md`, `.claude/`, the
skills and hooks in force, and the session transcripts. When an agent wrote the
code, the instructions it worked from are on disk and are themselves evidence.

**And two sources give you theme-level evidence on day one**, if you already have
them. Error monitoring and product analytics are pre-aggregated, arriving grouped
and counted, so they answer step 4's frequency question with no labeling history at
all. If you have either, start there, it is the fastest way past the "no history
yet" problem.

## Four kinds of source

They are not interchangeable, and mixing them without saying so produces a count
that means nothing:

- **Reported**, someone wrote it down. Trackers, chat, support, commits.
  Complete only to the extent people bothered.
- **Machine-detected**, something noticed and recorded it without a human.
  Pre-grouped and pre-counted.
- **Reported elsewhere**, they told the public instead of telling you. App store
  reviews, review sites, forum threads. No channel back, and no expectation you'd
  act.
- **Unreported**, nobody said anything. The issue is visible only as behavior:
  people struggling, giving up, or quietly not using the thing.

Say which kinds you actually pulled from. A read built only on what was reported
to you is a sample of what people bothered to file, not a census of what went
wrong, and the other three kinds are where the things nobody filed would be.

---

# Reported

## A tracker with an MCP connector. Linear, Jira, Shortcut, Azure DevOps

Check whether a connector is available before promising a sweep. If one is, ask
for issues closed in the window with their labels, components, and close
reasons, then group by label.

If the issues aren't labeled, cluster by title and description text instead and
say that you did. **Fidelity: highest when labeled;
medium when clustered by text**, because text clustering finds themes that share
vocabulary and misses themes that don't.

## GitHub, without a connector

```
gh issue list --state closed --limit 200 --json number,title,labels,closedAt
gh pr list --state merged --limit 200 --json number,title,body,mergedAt
```

Filter to the window yourself. Fidelity: high where the repo labels issues,
**medium** where it doesn't. PR titles are a weaker signal than a label but a
much stronger one than nothing.

## A spreadsheet or CSV export

Ask for the file dropped in the repo or pasted directly, then read the columns
that exist rather than the ones you wish existed.

**Fidelity: as good as the export.** The trap is that a sheet is usually already a
*filtered view*, someone's triage list, one team's board, so confirm what the
rows represent before you count them. A theme that is missing because it was
filtered upstream looks identical to a theme that isn't there.

## Team chat. Slack, Teams, Discord

Where bugs get reported, triaged, fixed, and never written down anywhere else. If
a connector is available, search the window; otherwise ask for an export or a
paste of the relevant channels.

**Fidelity: low, and low in a way the other sources aren't.** A commit sweep is
incomplete but *enumerable*, you can list everything in the window. Chat search
is keyword recall: you can only find what you already thought to look for. That
makes chat good for confirming a theme you suspect and bad for discovering
one. Used for discovery it will hand back your own priors, which is worse than
returning nothing, because it looks like evidence.

**And it is a record of people, not artifacts.** Every other source here is code,
tickets, or events. This one is who said what, when, and how they said it. The
rule that the analysis must never land on a person is under the most pressure
exactly when the evidence is a transcript of individuals talking, so pull the
*mechanism* out of the thread and leave the attribution in it. Quote no one.

## Support tools. Zendesk, Intercom, Help Scout

Where user-reported UX problems accumulate, because support is the channel the
product actually offers users, engineering hears about it later, if at all. The
tickets arrive grouped by whatever taxonomy support uses, which is a theme tally
built by people who talk to users all day.

**Fidelity: high for what users complain about, blind to what they tolerate.**
Writing in costs a user time and goodwill, so the queue is a lower bound by
construction: friction that doesn't clear that bar leaves no ticket at all.

## Issues that only ever existed in a Claude Code conversation

In an agent-heavy workflow an issue can be found, fixed, and closed inside a
single turn without a ticket ever existing, so this source can hold history that
appears nowhere else.

```
git log --oneline --since="3 months ago"
git log --since="3 months ago" --format="%h %s%n%b" | grep -i "fix\|bug\|broken"
```

Read commit bodies and PR descriptions for the labels the skill asks you to leave
there (`fixed: … [empty-state]`), plus session transcripts where available.

Restrict this to the branch that ships: an unmerged branch or worktree is a
proposal, not history (`SKILL.md` step 4).

**Fidelity: lowest, and biased in a specific direction.** The fixes most likely
to be missing are the fast ones, which is exactly the category this source exists
to recover. Say that in the read. An unqualified "I found four issues" from a
commit sweep will be taken as a census when it is a sample.

---

# Machine-detected

## Error monitoring. Sentry and equivalents

**Where this is already installed, it is the strongest source here.** Errors arrive *grouped
and counted*, which is step 4's frequency question answered directly rather than
tallied by hand. Sort by event count and by first-seen; a group whose first-seen
predates the issue you're holding is a theme with a start date attached.

It is also where the detection gate gets answered: "did anything tell you, or
did a human have to" is usually settled by checking whether the thing ever fired
an event, and whether anyone was looking at it if it did.

**Fidelity: high for what throws, blind to what doesn't.** Silent failures, the
first entry in the class catalog, produce no event by definition. A clean
dashboard means "nothing threw," never "nothing broke."

---

# Reported, but not to you

## App store reviews, and public review sites

The App Store and Play console; G2, Capterra, Trustpilot, and public forum threads
for anything that isn't an app.

**This captures people who left and said so.** Someone who hits a bug, gives up,
uninstalls, and writes one star is invisible in your tracker and in support,
because they never wrote to you, the review is the only trace. (The ones who left
*without* saying anything show up further down, under Unreported.)

**Retrieval:** read them in the store console rather than the public listing, the
console attaches app version, device, and OS to each review, which is exactly
the environment metadata the environment-specific lens needs and which the review
text itself never contains. Sort by version and look for a step change after a
release.

**Fidelity: volume is not prevalence.** Reviews cluster hard at the extremes;
mild friction is never written down. Treat counts as a lower bound on the severe
tail and as no evidence whatsoever about the middle. Detail is thin, usually not
reproducible, and you generally cannot ask a follow-up, which per `intake.md` is
a finding about your test surface, not a reason to close.

**A rating step-change after a release is a detection signal**, slower and
noisier than error monitoring, measured in days to weeks, but it catches the class
that throws no exception: the flow that works exactly as coded and is wrong for
the user.

It also carries comparison and emotional register, "worse than the old version
since the redesign" is UX evidence no internal system will hand you.

---

# Unreported

## Product analytics and session replay. Pendo, Amplitude, Mixpanel, FullStory, Hotjar, LogRocket

Issues with zero reporters, the last row of the skill's provenance table,
where no gate caught it and nobody said anything. Rage clicks, dead clicks,
drop-off at one step, repeated back-navigation, a feature that shipped and nobody
uses. These never reach a tracker, a support queue, or a review: the people hitting
them didn't complain, they left quietly. Behavior is the only evidence there is.

**Fidelity: excellent for where and how many, useless for why.** Analytics points
at a surface; it never diagnoses. Pair it with replay for the why, and expect to
still need the code.

It only covers instrumented paths, so an uninstrumented flow
looks healthy for exactly the reason an untested one does, which is the same trap
as a category with suspiciously few issues. And session replay is the most
privacy-sensitive source in this document: it is literal recordings of people
using your product, frequently capturing personal data unless masking is
configured. The "copy the mechanism, never the payload" rule applies harder here
than anywhere else in the skill.

---

## When the source is thin

Name what you searched, over what window, and what fidelity it carries, then give
the theme reading anyway, marked as provisional. A hedged answer with its
provenance stated is useful. An unhedged answer from a thin source is worse than
none, because it gets quoted later as if it were a count.
