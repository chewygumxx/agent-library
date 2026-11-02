#!/usr/bin/env sh
# vim:set expandtab shiftwidth=4 filetype=sh:
# SPDX-License-Identifier: GPL-3.0-only

#
#
# ~chewygumxx/agentic-library.git
# ::: :/skills/agent-stewardship/scripts/statusline.sh
#
#

# A status line for Claude Code, which passes the plan's rate limits and
# the session's context window to its status line alone. This keeps them
# where an agent can read them before spending: rate_limits and
# context_window, with the time, in
# $XDG_RUNTIME_DIR/claude-usage-<account>.json, the account being
# CLAUDE_CONFIG_DIR's last part. Then it draws the line: the same input
# goes to the shell command in AGENT_STEWARDSHIP_STATUSLINE, if set, the
# user's own status line; otherwise a minimal line of the model's name and
# the 5-hour use. A missing jq or runtime directory skips the file; the
# status line is drawn regardless.

input=$(cat)

runtime=${XDG_RUNTIME_DIR:-}
if [ -n "$runtime" ] && [ -d "$runtime" ] && command -v jq >/dev/null 2>&1; then
    account=$(basename -- "${CLAUDE_CONFIG_DIR:-$HOME/.claude}")
    target="$runtime/claude-usage-$account.json"
    temporary="$target.$$"
    if printf '%s' "$input" |
        jq -c --arg at "$(date -u +%Y-%m-%dT%H:%M:%SZ || true)" \
            'select(.rate_limits != null or .context_window != null)
                | {at: $at, rate_limits, context_window}' \
            >"$temporary" 2>/dev/null &&
        [ -s "$temporary" ]; then
        chmod 600 "$temporary" && mv -f "$temporary" "$target"
    fi
    rm -f "$temporary"
fi

if [ -n "${AGENT_STEWARDSHIP_STATUSLINE:-}" ]; then
    printf '%s' "$input" | sh -c "$AGENT_STEWARDSHIP_STATUSLINE"
else
    line=$(
        printf '%s' "$input" |
            jq -r '[
                (.model.display_name // "Claude"),
                (.rate_limits.five_hour.used_percentage
                    | select(type == "number") | "5h \(round)%")
            ] | join(" | ")' 2>/dev/null |
            tr -d '[:cntrl:]'
    )
    printf '%s\n' "${line:-Claude}"
fi
