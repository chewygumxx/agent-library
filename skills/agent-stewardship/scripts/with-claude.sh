#!/usr/bin/env sh
# vim:set expandtab shiftwidth=4 filetype=sh:
# SPDX-License-Identifier: GPL-3.0-only

#
#
# ~chewygumxx/agentic-library.git
# ::: :/skills/agent-stewardship/scripts/with-claude.sh
#
#

# Runs a command on the Claude account to spend, by pointing
# CLAUDE_CONFIG_DIR at it: the primary, unless a fresh reading of its usage
# shows it near a limit or its directory is gone, then the reserve when
# one is named. A reading is $XDG_RUNTIME_DIR/claude-usage-<account>.json,
# written by statusline.sh, the account being the last part of the
# primary's directory; it counts when it parses, is under 600 seconds old
# and holds rate_limits, and the primary is spent past 90% of the
# five-hour window or 80% of the week. Anything else is no reading, and
# the primary is tried: a limit then stops the job for at-limit.sh to
# retry.
#
#   with-claude.sh <command> [args]
#
# AGENT_STEWARDSHIP_CLAUDE_PRIMARY names the primary's directory, by
# default CLAUDE_CONFIG_DIR, else ~/.claude, and
# AGENT_STEWARDSHIP_CLAUDE_RESERVE the reserve's, by default none. The
# choice also goes out as AGENT_STEWARDSHIP_CLAUDE_ACCOUNT, primary or
# reserve, for a command that keeps its own credentials.

set -eu

[ $# -gt 0 ] || {
    printf 'usage: %s <command> [args]\n' "${0##*/}" >&2
    exit 2
}

default=${CLAUDE_CONFIG_DIR:-$HOME/.claude}
primary=${AGENT_STEWARDSHIP_CLAUDE_PRIMARY:-$default}
reserve=${AGENT_STEWARDSHIP_CLAUDE_RESERVE:-}
usage_file=${XDG_RUNTIME_DIR:-/nonexistent}/claude-usage-$(basename -- "$primary").json

# Prints "limited" for a fresh reading past a threshold; nothing otherwise.
# An unreadable file or a missing field is an error jq's try swallows.
limited() {
    [ -f "$usage_file" ] || return 0
    jq -r 'try (
        if (now - (.at | fromdateiso8601)) < 600
            and (.rate_limits.five_hour.used_percentage >= 90
                or .rate_limits.seven_day.used_percentage >= 80)
        then "limited" else empty end
    ) catch empty' "$usage_file" 2>/dev/null || true
}

account=primary
if [ -n "$reserve" ]; then
    if [ ! -d "$primary" ] || [ "$(limited || true)" = limited ]; then
        account=reserve
    fi
fi

if [ "$account" = primary ]; then
    CLAUDE_CONFIG_DIR=$primary
else
    CLAUDE_CONFIG_DIR=$reserve
fi
AGENT_STEWARDSHIP_CLAUDE_ACCOUNT=$account
export CLAUDE_CONFIG_DIR AGENT_STEWARDSHIP_CLAUDE_ACCOUNT
printf '%s claude account: %s\n' "$(date +%H:%M || true)" "$account" >&2
exec "$@"
