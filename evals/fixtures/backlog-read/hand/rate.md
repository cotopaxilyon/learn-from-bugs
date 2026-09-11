## 2026-09-11 — Too much reaches QA before it is finished

8 of 12 tickets in this window were reopened after their first close, so the
finding is that QA needs to test earlier, before the ticket is marked done
rather than after.

The block below is the well-formed one, so the gate accepts the entry: what
this hand entry exists to score is the first paragraph, which states a reopen
rate as the finding instead of the bucket under it.

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
