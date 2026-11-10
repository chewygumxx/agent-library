---
ctime: 2026-11-02
mtime: 2026-11-09
spdx: GPL-3.0-only
title: agent-library
description: >-
  Curated agent asset catalogue prioritising harness and model compatibility.
tags:
  - agent
  - skills
  - agent-skills
  - vibes
  - vibe-coding
---

<!--
   -
   - ~chewygumxx/agent-library.git
   - ::: :/README.md
   -
   -->

# agent-library

Deployable agent assets for provision of terse context that is both model aware
and harness invariant. Models with greater reasoning capacity are not burdened
with the context catered to and available for lower reasoning models. Assets are
crafted to not depend, nor even consider the feature difference between
harnesses.

## Skills

| Skill               | For                                                  |
| ------------------- | ---------------------------------------------------- |
| `agent-stewardship` | Running agents within their context and usage limits |
| `compact-summary`   | Writing and rating a compaction's instructions       |
| `worktrees`         | Making git worktrees that come out whole             |

Install all of them, or one, into a project, or with `--global` for every
project:

```sh
bunx skills add chewygumxx/agent-library
bunx skills add chewygumxx/agent-library --skill worktrees --global
```

`agent-stewardship` is configured by a roster in your agent instructions
and states what each of its parts needs. See its
[`SKILL.md`](./skills/agent-stewardship/SKILL.md).

A skill here must stand alone once copied out of this repository:
`tests/skills.test.mts` fails one that links outside itself, or that still
names the project it was imported from.

## Development

- `bun run skills` fetches the third-party skills listed under `skills` in
  `package.json`, at the commits pinned there, into `.agents/skills/` and
  `.claude/skills/`. Run it once after cloning: both directories are
  gitignored, and `bun install` only relinks skills already fetched.
- `bun test` runs the tests; `bun run check` runs them and every other
  check CI runs; `bun run commit` composes a commit.

<!-- vim:set expandtab shiftwidth=2 filetype=markdown foldlevel=3: -->
