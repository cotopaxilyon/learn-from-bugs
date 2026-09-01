# The periodic read

Companion to `SKILL.md`. Use this when running the analysis over a window of
issues rather than a single one.

Everything above starts from one issue. The other way to run it is over a window,
so the last month of closed issues, a release's QA findings, or a support queue.
Do this on a cadence rather than only when something hurts, because the whole
point is that no single ticket in the pile would have triggered it.

Retrieval is in `history-sources.md`, which covers which source, which command,
and what fidelity each one carries. Gather first, then:

1. **Tally by theme.** Group the window by what each issue was about, rather than
   by severity or component. Accessibility. Empty and error states. Timezones.
   Permissions. Copy. Mobile layout. Anything with more than a couple of entries
   is a candidate.
2. **Ask what each cluster says about the process rather than the code.** A
   cluster means the work reliably reaches QA without that concern having been
   considered, so where would it have been considered? Usually a phase that does
   not exist, a question nobody's template asks, or a responsibility sitting with
   no role.
3. **Check where in the lifecycle each cluster was caught.** A theme caught by QA
   is a planning gap. The same theme reported by users is a planning gap and a QA
   scope gap, and the second is usually cheaper to close.
4. **Look at what is not there.** A category with suspiciously few issues is often
   untested rather than solid, since nobody files bugs against a surface nobody
   exercises. Check the same window's commits and PR bodies for fixes that never
   became issues at all. In an agent-heavy workflow a fix can land without a
   ticket, and a window read only from the tracker will systematically understate
   every theme the agents are handling quietly.
5. **Pick one theme.** Not five. The output is a single upstream change with the
   issue count attached as its argument. That count is the most persuasive thing
   you will ever have in a planning conversation, and it expires as soon as people
   stop remembering the quarter.

The failure mode here is producing an interesting summary and no change. If the
read does not end with something entering a plan, a template, a checklist, or a
person's actual scope, it did not happen.
