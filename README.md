---
ctime: 2026-11-02
mtime: 2026-11-03
spdx: GPL-3.0-only
title: agentic-library
description: Widely compatible agent asset collection
tags:
  - agent
  - skills
  - agent-skills
  - vibes
  - vibe-coding
---

<!--
   -
   - ~chewygumxx/agentic-library.git
   - ::: :/README.md
   -
   -->

# agentic-library

Widely compatible agent asset collection.

## Layout

- `skills/` holds this repository's own skills, one directory each.
- `.agents/skills/` and `.claude/skills/` hold third-party skills, linked
  in by the [`skills`](https://skills.sh/) CLI and pinned by
  `skills-lock.json`. Git ignores both directories.

## Skills

| Skill               | For                                                  |
| ------------------- | ---------------------------------------------------- |
| `agent-stewardship` | Running agents within their context and usage limits |
| `compact-summary`   | Writing and rating a compaction's instructions       |
| `worktrees`         | Making git worktrees that come out whole             |

Install all of them, or one, into a project, or with `--global` for every
project:

```sh
bunx skills add chewygumxx/agentic-library
bunx skills add chewygumxx/agentic-library --skill worktrees --global
```

`agent-stewardship` is configured by a roster in your agent instructions
and states what each of its parts needs. See its
[`SKILL.md`](./skills/agent-stewardship/SKILL.md).

A skill here must stand alone once copied out of this repository:
`tests/skills.test.mts` fails one that links outside itself, or that still
names the project it was imported from.

## Development

- `bun install` links the third-party skills from `node_modules` offline.
- `bun run skills` syncs them all, fetching the git sources listed under
  `skills` in `package.json`.
- `bun test` runs the tests; `bun run check` runs them and every other
  check CI runs; `bun run commit` composes a commit.

<!-- vim:set expandtab shiftwidth=2 filetype=markdown foldlevel=3: -->
