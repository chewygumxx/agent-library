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

## Development

- `bun install` links the third-party skills from `node_modules` offline.
- `bun run skills` syncs them all, fetching the git sources listed under
  `skills` in `package.json`.
- `bun run check` runs every check CI runs; `bun run commit` composes a
  commit.

<!-- vim:set expandtab shiftwidth=2 filetype=markdown foldlevel=3: -->
