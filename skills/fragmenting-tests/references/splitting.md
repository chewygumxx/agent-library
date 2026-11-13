<!--
   -
   - ~chewygumxx/agent-library.git
   - ::: :/skills/fragmenting-tests/references/splitting.md
   -
   -->

# Splitting a test file

A file past 20 KiB, or holding several subjects' tests, becomes a
directory of a file per part, as the skill's layout sets out. A 48 KiB
file split so came to parts of 2 to 14 KiB.

## Before splitting

1. Run the tests. Keep the counts of tests, failures and assertions, and
   the sorted titles of the file to split.
2. Fix any failure first, to its root cause, and commit the fix alone.
   A split mixes moved lines with changed ones; a fix inside it is lost.

## Splitting

- Move each `describe` block verbatim, by its line range, with a short
  script. Never retype a test.
- What the blocks share moves to a harness: paths, the per-test setup
  and the helpers.
- A runner that loads a shared module once for every test file, as Bun
  does, runs hooks the harness registers on load for the first file
  alone. The harness exports a `sandbox()` that registers them instead;
  each test file calls it once, at its top.
- Stand-ins for outside commands become shell scripts with a shebang:
  in `<subject>/bin/`, which the harness puts on `PATH`, or in
  `<subject>/stand-ins/` for one copied beside a script under test. A
  shared helper, such as logging each call, is itself a command in
  `bin/`. shfmt and ShellCheck find a script by its shebang, so they now
  lint what strings in the tests hid.
- Let the linter drop each file's unused imports, such as
  `biome check --write --unsafe`, then unexport what only the harness
  uses, which an unused-export check such as knip reports.

## Tests that run commands

Run what a test spawns from its temporary directory, outside every
checkout, where a mise shim finds no config to refuse. A test that runs
git in a scratch repository drops every `GIT_*` variable from its
environment, or it writes to the real repository's index and branch.

- A test that replaces `HOME` hides the user's mise trust. A tool on
  `PATH` may be a mise shim, which reads the config of every directory
  above the one it runs in and refuses any untrusted. Run from a
  worktree nested within the main checkout, it meets the checkout's
  config too, which no `MISE_TRUSTED_CONFIG_PATHS` naming the worktree
  covers: 30 tests failed so, with no file changed.
- A pre-commit hook runs the tests with git's own variables set, such as
  `GIT_INDEX_FILE`, which a git run by a test obeys.

## Checking the split

- The same counts of tests and assertions as before, failing none.
- The same titles: compare the sorted `it(` lines of the old file, from
  `git show HEAD:<path>`, with those of the new files together.
- The whole check, with every new file staged first: a check that lists
  files through git skips a file it does not track yet.

## Mapping the parts

Give each part its task, and the directory its `test:<subject>`, as the
skill's map sets out: copy [`tasks.toml`](../assets/tasks.toml) to the
directory, change its own path in its header to match and replace each
`<...>`. Remove the old file's task.

## Commits

Commit in this order. Each commit passes the checks alone, so the split
is one commit with its tasks: the guard fails a file without a task, and
a task without its file.

1. The fix of any failing test.
2. The build changes the split needs, such as an import setting or an
   unused-export check's entry files.
3. The split: the new directory with its tasks, and the old file with
   its task removed.

<!-- vim:set expandtab shiftwidth=2 filetype=markdown foldlevel=3: -->
