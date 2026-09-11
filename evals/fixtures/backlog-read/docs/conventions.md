# Conventions

## Money

Totals are computed in integer minor units and rounded once, at display.
Never round an intermediate.

## Dates

A record's day is the day in the account's timezone, not the server's.

## Lookups

A search that can miss returns `null` rather than throwing; the caller checks
before use.
