#!/usr/bin/env bash
# Build backlog-read-dates.bundle from the tracked fixture files, so the bundle
# an arm clones and the files the scorer's test reads are one thing. Run from
# anywhere; writes the bundle beside this script. The single commit is dated
# to the log's own start line, with an explicit offset so `git log
# --date=short` renders the same day wherever the clone is read. Same script as
# the sibling's with the paths changed; the two fixtures ship the same docs and
# the same commit date, and differ only in tickets.jsonl's comment bodies.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

cp "$here/tickets.jsonl" "$work/"
mkdir "$work/docs"
cp "$here"/docs/*.md "$work/docs/"

git -C "$work" init -q -b main
git -C "$work" add -A
GIT_AUTHOR_DATE='2026-08-10T09:00:00-04:00' GIT_COMMITTER_DATE='2026-08-10T09:00:00-04:00' \
  git -C "$work" -c user.name=fixture -c user.email=fixture@example.invalid \
  commit -q -m 'Export the closed tickets and the docs folder'
git -C "$work" bundle create "$here/backlog-read-dates.bundle" main >/dev/null 2>&1
git -C "$work" bundle verify "$here/backlog-read-dates.bundle" >/dev/null 2>&1 && echo "backlog-read-dates.bundle built from $(ls "$work"/docs | wc -l | tr -d ' ') docs plus tickets.jsonl"
