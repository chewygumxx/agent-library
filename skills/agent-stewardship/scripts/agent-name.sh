#!/usr/bin/env sh
# vim:set expandtab shiftwidth=4 filetype=sh:
# SPDX-License-Identifier: GPL-3.0-only

#
#
# ~chewygumxx/agent-library.git
# ::: :/skills/agent-stewardship/scripts/agent-name.sh
#
#

# Prints your own agent's name, else its pane's id, for the messages and
# files that go by it, wherever your pane has moved since it started.
#
# Exit: 2 outside herdr, 4 no agent on the pane.

set -eu

here=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
# shellcheck source=pane-lock.sh source-path=SCRIPTDIR
. "$here/pane-lock.sh"

[ -n "${HERDR_PANE_ID:-}" ] || {
    printf 'usage: %s, within herdr\n' "${0##*/}" >&2
    exit 2
}
name=$(own_name) || die 4 "no agent on $HERDR_PANE_ID"
printf '%s\n' "$name"
