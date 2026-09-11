#!/usr/bin/env bash
# Release sequence, in two phases because the middle step is a push.
#
#   scripts/release.sh pre    before pushing
#   scripts/release.sh post   after pushing and updating the install
#
# Everything mechanical lives here or in check.sh. The one judgement step this
# cannot make is the voice read against the published copy, so `pre` names it and
# refuses to call itself complete.
set -uo pipefail
cd "$(dirname "$0")/.."

PLUGIN_JSON="plugins/learn-from-bugs/.claude-plugin/plugin.json"
SKILL="plugins/learn-from-bugs/skills/learn-from-bugs/SKILL.md"
REFS="plugins/learn-from-bugs/skills/learn-from-bugs/references"
fails=0
fail() { printf '  ✗ %s\n' "$1"; fails=$((fails + 1)); }
pass() { printf '  ✓ %s\n' "$1"; }
version_of() { grep -oE '"version": *"[^"]+"' "$1" | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+'; }

phase="${1:-}"
case "$phase" in pre|post) ;; *) echo "usage: $0 pre|post"; exit 2 ;; esac

if [ "$phase" = "pre" ]; then
  mk_name="$(grep -oE '"name": *"[^"]+"' .claude-plugin/marketplace.json | head -1 | cut -d'"' -f4)"
  pl_name="$(grep -oE '"name": *"[^"]+"' "$PLUGIN_JSON" | head -1 | cut -d'"' -f4)"
  echo "== structural checks =="
  if bash scripts/check.sh >/tmp/lfb-check.$$ 2>&1; then pass "check.sh clean"
  else fail "check.sh failed:"; grep '✗' /tmp/lfb-check.$$ | sed 's/^/     /'; fi
  rm -f /tmp/lfb-check.$$

  echo "== PHI screen =="
  # Local only, and it cannot run without the uncommitted word list. A missing
  # list is a fail rather than a skip: an unrun screen and a clean screen look
  # identical in a release log, and this repo is public.
  if bash scripts/phi-screen.sh >/tmp/lfb-phi.$$ 2>&1; then pass "PHI screen clean"
  else fail "PHI screen did not pass:"; sed 's/^/     /' /tmp/lfb-phi.$$; fi
  rm -f /tmp/lfb-phi.$$

  echo "== the version is bumped against what is published =="
  # The unit that ships is the push, so the comparison is against origin/main.
  # Against HEAD it goes blind the moment a plugin change is committed, and the
  # second release of a version reads as "nothing to release".
  new_v="$(version_of "$PLUGIN_JSON")"
  if ! git rev-parse --verify --quiet origin/main >/dev/null; then
    fail "no origin/main to compare against — run 'git fetch origin' first"
  else
    old_v="$(git show origin/main:"$PLUGIN_JSON" 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)"
    changed="$( { git diff --name-only origin/main -- plugins; \
                  git ls-files --others --exclude-standard -- plugins; } | sort -u | wc -l | tr -d ' ')"
    if [ "$changed" = "0" ]; then pass "no plugin changes against origin/main ($new_v)"
    elif [ "$new_v" = "$old_v" ]; then
      fail "$changed plugin file(s) differ from origin/main but the version is still $new_v — installs already holding $new_v will never pick them up"
    else pass "version $old_v -> $new_v, $changed plugin file(s) changed"; fi
  fi

  echo "== nothing untracked is being left behind =="
  # A new reference file that is never git-added passes every check in check.sh,
  # because check.sh reads the working tree and the published copy will not have
  # it. Repo-wide rather than plugins/: an untracked file anywhere is both a file
  # that will not ship and a file nobody has reviewed.
  untracked="$(git ls-files --others --exclude-standard | tr '\n' ' ')"
  if [ -z "$untracked" ]; then pass "nothing untracked"
  else fail "untracked, so unreviewed and unshipped: $untracked"; fi

  echo
  echo "  Not mechanical, and not done by this script:"
  echo "  - dispatch a fresh reader over the diff against the published copy, for voice"
  echo "  Then: commit, push, then 'claude plugin marketplace update $mk_name'"
  echo "  and 'claude plugin update $pl_name@$mk_name', then '$0 post'."
  echo "  'plugin install' will say \"already installed\" and do nothing."
fi

if [ "$phase" = "post" ]; then
  mk="$(grep -oE '"name": *"[^"]+"' .claude-plugin/marketplace.json | head -1 | cut -d'"' -f4)"
  pl="$(grep -oE '"name": *"[^"]+"' "$PLUGIN_JSON" | head -1 | cut -d'"' -f4)"
  v="$(version_of "$PLUGIN_JSON")"
  cache="$HOME/.claude/plugins/cache/$mk/$pl/$v"

  echo "== the installed copy is this version =="
  # Two questions, because the first version of this asked only the cheaper one.
  # A cache directory is created by `claude plugin marketplace update`, which
  # runs before the install and populates every version it finds, so "the cache
  # has 1.2.1" was true while the active plugin was still 1.1.0. Both 1.2.0 and
  # 1.2.1 released green through this check and neither was ever installed: the
  # `claude plugin install` that was supposed to do it answers "already
  # installed" and exits 0 without naming a version. `claude plugin update` is
  # the command that moves an existing install, and it says which versions it
  # moved between.
  active="$(node -e '
    const fs = require("fs");
    const f = process.env.HOME + "/.claude/plugins/installed_plugins.json";
    try {
      const d = JSON.parse(fs.readFileSync(f, "utf8"));
      const e = (d.plugins || {})[process.argv[1]] || [];
      console.log(e.map((x) => x.version).join(" "));
    } catch { console.log(""); }
  ' "$pl@$mk" 2>/dev/null)"
  if [ "$active" = "$v" ]; then pass "the installed plugin is $v"
  elif [ -z "$active" ]; then
    fail "$pl@$mk is not installed at all, so nothing is running this release"
  else
    fail "the installed plugin is $active, not $v — run 'claude plugin update $pl@$mk', then restart. A 'marketplace update' alone caches the new version without installing it, and 'plugin install' says \"already installed\" and does nothing."
  fi

  if [ -d "$cache" ]; then pass "cache has $mk/$pl/$v"
  else
    fail "no cache at $cache — run 'claude plugin marketplace update $mk' first"
  fi

  echo "== the installed files match what was released =="
  if [ -d "$cache" ]; then
    if diff -q "$SKILL" "$cache/skills/$pl/SKILL.md" >/dev/null 2>&1; then pass "SKILL.md matches"
    else fail "installed SKILL.md differs from the working tree"; fi
    # Content, not existence. An existence test passes on an installed reference
    # whose body was never released, and the release log then says they match.
    bad=""
    for f in "$REFS"/*.md; do
      c="$cache/skills/$pl/references/$(basename "$f")"
      if [ ! -f "$c" ]; then bad="$bad $(basename "$f")(missing)"
      elif ! diff -q "$f" "$c" >/dev/null 2>&1; then bad="$bad $(basename "$f")(differs)"; fi
    done
    if [ -z "$bad" ]; then pass "every reference is installed and identical"
    else fail "installed references wrong:$bad"; fi
  fi

  echo "== does the trigger surface need re-testing =="
  # Computed rather than remembered, and asked here rather than in `pre`: at pre
  # time the cache still holds the previous version, so a trigger case would
  # measure the description being replaced and read as a pass.
  fm_changed="$(git diff origin/main -- "$SKILL" | grep -cE '^[+-](name|description|user-invocable):' || true)"
  if [ "$fm_changed" = "0" ]; then pass "frontmatter unchanged against origin/main, evals/ results still hold"
  else fail "frontmatter changed, so run evals/README.md's four cases now and record them in evals/RESULTS.md"; fi

  echo
  echo "  A session that started before the update still holds the old registry."
  echo "  Anything you test from here needs a session opened after it."
fi

echo
if [ "$fails" -eq 0 ]; then echo "$phase: clean."; else echo "$phase: $fails check(s) failed."; fi
exit "$fails"
