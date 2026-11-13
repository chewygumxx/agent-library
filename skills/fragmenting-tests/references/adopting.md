<!--
   -
   - ~chewygumxx/agent-library.git
   - ::: :/skills/fragmenting-tests/references/adopting.md
   -
   -->

# Mapping a repository's tests

Done once per repository: the tasks' files, their include, the guard and
the guidance file. Each file then gets its task as the skill's map sets
out.

## The tasks' files

The map lives beside the tests, not in a family's file under
`.config/mise/tasks/`, so a test directory carries its own:
`tests/tasks.toml` for single files, and a directory's own `tasks.toml`,
copied from [`tasks.toml`](../assets/tasks.toml). `test` itself stays
with `install` and `check`, in `standard.task.toml`.

`.config/mise/config.toml` includes them by glob, beside the task files
the configuring-mise-tasks skill lays out, one per family, so a new
directory registers itself:

```toml
[task_config]
includes = [".config/mise/tasks/*.task.toml", "tests/tasks.toml", "tests/*/tasks.toml"]
```

## The guard

Copy [`test-tasks.mts`](../assets/test-tasks.mts) to
`tests/test-tasks.test.mts`, pointing its header at its new path, and map
it in `tests/tasks.toml` like any other. It reads
`mise tasks ls --json --no-global`, the view `mise mcp` serves, and fails:

- a test file past 20 KiB;
- a test file with no task, or with two;
- a task that runs anything but one test file;
- a task without `test`, or without any `covers:`;
- a `covers:` path that does not exist;
- a test task with `sources` or `outputs`;
- a `test` that depends on any `test:` task.

It is written for Bun and `tests/**/*.test.mts`; port its seven checks
for another runner. Prove it bites before relying on it: point one
`covers:` at a missing path, drop one task, add `sources` to one, make
`test` depend on one, and see each fail the check meant for it.

## The guidance file

`tests/AGENTS.md`, or the repository's equivalent guidance file, holds
the rules for the next agent: the layout and its 20 KiB, the task fields
and why they hold no `sources`, keeping `covers:` true when a script
changes, the harness's `sandbox()` and the stand-ins, and staging a new
file before checking. A task file's header says only what it holds, and
points there. The root guidance file says only what `tests/` holds, and
points there too.

<!-- vim:set expandtab shiftwidth=2 filetype=markdown foldlevel=3: -->
