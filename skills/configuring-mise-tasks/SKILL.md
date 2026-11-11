---
name: configuring-mise-tasks
description: >-
  Use when adding, changing, reviewing or adopting a repository's mise
  tasks, deciding what belongs in package.json scripts or the runtime's
  equivalent, or running git hooks or worktree hooks through mise.
license: GPL-3.0-only
---

<!--
   -
   - ~chewygumxx/agent-library.git
   - ::: :/skills/configuring-mise-tasks/SKILL.md
   -
   -->

# Configuring mise tasks

Every repository offers the same tasks under the same names, written the
same way, so `mise run check` means one thing everywhere. Here is where an
action is defined, how tasks are written and named, how a task narrows to
staged files, and how hooks reach it.

## mise or the runtime

mise is the interface for development. It cannot be relied on wherever
the project runs beyond the developer's own machine, such as an end
user's install. The project's runtime tool (Bun, uv, cargo and the like)
is what is there everywhere.

- An action that must run without mise is defined in the runtime's
  layer: a script in `scripts/`, or an entry in the runtime's manifest. A
  lifecycle script the package manager runs, such as `prepare` on
  `bun install`, never calls `mise run`.
- Every other action is a mise task alone.
- Each action has one definition. The other layer may wrap it; nothing
  wraps in both directions, as a task reaching a script that runs
  `mise run` back is a loop.

The manifest's scripts (`package.json`'s, for Bun) hold only:

1. lifecycle scripts, such as `prepare`;
2. runtime entry points, such as `dev` or `start`;
3. names something outside the repository calls, such as a shared CI
   workflow's `bun run check`. Where that caller has mise, the entry is
   `"check": "mise run check"`.

Remove any other entry, and change its mentions from `bun run <name>` to
`mise run <name>`.

## Where tasks live

- `.config/mise/config.toml` holds the tools, and includes the tasks:

  ```toml
  [task_config]
  includes = [".config/mise/tasks.toml"]
  ```

  The include path is from the repository root.

- `.config/mise/tasks.toml` holds every task, as TOML. A task's `run` is
  one line, or a short list of one-line commands. Anything longer is a
  script in `scripts/`, which runs without mise. No file tasks with
  `#MISE` comments.
- Every task has a `description`, which `mise tasks` shows. Otherwise a
  task file carries labels, and at most a one-line why where a setting is
  not obvious. Longer reasoning goes in the directory's guidance file.
- Tools mise pins run by name. Tools the runtime installs run through it:
  `bunx --bun --no-install <cli>` for Bun, as `mise run` gives neither
  `node_modules/.bin` on `PATH` nor `bun run`'s Bun-as-node.

## The standard set

| Task      | Alias | Runs                                    | Writes |
| --------- | ----- | --------------------------------------- | ------ |
| `install` | `i`   | The locked dependency install           | yes    |
| `lint`    | `l`   | Every linter and format check           | no     |
| `format`  | `f`   | Every formatter                         | yes    |
| `test`    | `t`   | The tests                               | no     |
| `check`   | `c`   | Everything CI runs: `lint` and `test`   | no     |

Where they apply, `dev`, `start` and `build` too, wrapping the runtime's
own entry points, and `act`, which runs CI locally.

- Sub-tasks are named for their parent and their kind: `lint:md`,
  `format:toml`, `lint:types`. The parent depends on each, and mise runs
  them in parallel.
- A format check is a lint: `lint:toml` checks formatting as well as
  linting, so `format` only ever writes.
- Only the five parents take aliases.
- `lint`, `test` and `check` never write files; CI and the pre-commit
  hook rely on that.
- `lint:commit` takes the commit message file as an argument, so `lint`
  does not depend on it; only the `commit-msg` hook runs it.
- A task outside the set takes a name that cannot be mistaken for one in
  it, such as `commit` or `skills`.

To adopt the set, copy [`assets/tasks.toml`](assets/tasks.toml) to
`.config/mise/tasks.toml` and fill in its placeholders, and
[`scripts/with-files.sh`](scripts/with-files.sh) to `scripts/`.

## The `--staged` switch

Every file-based task, and `lint`, `format` and `check`, take `--staged`.
With it, a task acts on the staged files of its kind alone; without it,
on every tracked file of its kind. `scripts/with-files.sh` gives a task
its files:

```sh
scripts/with-files.sh ${usage_staged:+--staged} '*.md' -- <command>
```

mise sets `$usage_staged` only when the flag is given. A parent forwards
the flag through a templated `depends`:

```toml
depends = ['lint {% if usage.staged %}--staged{% endif %}', "test"]
```

A task that cannot narrow to files, such as the type check or the tests,
takes no flag, declares no `sources`, and checks everything on every run.

## Skipping unchanged work

Each checking task that reads particular files declares `sources`, the
files it reads and the
configuration that governs them, the lockfile and the tool pins in
`.config/mise/config.toml` among it, and `outputs = { auto = true }`. mise
then skips it when nothing changed since it last passed.

- mise keeps a record per set of arguments, so a `--staged` pass never
  lets a full run skip.
- A `--staged` run also takes git's index as a source, so a later staged
  run never skips a file staged since. Ask git for an absolute path: mise
  runs the template from `.config/mise/`, where a relative one points
  outside the repository and is silently dropped. Keep it inside the
  task, where it runs for `--staged` alone, as it fails outside git:

  ```toml
  sources = [
      "**/*.md",
      "!node_modules/**",
      "bun.lock",
      ".config/mise/config.toml",
      '{% if usage.staged %}{{ exec(command="git rev-parse --path-format=absolute --git-path index") }}{% endif %}',
  ]
  ```

- mise does not read `.gitignore`: a file written anywhere a source glob
  reaches, ignored or not, makes the task rerun. Exclude `node_modules`.
- `mise run --force check` runs everything regardless; mise's own flags
  go before the task's name.

## Hooks

A git hook is one line, calling a task:

- `pre-commit`: `mise run check --staged`
- `commit-msg`: `mise run lint:commit "$1"`

Worktree tools' hooks, such as worktrunk's in `.config/wt.toml`, call
`mise run <task>` likewise. A hook needs only the `mise` binary on `PATH`,
as `mise run` puts the pinned tools there itself. Where even that is
missing, as in a git GUI, the hook manager's per-user startup file adds
it, such as husky's `~/.config/husky/init.sh`.

As `check` runs the tests, the pre-commit hook runs them with git's own
variables set, such as `GIT_INDEX_FILE`. A test that runs git in a
scratch repository must drop every `GIT_*` variable from its environment,
or it writes to the real repository's index and branch.

## Trust

Includes and templates make mise refuse the configuration until it is
trusted. `mise run` and `mise install` trust the active configuration
themselves, so a new checkout needs nothing by hand. Never run
`mise trust` on the user's behalf.

A test that replaces `HOME` hides the user's trust from a mise shim on
`PATH`. Give its environment `MISE_TRUSTED_CONFIG_PATHS` set to the
repository root.

## Remote tasks

One exception to TOML-only tasks: `act`, and any CI task that depends on
a remote script referenced by a tag and fetched uncached. Such a task is
a hidden remote file task, run by a visible wrapper that fetches it
afresh each time:

```toml
[act]
description = "Run CI locally"
run         = "mise run --no-cache act-cached"

[act-cached]
description = "[Internal] Run CI locally"
file        = "git::https://<host>/<owner>/<repo>.git//<path>?ref=<tag>"
hide        = true
```

Hooks never call one.
