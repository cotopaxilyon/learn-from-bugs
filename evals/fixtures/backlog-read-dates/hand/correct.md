## 2026-09-11 — A requirement written in a comment never reached the build

Six tickets across five months carry one shape: a product or design comment
adds a requirement after the description is already written, the build goes
ahead against the original description, and the gap only surfaces once QA or
somebody downstream runs into it. Nothing in the reopen notes says so: each of
the six is a symptom report. What the export does carry is the timing. Every
one of those comments is dated before the ticket went in progress, so the
information was on the ticket before anyone touched it.

The fix belongs to the ticket lifecycle rather than to any one surface:
promote a requirement-changing comment into the description before the
ticket can be picked up, and ask the question on the template itself.

Theme: new — requirements landed in a comment instead of the description; no existing label names a process failure where the requirement existed and sat unread
Window: `cat tickets.jsonl` → 12 items
Count: 6
Level: process
- INV-101: qa
- INV-104: user
- INV-107: qa
- INV-110: user
- INV-113: qa
- INV-116: qa
- INV-102: not-a-member
- INV-105: not-a-member
- INV-108: not-a-member
- INV-111: not-a-member
- INV-114: not-a-member
- INV-117: not-a-member
Bucket: unread
Landed: 6 promote any comment that changes a requirement into the ticket description before work starts, docs/ticket-template.md
Critic: not-run
