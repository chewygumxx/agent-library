---
title: Test Agent Instructions
description: How the tests are laid out, mapped and kept whole
---

<!--
   -
   - ~chewygumxx/agent-library.git
   - ::: :/tests/AGENTS.md
   -
   -->

# Test Agent Instructions

## Layout

- A subject's tests live in one `<subject>.test.mts`.
- A file past 20 KiB, or holding several subjects' tests, becomes a
  directory, `<subject>/`: a `<part>.test.mts` for each part, one script
  or module with every `describe` about it, and beside them what they
  share, such as `tests/agent-stewardship/`'s `harness.mts`, its
  stand-ins and their `tasks.toml`.
- Bun runs a file only if its own name holds `.test.`; a directory's name
  counts for nothing. So name every test file `*.test.mts`, and name no
  infrastructure so.

## Every Test File Has a Task

Each test file is run by exactly one mise task, which documents it for
`mise tasks` and for the `mise://tasks` resource of `mise mcp`. An agent
reads the repository's map of tests there, as mise drops TOML comments and
keeps only the fields below.

- A single-file test's task is in `tests/tasks.toml`. A directory's are in
  its own `tasks.toml`, which `.config/mise/config.toml` includes by the
  glob `tests/*/tasks.toml`: a new directory needs no change there.
- Name the task `test:<subject>`, or `test:<subject>:<part>` in a
  directory. A directory also has a `test:<subject>` that runs its parts,
  `depends = [ "test:<subject>:*" ]`, and nothing more.
- `run` is exactly `bun test ./<path>`, of that one file.
- `description` says in a line what the file tests.
- `tags` holds `test`, and a `covers:<path>` for each path that the file
  runs or reads, directly or through what that path sources or calls.
  Follow the scripts: a script that sources `pane-lock.sh`, or runs
  `send-prompt.sh`, puts those under its tests' `covers:` too. A path the
  file only names, and never runs, is not covered. Test infrastructure is
  not covered either. A path may be a directory.
- Never give a test task `sources` or `outputs`. mise skips a task with
  `sources` whose files are unchanged, `outputs` or not, and there is no
  setting to keep it running. Tests always run: they break on more than
  their files, as when a worktree nested within the main checkout put an
  untrusted mise config above the tests' `jq`. `covers:` tags record the
  same map with no effect on running.

`mise run test` does not use these tasks: it runs every test in one
`bun test`, which finds them by name, so none is ever left out. The tasks
are the map, and a way to run one file, or one directory's. Named like
`lint:<kind>`, they are not sub-tasks: `test` never depends on a
`test:<subject>`, as it would then run each test twice.

A task file's header says only what the file holds. The reasoning is
here.

`mise tasks ls --tag covers:<path>` lists the tests of a path, and
`mise tasks deps test:<subject>` draws a directory's tasks as a tree.

## Changing a Test File

- Adding one: give it its task.
- Moving or renaming one: change its task's name and `run` to match.
- Deleting one: delete its task, and a directory's `test:<subject>` with
  its last.
- Making a script under test source or call another, or stop: list its
  tests with `mise tasks ls --tag covers:<script>` and change their
  `covers:` to match. Nothing finds a missing one.
- Growing one past 20 KiB: split it into a directory. Commit the split
  with its tasks, as the guard fails a file without a task, and a task
  without its file.

## The Guard

`test-tasks.test.mts` checks the map against `mise tasks ls --json`, and
fails a test file past 20 KiB; a test file with no task, or two; a task
that runs anything but one test file; a task without `test` or any
`covers:`; a `covers:` path that does not exist; a test task with
`sources` or `outputs`; and a `test` that depends on any `test:` task.

## Directory Infrastructure

From `tests/agent-stewardship/`, which a new directory may follow:

- Bun loads a shared module once for all the test files, so hooks it
  registers on load reach only the first. The harness exports
  `sandbox()`, which each test file calls once, at its top, to give each
  of its tests a fresh temporary root.
- Run the scripts under test from that temporary root, never from the
  checkout. A tool on PATH may be a mise shim, which reads the config of
  every directory above it and refuses one the user has not trusted; a
  test's own `HOME` holds no trust.
- Write stand-ins for outside commands as shell scripts with a shebang,
  in `bin/` when they belong on PATH: shfmt and ShellCheck find and lint
  them by their shebang. Keep them out of template strings in TypeScript.
- Import TypeScript by its own name, `./harness.mts`: `tsconfig.json`
  allows it, as Bun runs the tests as written.

## Checking

Run `mise run test` for the tests, or `mise run test:<subject>` for one
subject's. Before committing, `git add` any new file: `mise run check`
lints only the files git tracks or has staged, so a file it has not seen
passes without a lint.

<!-- vim:set expandtab shiftwidth=2 filetype=markdown foldlevel=3: -->
