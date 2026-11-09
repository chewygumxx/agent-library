---
ctime: 2026-10-31
mtime: 2026-11-03
spdx: GPL-3.0-only
title: Codex
description: >-
  Dispatching work to Codex in herdr, reading its footer, answering its
  questions and approvals, its effort, and starting it anew.
tags:
  - agents
---

<!--
   -
   - ~chewygumxx/agent-library.git
   - ::: :/skills/agent-stewardship/references/codex.md
   -
   -->

# Codex

Codex runs in a herdr pane, under the name the roster gives it, written
`<codex>` here.

## Dispatching

Give Codex a task in files, not in the message:

1. Write a brief: the task, the files to read, the constraints, and the
   path of the report file it writes when done.
2. Send one line pointing at the brief, labelled by `send-prompt.sh`
   ([herdr](./herdr.md)):

   ```sh
   printf '%s\n' "Read <brief> and follow it." |
       "$S/send-prompt.sh" <codex>
   ```

   `herdr agent prompt <codex> "<line>"` also works for Codex,
   which, unlike Claude Code, takes the Enter that arrives in the same
   paste; it carries no label. `send-prompt.sh` sends the Enter apart
   after a pause, as Codex reads an Enter sent at once after typed text
   as a newline.

3. Wait in the background shell, then read the report:

   ```sh
   herdr agent wait <codex> --until idle
   ```

   A Codex waiting on a question never reaches idle: if the wait runs
   long, look with `herdr agent get` and `herdr agent read`.

## Its footer

`herdr agent read <codex>` shows its pane, ending in a footer such as:

```text
GPT-6-Astra xhigh · ~/dev/project · <task> · Context 11% used ·
5h 99% left · weekly 24% left
```

on one line, with the model, its effort, the 5-hour and weekly budgets
left, and `Context N% used`. A warning line above it gives the weekly
reset time, and once a limit is met, when it resets. Read it before
dispatching, as Claude's file is read ([budgets](./budgets.md)).

## Questions and approvals

- A question dialog: `shift+left`, then the option's number, then
  `enter`, each by `herdr agent send-keys <codex> <key>`; `ctrl+]` skips
  the question.
- Approvals: Codex asks unless the user's `~/.codex/config.toml` says
  otherwise. Under `Codex approvals: approve them yourself`, approve
  each with `herdr agent send-keys <codex> y`; without that line, relay
  each to the user. Whether Codex asks at all is the user's to set, with
  `approval_policy` and `sandbox_mode`; leave that file alone. A session
  started before a change to it keeps asking until it is restarted.

## Effort and its cost

The footer shows the effort. `xhigh` spends the budget far faster than
`high`: estimate at the effort the task will run at. Under limit
pressure Codex may switch models, which a job sensitive to its model
should treat as a stop.

## Starting anew

Between tasks, or when `Context N% used` runs high, start Codex anew
with `/new`. A slash command is typed, not sent as a message: as
`compact-self.sh` types `/compact`, write it with
`herdr pane send-text <pane> /new`, its pane from
`herdr agent get <codex>`, then send `enter` apart, at idle. It
resets Codex's context, then asks about a worktree, and `enter` keeps
the current one. The next brief must carry all Codex needs.
