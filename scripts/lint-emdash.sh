#!/usr/bin/env sh
# vim:set expandtab shiftwidth=4 filetype=sh:
# SPDX-License-Identifier: GPL-3.0-only

#
#
# ~chewygumxx/agent-library.git
# ::: :/scripts/lint-emdash.sh
#
#

# Usage: lint-emdash.sh [--staged]
#
# Fails on an em dash (U+2014) in any tracked or untracked file, or with
# --staged, on any line the staged changes add.

set -eu

# U+2014 as UTF-8 bytes, so this file does not trip its own check.
emdash=$(printf '\342\200\224')

if [ "${1-}" = --staged ]; then
    if git diff --cached -U0 | grep '^+' | grep -q "$emdash"; then
        echo "Em dash (U+2014) in staged changes; em dashes are prohibited." >&2
        exit 1
    fi
    exit 0
fi

# git grep exits 1 when it finds nothing, the only passing outcome.
status=0
git grep -nIF --untracked "$emdash" || status=$?
case $status in
0)
    echo "Em dash (U+2014) found above; em dashes are prohibited." >&2
    exit 1
    ;;
1) exit 0 ;;
*) exit "$status" ;;
esac
