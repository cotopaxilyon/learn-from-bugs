# The periodic read

Companion to `SKILL.md`. Use this when running the analysis over a window of
issues rather than a single one.

Everything above starts from one issue. The other way to run it is over a window,
so the last month of closed issues, a release's QA findings, or a support queue.
Do this on a cadence rather than only when something hurts, because the whole
point is that no single ticket in the pile would have triggered it.

Retrieval is in `history-sources.md`, which covers which source, which command,
and what fidelity each one carries. Gather first, then:

1. **Tally twice, by theme and by bucket.** First group the window by what each
   issue was about, so accessibility, empty and error states, timezones,
   permissions, copy, mobile layout. Anything with more than a couple of entries
   is a candidate. Then group the same window again by which of the 3b buckets
   each issue fell into, missing, unread, unrecorded, misunderstood, or none,
   reading the bucket off the tracker signals in `bucket-signals.md` rather than
   off memory, and confirm a sample of each cluster by hand before it enters the
   entry. The two tallies find different things. Nine tickets whose
   requirement sat in a late comment have nine different symptoms, so the first
   tally splits them nine ways and the finding that comments go unread never
   surfaces; only the second tally can see it. A cluster in either tally is a
   candidate, and a cluster that appears in both is the one to pick in step 5.
   Each theme is stated as a count over the window's total, and the read names
   the test scope that produced the window, since a theme matching that scope
   is evidence about the audit until it is checked against a window the audit
   did not produce. Cluster the whole window before naming anything. Write the
   residue that fits no cluster into the entry as a count beside the theme's
   own, and where the prompt named a theme in advance, write that theme's share
   and its rank among the clusters rather than a sentence confirming it.
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
5. **Pick one theme, then write it down.** Not five themes. The output is a
   single upstream change with the issue count attached as its argument. That
   count is the most persuasive thing you will ever have in a planning
   conversation, and it expires as soon as people stop remembering the quarter.
   Write the read into the log using the theme block in step 6, which is where
   the count stops being something you remember. Every member row names one
   thing: a log entry by its date plus enough of its heading to pick it out from
   the others on that day, or a ticket id that appears in the output of the
   `Window:` command you ran. Neither the count nor the members are taken on
   your word, which is the point of writing it there rather than in a summary.

The failure mode here is producing an interesting summary and no change. If the
read does not end with something entering a plan, a template, a checklist, or a
person's actual scope, it did not happen.
