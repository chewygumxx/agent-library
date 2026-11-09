---
ctime: 2026-10-31
mtime: 2026-11-03
spdx: GPL-3.0-only
title: Budgets
description: >-
  Estimating a job against the plans' budgets, splitting one that fits
  nowhere, the Claude accounts and with-claude.sh, and at-limit.sh, with
  an example run.
tags:
  - agents
---

<!--
   -
   - ~chewygumxx/agent-library.git
   - ::: :/skills/agent-stewardship/references/budgets.md
   -
   -->

# Budgets

## Estimating a job

Before dispatching, read what is left: Claude's usage file
([Claude Code](./claude-code.md)) and Codex's footer
([Codex](./codex.md)). Then estimate what the job spends, from a like
job's spend if one ran: the share of a window one batch took, times the
batches. Count the effort it runs at: Codex at `xhigh` spends far
faster than at `high`. Route it as the skill's rules say, and when a
job fits nowhere whole, split it: a part that fits now, the rest after a
reset, each part a whole unit of work with its own report. Say a job
will not fit before it starts.

## The Claude accounts

An account is a `CLAUDE_CONFIG_DIR`. Two are named in the environment,
as absolute paths, where the agent is started:

- `AGENT_STEWARDSHIP_CLAUDE_PRIMARY`: the account spent first, by
  default `CLAUDE_CONFIG_DIR`, else `~/.claude`.
- `AGENT_STEWARDSHIP_CLAUDE_RESERVE`: the account for when the primary
  is spent. With none named, there is only the primary.

`with-claude.sh <command> [args]` runs a command on the account to
spend, by setting `CLAUDE_CONFIG_DIR`. It picks the primary, unless the
primary's usage file, under 10 minutes old, has it past 90% of the
5-hour window or 80% of the week, or the primary's directory is gone;
then the reserve. No reading, a stale one or a malformed one tries the
primary, whose limit then stops the job for a retry. It prints the
account chosen to stderr.

A command that holds its own credentials, and so ignores
`CLAUDE_CONFIG_DIR`, reads `AGENT_STEWARDSHIP_CLAUDE_ACCOUNT` instead,
which is `primary` or `reserve`.

## Waiting at a limit

`at-limit.sh` reruns a command that a plan's limit stopped:

```text
at-limit.sh [--wait S] [--tries N] [--retry CMD] -- <command> [args]
```

While the command exits 75, it waits S seconds (1200) and runs it
again, up to N more times (40). `--retry` gives a shell string run with
`sh -c` in place of the command after the first try, such as a resume.
It exits with the last run's code.

Exit 75 (`EX_TEMPFAIL`) is the only signal it reads. Wrap a command that
reports a limit any other way, so that it exits 75 for that alone.

## An example run

A batch that resumes, from its checkout, as a unit that outlives the
session, each try choosing its account anew:

```sh
me=$("$S/agent-name.sh")
"$S/job.sh" batch --notify "$me" -- "$S/at-limit.sh" \
    --retry "$S/with-claude.sh ./run-batch --resume" \
    -- "$S/with-claude.sh" ./run-batch
```

- `job.sh` runs the rest as a systemd unit in the current directory,
  so start it from the checkout, and prompts you when it stops
  ([recovery](./recovery.md)).
- `at-limit.sh` reruns on 75 alone. Its first try starts the run; each
  retry runs `--retry` instead, resuming it.
- `with-claude.sh` stands inside each try, so the account is chosen
  again after every wait, from the reading then.

A job with no resume to name, which takes up what is left by itself,
drops `--retry`:

```sh
"$S/job.sh" backfill --notify "$me" -- "$S/at-limit.sh" \
    -- "$S/with-claude.sh" ./run-backfill
```
