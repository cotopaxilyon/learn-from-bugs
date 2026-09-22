# Conventions

## Money

Rounding is per line, then summed. Every path that produces a total, the
screen and the PDF alike, rounds each line to minor units first and adds the
rounded lines. Never round a summed total again.

## Dates

A record's day is the day in the account's timezone, not the server's.

## Lookups

A search that can miss returns `null` rather than throwing; the caller checks
before use.
