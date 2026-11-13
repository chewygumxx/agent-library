---
name: fragmenting-tests
description: >-
  Use when a test file has grown too long to read whole, when splitting
  one into scoped files, or when adding, moving or renaming a test file in
  a repository whose tests are mapped by mise tasks for `mise tasks` and
  `mise mcp`.
license: GPL-3.0-only
---

<!--
   -
   - ~chewygumxx/agent-library.git
   - ::: :/skills/fragmenting-tests/SKILL.md
   -
   -->

# Fragmenting tests

A test file too long to read whole costs every agent that opens it, which
reads all of it to change one part. Split it into a file per part, each
read at once, and give each file a mise task naming what it tests and the
paths it covers. `mise tasks` and the `mise://tasks` resource of
`mise mcp` then map any path in the repository to its tests.

## Layout

- A subject's tests live in one `tests/<subject>.test.<ext>`.
- A file grown too long to read whole, or holding several subjects,
  becomes a directory, `tests/<subject>/`: a `<part>.test.<ext>` for each
  part, and beside them what they share, such as `harness.<ext>`,
  stand-ins and the directory's `tasks.toml`. A part is what one
  `describe` covers, typically one script or module. A 48 KiB file split
  so came to parts of 2 to 14 KiB.
- Learn how the runner finds tests before naming anything. Bun runs only
  files whose own name holds `.test.`, `_test`, `.spec.` or `_spec`; a
  directory's name counts for nothing. So the directory takes no `.test`
  suffix, every suite keeps the marker, and no infrastructure carries it.
  For another runner, probe it: a marked and an unmarked file in a
  scratch directory under `tests/`, then count the files it ran.

## Before splitting

1. Run the tests. Keep the counts of tests, failures and assertions, and
   the sorted titles of the file to split.
2. Fix any failure first, to its root cause, and commit the fix alone.
   A split mixes moved lines with changed ones; a fix inside it is lost.

## Splitting

- Move each `describe` block verbatim, by its line range, with a short
  script. Never retype a test.
- What the blocks share moves to `harness.<ext>`: paths, the per-test
  setup and the helpers. State the tests read, such as a temporary root,
  is an exported `let`, a live binding the setup assigns.
- Bun loads a shared module once for every test file, so hooks it
  registers on load reach only the first file. The harness exports a
  `sandbox()` that registers them; each test file calls it once, at its
  top.
- Stand-ins for outside commands become shell scripts with a shebang:
  in `<subject>/bin/`, which the harness puts on `PATH`, or in
  `<subject>/stand-ins/` for one copied beside a script under test. A
  shared helper, such as logging each call, is itself a command in
  `bin/`. shfmt and ShellCheck find a script by its shebang, so they now
  lint what template strings hid.
- Let the linter drop each file's unused imports, such as
  `biome check --write --unsafe`, then unexport what only the harness
  uses, which knip would report.
- TypeScript under Bun imports `./harness.mts` by its own name with
  `allowImportingTsExtensions` in `tsconfig.json`, beside `noEmit`. Widen
  knip's `entry` to `tests/**/*.test.mts`.

### Running scripts from tests

A test that replaces `HOME` hides the user's mise trust. A tool on `PATH`
may be a mise shim, which reads the config of every directory above the
one it runs in and refuses any untrusted: run from a worktree nested
within the main checkout, it meets the checkout's config too, which no
`MISE_TRUSTED_CONFIG_PATHS` naming the worktree covers. Run what the tests
spawn from the test's temporary root, outside every checkout, where mise
finds no config at all.

## Verifying the split

- The same counts of tests and assertions as before, failing none.
- The same titles: compare the sorted `it(` lines of the old file, from
  `git show HEAD:<path>`, with those of the new files together.
- The whole check, with every new file staged first: a check that lists
  files through git skips a file it does not track yet.

## Mapping each test file

`mise://tasks` gives each task's `name`, `description`, `tags`,
`depends`, `sources`, `outputs`, `dir`, `run` and `source`, the file it
came from. It drops TOML comments and keys mise does not know, so the map
is held in those fields alone.

- Each test file is run by exactly one task. A single file's task is in
  `tests/tasks.toml`; a directory's are in its own `tasks.toml`, copied
  from [`assets/tasks.toml`](assets/tasks.toml) with its own path in its
  header changed to match and each `<...>` replaced. Each file's header
  says only what it holds; the reasoning goes in the guidance file.
- `.config/mise/config.toml` includes them by glob, beside the task
  files the configuring-mise-tasks skill lays out, one per family under
  `.config/mise/tasks/`, so a new directory registers itself:

  ```toml
  [task_config]
  includes = [".config/mise/tasks/*.task.toml", "tests/tasks.toml", "tests/*/tasks.toml"]
  ```

- The map lives beside the tests, not in a family's file under
  `.config/mise/tasks/`: a test directory carries its own. `test` itself
  stays with `install` and `check`, in `standard.task.toml`.
- A task is named `test:<subject>`, or `test:<subject>:<part>` in a
  directory, which also has a `test:<subject>` with
  `depends = [ "test:<subject>:*" ]` and nothing more.
- `run` is exactly `bun test ./<path>`, of that one file: the leading
  `./` makes Bun take a path rather than a pattern.
- `description` says in a line what the file tests.
- `tags` holds `test`, and a `covers:<path>` for each path the file runs
  or reads, directly or through what that path sources or calls: read
  the scripts to follow it. A path the file only names and never runs is
  not covered, nor is test infrastructure. A path may be a directory.
- Never `sources` or `outputs`. mise skips a task with `sources` whose
  files are unchanged, with `outputs` or without, and has no setting to
  keep it running. Tests always run, as they break on more than their
  files: the mise trust above broke 30 tests with no file changed.
  `covers:` tags hold the same map with no effect on running.
- `test` itself still runs every test in one runner process, as
  `bun test`, which finds them by name and so never leaves one out. The
  tasks are the map, and a way to run one file or one directory.
- They are not sub-tasks, as `lint:<kind>` is of `lint`, though named
  alike: `test` never depends on a `test:<subject>`, as it would then run
  each test twice.

An agent then asks:

- `mise tasks ls --tag covers:<path>`: the tests of a path.
- `mise tasks deps test:<subject>`: a directory's tasks, as a tree.
- `mise run test:<subject>`, or `run_task` through `mise mcp`: one
  subject's tests.

## Keeping the map whole

Copy [`assets/test-tasks.mts`](assets/test-tasks.mts) to
`tests/test-tasks.test.mts`, pointing its header at its new path, and map
it in `tests/tasks.toml` like any other. It reads
`mise tasks ls --json --no-global`, the view `mise mcp` serves, and fails:

- a test file with no task, or with two;
- a task that runs anything but one test file;
- a task without `test`, or without any `covers:`;
- a `covers:` path that does not exist;
- a test task with `sources` or `outputs`;
- a `test` that depends on any `test:` task.

It is written for Bun and `tests/**/*.test.mts`; port its six checks for
another runner. Prove it bites before relying on it: point one `covers:`
at a missing path, drop one task, add `sources` to one, make `test`
depend on one, and see each fail the check meant for it.

## Documenting

`tests/AGENTS.md`, or the repository's equivalent guidance file, holds
the rules above for the next agent: the layout, the task fields and why
they hold no `sources`, the harness's `sandbox()` and the stand-ins, and
staging a new file before checking. The root guidance file says only
what `tests/` holds and points to it.

## Commits

Each passes the checks alone, so a split is one commit:

1. The fix of any failing test.
2. The build changes the split needs: `tsconfig.json`, knip's `entry`.
3. The split: the new directory, and the old file removed.
4. The map: the task files and the include.
5. The guard test.
6. The guidance file.

<!-- vim:set expandtab shiftwidth=2 filetype=markdown foldlevel=3: -->
