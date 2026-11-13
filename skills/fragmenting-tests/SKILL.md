---
name: fragmenting-tests
description: >-
  Use when adding, moving, renaming or deleting a test file, or changing
  what one runs, in a repository whose tests are mapped by mise tasks;
  when a test file passes 20 KiB or holds several subjects' tests; or when
  mapping a repository's tests for `mise tasks` and `mise mcp`.
license: GPL-3.0-only
---

<!--
   -
   - ~chewygumxx/agent-library.git
   - ::: :/skills/fragmenting-tests/SKILL.md
   -
   -->

# Fragmenting tests

Every test file stays small enough to read whole, 20 KiB at most, and has
a mise task naming what it tests and the paths it covers. `mise tasks`
and the `mise://tasks` resource of `mise mcp` then map any path in the
repository to its tests, so an agent changing a path finds and runs just
those.

## Layout

- A subject's tests live in `tests/<subject>.test.<ext>`.
- One past 20 KiB, or holding several subjects' tests, becomes a
  directory, `tests/<subject>/`: a `<part>.test.<ext>` per part, and
  beside them what they share, such as a harness, stand-ins and the
  directory's `tasks.toml`. A part is one script or module, with every
  `describe` about it.
- A runner finds tests by a marker in the file's own name, such as
  `.test.`, and ignores a directory's name. Mark every test file, and
  neither the directory nor its infrastructure.

## The map

`mise://tasks` gives each task's `name`, `description`, `tags`,
`depends`, `sources`, `outputs`, `dir`, `run` and `source`, the file it
came from. It drops TOML comments and keys mise does not know, so the map
is held in those fields alone.

- Each test file is run by exactly one task: a single file's is in
  `tests/tasks.toml`, a directory's in its own `tasks.toml`. A task
  file's header says only what it holds.
- A task is named `test:<subject>`, or `test:<subject>:<part>` in a
  directory, which also has a `test:<subject>` with
  `depends = [ "test:<subject>:*" ]` and nothing more.
- `run` runs that one file, by its path rather than a pattern that may
  match others: `bun test ./<path>` for Bun.
- `description` says in a line what the file tests.
- `tags` holds `test`, and a `covers:<path>` for each path the file runs
  or reads, directly or through what that path sources or calls: read
  the scripts to follow it. A path the file only names and never runs is
  not covered, nor is test infrastructure. A path may be a directory.
- Never `sources` or `outputs`. mise skips a task with `sources` whose
  files are unchanged, with `outputs` or without, and has no setting to
  keep it running. Tests break on more than their files, such as a tool
  or the directory they run from, so they always run; `covers:` tags
  hold the same map with no effect on running.
- `test` runs every test itself, in one runner process that finds them
  by name, so none is left out. Though named alike, the map's tasks are
  not its sub-tasks, as `lint:<kind>` are `lint`'s: `test` never depends
  on a `test:<subject>`, as it would then run each test twice.

## Changing a test file

- Adding one: give it its task.
- Moving or renaming one: change its task's name and `run` to match.
- Deleting one: delete its task, and a directory's `test:<subject>`
  with its last.
- Making a script under test source or call another, or stop: list its
  tests with `mise tasks ls --tag covers:<script>` and change their
  `covers:` to match. The guard checks only that a covered path exists;
  nothing finds one missing.
- Growing one past 20 KiB: split it, as [Splitting](./references/splitting.md)
  sets out.

Then run the tests, which hold the guard of the map.

## Asking the map

- `mise tasks ls --tag covers:<path>`: the tests of a path.
- `mise tasks deps test:<subject>`: a directory's tasks, as a tree.
- `mise run test:<subject>`, or `run_task` through `mise mcp`: one
  subject's tests.

## References

- [Splitting](./references/splitting.md): before splitting a test file,
  or writing a test that runs commands.
- [Adopting](./references/adopting.md): before mapping a repository's
  tests for the first time, or changing its guard.
- [Bun](./references/bun.md): before splitting or mapping tests that Bun
  runs.

<!-- vim:set expandtab shiftwidth=2 filetype=markdown foldlevel=3: -->
