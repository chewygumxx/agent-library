---
ctime: 2026-11-11
mtime: 2026-11-11
spdx: GPL-3.0-only
title: Standardised mise tasks
description: >-
  A portable skill, configuring-mise-tasks, that states how a repository's
  mise tasks are written and named, bundling a tested staged-files script
  and a starting task file, adopted first by this repository.
tags:
  - skills
  - mise
  - spec
---

<!--
   -
   - ~chewygumxx/agent-library.git
   - ::: :/docs/specs/2026-11-11_mise-tasks.md
   -
   -->

# Standardised mise tasks

## Status and intent

Agreed with the user in conversation on 2026-11-11; awaiting approval of
this document.

The user set out to restructure another repository's build assets around
mise, and found the work too broad to apply before its conventions were
settled. This skill settles the mise task half of those conventions, at a
manageable scale, so they can then be applied to every repository alike.
Comment and wiki conventions for configuration files are a separate skill,
not this one.

The user's principles, in their terms:

- mise is the primary interface for development. It cannot be relied upon
  in execution environments beyond the project's purview.
- The project's runtime tool (Bun, in the repository that prompted this) is
  the only utility expected everywhere the project executes.
- Logic that can run without mise lives in `scripts/`. Task files hold only
  TOML tasks that call it. No `#MISE` file tasks.
- Files carry as little in-file documentation as can reasonably be
  omitted, deferring to referenced guidance files, to keep data apart from
  documentation and to conserve an agent's context.

## Goals

- A skill, `configuring-mise-tasks`, in `skills/`, that an agent follows to
  add, change or review a repository's mise tasks, and that leaves every
  repository's tasks shaped and named alike.
- A standard set of tasks every repository offers, so `mise run check`
  means the same thing everywhere.
- Git hooks and worktrunk hooks that run through `mise run`.
- A `--staged` switch on file-based tasks, so the pre-commit hook runs the
  same tasks CI runs, narrowed to staged files.
- The skill bundles a tested POSIX staged-files script and a starting task
  file, copied into a repository on adoption.
- This repository adopts the skill in the same piece of work, as proof on
  real files.

## Non-goals

- Applying the skill to any other repository. Each adopts it later as its
  own work.
- Conventions for comments in configuration files, or for wiki pages: the
  separate `documenting-configuration` skill's ground.
- Changing the shared workflows in the user's `.github` repository.
- Changing what any check accepts.

## Anti-goals

- Anything that runs where mise may be absent depending on mise. In
  particular, a lifecycle script such as `prepare`, which the package
  manager runs on install, never calls `mise run`.
- An action defined twice, or wrapped in both directions. A `mise run`
  that reaches a script that runs `mise run` back is a loop.
- A `--staged` run recorded by mise as a full pass, so that a later full
  `check` skips files nobody checked.
- A skill that names this repository, the user, or a project it came from:
  `tests/skills.test.mts` fails it.

## Approaches

1. Rules only: a `SKILL.md` and a worked example. Smallest, but each
   repository writes its own staged-files script, and the copies drift.
2. **Chosen.** Rules plus bundled files: the skill ships a tested
   staged-files script and a starting task file, copied into the
   repository's `scripts/` and `.config/mise/`. Every repository starts
   identical; copies can still fall behind a later fix, with the skill's
   copy as the reference.
3. Rules plus remote tasks in the user's `.github` repository, through
   mise's `git::` file tasks. One copy, but every repository and its hooks
   then depend on that remote at run time, and the skill would name the
   user's repository, which this library's tests forbid. Ruled out.

The user chose 2, and chose this repository as the first adopter.

## The rules the skill states

### The boundary between mise and the runtime

- An action that must run where mise may be absent (a runtime entry point,
  a lifecycle script, anything run on an end user's machine) is defined in
  the runtime's own layer: a script in `scripts/`, or a one-line entry in
  the runtime's manifest. A mise task of the same name may wrap it.
- Every other action is defined only as a mise task.
- Each action has exactly one definition; the other layer only ever wraps
  it, and never in both directions.
- The skill speaks of "the project's runtime tool" (Bun, uv, cargo and the
  like), with Bun as the worked example, so it holds outside Bun projects.

### What the runtime's manifest keeps

`package.json` scripts (or the runtime's equivalent) hold only:

1. lifecycle scripts the package manager runs itself, such as `prepare`;
2. runtime entry points, such as `dev` or `start`, which must work without
   mise;
3. names something outside the repository calls, such as `check`, which a
   shared CI workflow runs as `bun run check`. Where the caller has mise, the
   entry is `"check": "mise run check"`.

Every other entry is removed; its action becomes a mise task only.
Mentions of a removed `bun run <name>` in the repository's docs become
`mise run <name>`.

### Where tasks live

- mise's configuration lives in `.config/mise/config.toml`, which mise
  finds natively.
- Tasks live in `.config/mise/tasks.toml`, included by
  `[task_config] includes = [".config/mise/tasks.toml"]` in
  `config.toml`. Probed on mise 2026.11.4: the include path is resolved
  from the repository root, not from `.config/mise/`.
- Tasks are TOML only. A task longer than one line calls a script in
  `scripts/`, which runs without mise. No file tasks with `#MISE` comments.
- The one exception, the user's: `act`, and any CI task that depends on a
  remote script referenced by tag and fetched uncached. Such a task is a
  hidden remote file task named `<name>-cached`, its `file` a `git::` URL
  pinned to a tag (`?ref=v1`), run through a visible wrapper task,
  `run = "mise run --no-cache <name>-cached"`, so each run fetches the
  tag. Hooks never call one. The hidden task's description starts
  `[Internal]`.
- Every task has a `description`, which `mise tasks` shows. Beyond that,
  task files carry labels and at most a one-line why where a setting is not
  obvious; longer reasoning goes in the directory's guidance file.

### The standard set

Every repository offers:

| Task      | Alias | Meaning                                 | Writes |
| --------- | ----- | --------------------------------------- | ------ |
| `install` | `i`   | Install the locked dependencies exactly | yes    |
| `lint`    | `l`   | Every linter and format check           | no     |
| `format`  | `f`   | Apply every formatter                   | yes    |
| `test`    | `t`   | The tests                               | no     |
| `check`   | `c`   | Everything CI runs: `lint` and `test`   | no     |

Where they apply: `dev`, `start` and `build` (often runtime entry points,
which mise wraps under the boundary above), and `act`, which runs CI
locally under the exception above.

- Sub-tasks are namespaced under their parent, `lint:md`, `format:toml`,
  and the parent depends on them, so mise runs them in parallel.
- Only parent tasks take aliases.
- A format check is a lint: `lint:toml` runs `tombi format --check` as well
  as `tombi lint`, so `format` needs no check mode (my call; it keeps
  `check` to `lint` and `test`).
- Type checking is a lint, `lint:types` (my call).
- `lint`, `test` and `check` never write files; CI and the pre-commit hook
  rely on that.
- A repository's task outside the set takes a name that cannot be mistaken
  for one in it.
- `lint:commit` takes the message file as an argument, so `lint` does not
  depend on it; only the `commit-msg` hook runs it (my call, from the
  review).
- Tools mise pins run by name. npm tools run as
  `bunx --bun --no-install <cli>`, as plain `mise run` gives neither
  `node_modules/.bin` on `PATH` nor the Bun-as-node behaviour `bun run`
  gives (my call, from the review; in the skill, the runtime's own
  equivalent).

### The `--staged` switch

- Every file-based `lint:*` and `format:*` task, and the parents `lint`,
  `format` and `check`, accept `--staged`. With it, a task acts only on
  staged files of its kind; without it, on every tracked file of its kind.
- Parents pass the switch to their dependencies through a templated
  `depends`. Probed on mise 2026.11.4, where the dependency received it:

  ```toml
  depends = ['lint:md {% if usage.staged %}--staged{% endif %}']
  ```

- A task that cannot be narrowed to files, such as `lint:types`, `test` or
  a dependency audit, runs in full whether or not `--staged` is given. The
  user: they run as they always have, checking everything on every
  pre-commit.

### Skipping unchanged work

- Each checking task declares `sources` (the files it checks and the
  configuration governing them) and `outputs = { auto = true }`, so mise
  skips it when nothing changed since it last passed. `mise run --force`
  overrides.
- The rule: a skip never lets an unchecked file through, in a full run or
  a `--staged` one.
- Probed on mise 2026.11.4: mise keeps a separate record per set of
  arguments, so a `--staged` pass never makes a full run skip, nor the
  reverse.
- That alone leaves one hole: a second `--staged` run compares against the
  first, so a file staged later but last edited before that pass would be
  skipped. A `--staged` run therefore also takes git's index as a source,
  which changes whenever anything is staged. Its path differs per
  worktree, so it is templated, and only for `--staged` runs, so full runs
  do not rerun on every `git add`. Probed, with the expected skips and
  reruns in each case:

  ```toml
  sources = [
      '*.md',
      '{% if usage.staged %}{{ exec(command="git rev-parse --git-path index") }}{% else %}*.md{% endif %}',
  ]
  ```

- The plan repeats these probes in this repository before relying on
  them, and records them in its report.

### Hooks

- A git hook is one line calling a task: `pre-commit` runs
  `mise run check --staged`; `commit-msg` runs `mise run lint:commit "$1"`,
  the task declaring the file as a `usage` argument (probed: an
  `arg "<file>"` reaches the task as `{{usage.file}}`).
- Hooks need only the `mise` binary on `PATH`, not an activated shell, as
  `mise run` puts the pinned tools on `PATH` itself. Where even the binary
  is missing, such as a git GUI, the skill points to husky's
  `~/.config/husky/init.sh` (or the hook manager's equivalent), which runs
  before every hook.
- The install that sets hooks up (`prepare`) never calls mise.
- Worktrunk's hooks in `.config/wt.toml` call `mise run <task>` likewise.

## Bundled files

The skill directory holds, besides `SKILL.md`:

- A POSIX `sh` staged-files script, copied to the repository's `scripts/`.
  Given `--staged` or not, and git path patterns, it runs a command once with
  the matching files appended, NUL-safe, and not at all when none match.
  Without `--staged` it takes tracked files; with it, staged files that are
  added, copied, modified or renamed. One script replaces the ten
  `git diff --cached` pipelines in today's `.husky/pre-commit`. Its exact
  name and flags are the builder's, within that behaviour.
- A starting `tasks.toml` holding the standard set and its `--staged`
  wiring, with placeholders where a repository fills in its own tools. It
  holds no `act`: that names a repository's own remote, which the skill
  describes as a pattern without naming one.
- Both pass the repository's linters, and the script has tests in
  `tests/`, as `agent-stewardship`'s scripts do. A test also fails when
  this repository's `scripts/` copy differs from the skill's bundled one
  (my call, from the review).

How the rules divide between `SKILL.md` and any `references/` file is the
builder's, guided by the README's aim that a model is not given context it
does not need.

## This repository's adoption

- `mise.toml` moves to `.config/mise/config.toml`; its tasks move to
  `.config/mise/tasks.toml` and take the standard set. `lint`, today Biome
  alone, comes to run every linter.
- `package.json` keeps `prepare`, `skills` (which `prepare` calls, so it
  stays in the runtime layer, with a mise task wrapping it) and
  `"check": "mise run check"` for the shared CI. Every other script becomes
  a mise task only, under a name in the set's namespaces; for example
  `typecheck` becomes `lint:types` and `commit` stays a task outside the
  set.
- `.husky/pre-commit` becomes `mise run check --staged`, so tests now run
  on every commit, as the user chose. `.husky/commit-msg` becomes
  `mise run lint:commit "$1"`. `.husky/` stays where it is: git's
  `core.hooksPath` is shared by every worktree, and moving it would switch
  off hooks on branches that lack the move.
- `.config/wt.toml`'s pre-start steps call `mise run` tasks;
  `bun run skills` becomes `mise run skills`.
- `act` and `act-cached` keep their form, under the exception.
- `.knip.jsonc` is updated for scripts moving out of `package.json`, which
  knip read to find used binaries and dependencies.
- `README.md`'s skill table lists the new skill, and its Development
  section speaks of `mise run`.
- Every mention of a removed `bun run <name>` becomes `mise run <name>`.
- No check changes what it accepts: `lint:emdash` keeps covering
  untracked files in a full run, as `git grep --untracked` does today.

## Constraints

- `bun run check` stays what the shared CI runs. The shared CI installs
  mise through `jdx/mise-action` before it.
- A fresh worktree made by worktrunk installs, links skills and installs
  hooks unaided. The reviewer's probe on mise 2026.11.4 found `mise run`
  and `mise install` trust the active `.config/mise/config.toml` by
  themselves, with or without a terminal; the plan repeats it in a real
  new worktree before relying on it. No step ever runs `mise trust`
  explicitly on a user's behalf.
- The skill stands alone once copied out: `tests/skills.test.mts` holds.
  Its description starts "Use when" and stays within 1024 characters.
- Documents follow `docs/AGENTS.md`: frontmatter, breadcrumb, lines of at
  most 80 characters. No em dashes anywhere (`lint:emdash`).
- Commits are granular, per `AGENTS.md`.

## Left to the builder

- The staged-files script's name and flags, within the behaviour above.
- Each task's exact `sources` globs and wording.
- The order of the moves, provided each commit leaves `bun run check`
  passing.
- How `SKILL.md` and `references/` divide the rules.

## Done looks like

- `bun run check` and `mise run check` pass, locally and in CI; a second
  `mise run check` with nothing changed skips the checking tasks.
- A commit touching one Markdown file runs `mise run check --staged`,
  which lints that file alone and runs the type check and tests in full;
  a later full `mise run check` still checks every file.
- `package.json` scripts are `prepare`, `skills` and `check` alone.
- `mise tasks` lists the standard set with descriptions and aliases.
- A new worktree made by `wt switch --create` installs, links skills and
  runs hooks unaided.
- `tests/skills.test.mts` passes for the new skill, and the staged-files
  script's tests pass.
