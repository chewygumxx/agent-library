---
ctime: 2026-09-29
mtime: 2026-11-09
spdx: GPL-3.0-only
title: Repository Agent Instructions
description: Repository agent instructions
tags:
  - agents
---

<!--
   -
   - ~chewygumxx/agent-library.git
   - ::: :/AGENTS.md
   -
   -->

# Repository Agent Instructions

## Continuous Granular Commits

Continuously granularly commit as you work. Compose single-line commit messages
whenever appropriate. If the granular commit does indeed warrant further
context, include such within the commit message body.

## Repository Metadata

`.repo-metadata.jsonc` holds the GitHub repository's own description, topics
and licence. CI applies it on every push to `main`, so edit those settings
there and never in the GitHub web interface: nothing rejects a web edit, and
the next push silently reverts it.

<!-- vim:set expandtab shiftwidth=2 filetype=markdown foldlevel=3: -->
