#!/bin/sh
# vim:set expandtab shiftwidth=4 filetype=sh:
# SPDX-License-Identifier: GPL-3.0-only

#
#
# ~chewygumxx/agent-library.git
# ::: :/tests/agent-stewardship.test/stand-ins/send-prompt.sh
#
#

# Stands in for send-prompt.sh beside a copy of job-stopped.sh: keeps its
# stdin in $STUB/send.stdin, and fails when $STUB/fail-send exists.

STUB=${STUB:?}

log-call send-prompt.sh "$@"

cat >"$STUB/send.stdin"
[ -e "$STUB/fail-send" ] || exit 0
echo "send-prompt.sh: boom" >&2
echo "second line" >&2
exit 3
