---
ctime: 2026-11-11
mtime: 2026-11-11
spdx: GPL-3.0-only
title: Standardised mise tasks, implementation plan
description: >-
  Task by task: a staged-files script, this repository's tasks moved to
  .config/mise in the standard set, hooks and worktrunk through mise run,
  then the configuring-mise-tasks skill bundling the script and a template.
tags:
  - skills
  - mise
  - plan
---

<!--
   -
   - ~chewygumxx/agent-library.git
   - ::: :/docs/plans/2026-11-11_mise-tasks.md
   -
   -->

# Standardised mise tasks implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move this repository's tasks into a standard mise task set with a
`--staged` switch, run its hooks through `mise run`, and ship the
`configuring-mise-tasks` skill that states the rules and bundles the
tested script and a starting task file.

**Architecture:** One POSIX script, `with-files.sh`, gives every
file-based task its file list, staged or tracked. TOML tasks in
`.config/mise/tasks.toml` call tools and scripts; parents forward
`--staged` through templated `depends`. `package.json` keeps only what Bun,
the package manager or the shared CI calls. The skill is written last, from
what the adoption proved.

**Tech Stack:** mise 2026.11.4 (`min_version = "2026.9.0"`), Bun 1.4
(`bun test`), POSIX `sh`, husky 9, worktrunk.

**Spec:** [the approved spec](../specs/2026-11-11_mise-tasks.md)

## Global Constraints

- Lifecycle scripts (`prepare`) never call `mise run`.
- Each action has one definition; nothing wraps in both directions.
- Tasks are TOML. A task's `run` is one line, or a short list of one-line
  commands; anything needing more is a script in `scripts/` (my call on
  "one line").
- Every task has a `description`; only `install`, `lint`, `format`,
  `test` and `check` have aliases: `i`, `l`, `f`, `t`, `c`.
- `lint`, `test`, `check` never write files.
- npm tools run as `bunx --bun --no-install <cli>`; mise-pinned tools by
  name.
- Tasks that cannot narrow to files (`lint:types`, `lint:deps`,
  `lint:package`, `test`) run in full under `--staged`.
- Exception: `act` and `act-cached` keep their form; hooks never call
  them.
- Every new file carries the house header (copy a sibling's); no em dash
  anywhere (write U+2014 as `\342\200\224` in shell, `"\u2014"` in TS).
- Docs lines at most 80 characters. Commits granular, Conventional,
  header within 50 characters, body lines within 72.
- `bun run check` passes after every commit.
- The skill names neither this repository nor its owner beyond the
  header breadcrumb its siblings carry; `tests/skills.test.mts` passes.

## Review Focus

1. File names with spaces, newlines or a leading `-`: every one reaches
   the tool intact (Task 1 test).
2. A staged deletion is not passed; a staged rename passes its new path
   (Task 1 test).
3. A commit where nothing matches a task's kind: the tool is not run and
   the task passes (Task 1 test).
4. A failing tool fails the hook and aborts the commit: exit status
   survives `with-files.sh` and `mise run` (Task 1 test, Task 4 step).
5. A second `--staged` commit after staging a file edited before the
   first never skips it, and a full `check` after a `--staged` one still
   checks everything (Task 3 and Task 4 steps).

---

### Task 1: `scripts/with-files.sh`

**Files:**

- Create: `scripts/with-files.sh` (mode 755)
- Test: `tests/with-files.test.mts`

**Interfaces:**

- Produces: `scripts/with-files.sh [--staged] [<pathspec>...] -- <cmd>
  [<arg>...]`. Without `--staged`: `git ls-files -z -- <pathspec>...`.
  With it: `git diff -z --cached --name-only --diff-filter=ACMR --
  <pathspec>...`. No pathspec means every file. Runs `<cmd> <arg>...
  <file>...` through `xargs -0 -r`; runs nothing and exits 0 when no file
  matches; otherwise exits with the command's status (xargs' 123/124/125
  mapped back to 1 is acceptable, nonzero is what matters). Missing `--`
  or `<cmd>`: usage on stderr, exit 2.

- [ ] **Step 1: Write the failing tests**

Each test makes a temporary git repository (`mkdtemp`, `git init`, user
name and email set locally) and runs the script there with
`Bun.spawnSync`, the command being `sh -c 'printf "%s\0" "$@"' sh`, so the
output is the NUL-separated file list. Tests, as `it(...)` names:

- `"passes every tracked file matching the pathspec"`: tracked `a.md`,
  `b.txt`, untracked `c.md`; `'*.md'` gives `["a.md"]`.
- `"passes every tracked file when given no pathspec"`.
- `"with --staged, passes staged additions and modifications only"`:
  committed `a.md`, `b.md`; modify both, stage `a.md`; gives `["a.md"]`.
- `"with --staged, skips deletions and passes a rename's new path"`:
  `git rm` one file, `git mv x.md y.md`; gives `["y.md"]`.
- `"passes names with spaces, newlines and a leading dash intact"`:
  files `"a b.md"`, `"new\nline.md"`, `"-dash.md"`.
- `"runs nothing and succeeds when no file matches"`: command
  `sh -c 'touch ran'`; exit 0, no `ran` file.
- `"fails when the command fails"`: command `false`; exit nonzero.
- `"refuses a call without -- or a command"`: exit 2, stderr nonempty.

- [ ] **Step 2: Run them to see them fail**

Run: `bun test tests/with-files.test.mts`
Expected: FAIL, the script does not exist.

- [ ] **Step 3: Write `scripts/with-files.sh`**

POSIX `sh`, `set -eu`; collect pathspecs until `--`; the leading-dash
case needs `--` passed to `git` (as above), not to the command.

- [ ] **Step 4: Run the tests and `shellcheck`, `shfmt -d` on the script**

Run: `bun test tests/with-files.test.mts && shfmt -d scripts/with-files.sh
&& shellcheck --rcfile
node_modules/@chewygumxx/shellcheck-config/config.shellcheckrc
scripts/with-files.sh`
Expected: all pass, no output from shfmt.

- [ ] **Step 5: Commit**

```bash
git add scripts/with-files.sh tests/with-files.test.mts
git commit -m "feat: Add with-files.sh for file-based tasks"
```

### Task 2: `scripts/lint-emdash.sh`

**Files:**

- Create: `scripts/lint-emdash.sh` (mode 755)
- Test: `tests/lint-emdash.test.mts`

**Interfaces:**

- Produces: `scripts/lint-emdash.sh [--staged]`. Without: today's
  `lint:emdash` (`git grep -nIP --untracked '\x{2014}'`, passing when
  grep finds none). With: today's pre-commit check, an em dash on an added
  line of `git diff --cached -U0` fails with today's message.

- [ ] **Step 1: Write the failing tests**: `"passes a tree without em
  dashes"`, `"fails on an em dash in an untracked file"`, `"with --staged,
  fails on an em dash in a staged added line"`, `"with --staged, passes
  an em dash only in an unstaged change"`. Build the character as
  `"\u2014"`.
- [ ] **Step 2: Run them to see them fail**: `bun test
  tests/lint-emdash.test.mts`, FAIL.
- [ ] **Step 3: Write the script**, taking both checks from
  `package.json`'s `lint:emdash` and `.husky/pre-commit`.
- [ ] **Step 4: Run tests, shfmt and shellcheck as in Task 1**: pass.
- [ ] **Step 5: Commit**: `feat: Add lint-emdash.sh with a staged mode`.

### Task 3: The task set in `.config/mise/`

**Files:**

- Move: `mise.toml` to `.config/mise/config.toml` (`git mv`), its tasks
  out to:
- Create: `.config/mise/tasks.toml`
- Create: `docs/reports/2026-11-11_mise-tasks.md` (probes and
  verification)

**Interfaces:**

- Consumes: `scripts/with-files.sh`, `scripts/lint-emdash.sh`.
- Produces: the tasks below, which Tasks 4 and 5 call by name.

`config.toml` keeps `min_version` and `[tools]`, and adds
`[task_config] includes = [".config/mise/tasks.toml"]` (the path is from
the repository root). `tasks.toml` holds these top-level tables, each
running what today's `package.json` script of its kind runs, unless named
here:

- `install`: `bun ci`
- `lint`: depends on every `lint:*` but `lint:commit`
- `lint:biome`: `biome ci`, files from `with-files.sh`
- `lint:md`: remark, then markdownlint-cli2, on `*.md`
- `lint:yaml`: prettier `--check`, then yamllint `--strict`, on `*.yaml` `*.yml`
- `lint:toml`: `tombi format --check`, then `tombi lint --error-on-warnings`
- `lint:sh`: `shfmt -d`, then shellcheck, on files `shfmt -f` names
- `lint:actions`: actionlint on `.github/workflows/*.y*ml`
- `lint:editorconfig`: editorconfig-checker on every file
- `lint:spell`: cspell on every file
- `lint:secrets`: secretlint on every file
- `lint:emdash`: `scripts/lint-emdash.sh`
- `lint:types`: `tsc` (full)
- `lint:deps`: `knip` (full)
- `lint:package`: `sort-package-json --check package.json` (full)
- `lint:commit`: `commitlint --edit "$usage_file"`, `usage = 'arg "<file>"'`
- `format`: depends on every `format:*`
- `format:biome`: `biome format --write`
- `format:yaml`: prettier `--write --log-level warn`
- `format:toml`: `tombi format`
- `format:sh`: `shfmt -w`
- `test`: `bun test`
- `check`: depends on `lint`, `test`
- `commit`: `cz`
- `skills`: `bun run skills`, passing its arguments
- `act`, `act-cached`: unchanged

- Every file-based task, and `lint`, `format`, `check`, declares
  `usage = 'flag "--staged"'`. File-based ones call
  `scripts/with-files.sh ${usage_staged:+--staged} <pathspec> -- <cmd>`
  (`$usage_staged` is set only when the flag is given; probed). Parents
  forward it:

  ```toml
  depends = ['lint {% if usage.staged %}--staged{% endif %}', 'test']
  ```

- Checking tasks declare `sources` (their files and their tools'
  configuration) and `outputs = { auto = true }`; file-based ones add
  git's index only under `--staged`, as the spec's "Skipping unchanged
  work" shows. Whether the `else` branch can be empty, not a repeated
  glob, is probed in Step 1.

- [ ] **Step 1: Probe and record**: in a `mktemp -d` repository, repeat
  the spec's probes (records per argument set; index source under
  `--staged` only; nested forwarding through `check`, `lint`, `lint:md`;
  an empty `else` branch; `$usage_file` set by an `arg`). Record each
  command and its output in the report, following `docs/AGENTS.md`'s
  report structure.
- [ ] **Step 2: Move and write**: `git mv mise.toml
  .config/mise/config.toml`, update its breadcrumb, write
  `tasks.toml` with the header. Leave `package.json` as it is.
- [ ] **Step 3: Verify the set**: `mise tasks` lists every task above
  with its description, and aliases on the five parents alone.
- [ ] **Step 4: Verify the run**: `mise run check` passes; a second
  `mise run check` skips every task with `sources`; `mise run lint
  --staged` with one `.md` file staged runs remark on that file alone.
  Record outputs in the report.
- [ ] **Step 5: Verify nothing else broke**: `bun run check` passes.
- [ ] **Step 6: Commit**, in two commits: `build: Move mise config to
  .config/mise` (the `git mv` and breadcrumb), then `build: Define the
  standard mise task set` (`tasks.toml`, report).

### Task 4: Hooks, worktrunk and `package.json` through mise

**Files:**

- Modify: `package.json` (`scripts`, `cspell.words` if needed)
- Modify: `.husky/pre-commit`, `.husky/commit-msg`
- Modify: `.config/wt.toml`
- Modify: `.knip.jsonc`
- Modify: every file `git grep -n 'bun run'` shows naming a removed
  script, at least `README.md`, `.config/mise/tasks.toml` comments,
  `.config/wt.toml`

**Interfaces:**

- Consumes: Task 3's task names.
- Produces: `package.json` scripts exactly `prepare` (unchanged),
  `skills` (unchanged) and `"check": "mise run check"`.

- [ ] **Step 1: Slim `package.json`** to the three scripts above.
- [ ] **Step 2: Hooks**: `.husky/pre-commit` body becomes
  `mise run check --staged`; `.husky/commit-msg` becomes
  `mise run lint:commit "$1"`. Headers stay.
- [ ] **Step 3: Worktrunk**: the `skills` pre-start step runs
  `mise run skills`; comments naming `mise.toml` name
  `.config/mise/config.toml`.
- [ ] **Step 4: knip**: run `mise run lint:deps`; add each dependency
  and binary it now reports as unused, because only mise tasks run it, to
  `ignoreDependencies` or `ignoreBinaries` under one label saying so.
- [ ] **Step 5: Mentions**: replace each `bun run <removed>` with
  `mise run <task>` (`typecheck` is `lint:types`, `lint` is
  `lint:biome` where Biome alone is meant). `README.md`'s Development
  section names `mise run check` and `mise run commit`.
- [ ] **Step 6: Verify `bun run check` and `mise run check` pass**.
- [ ] **Step 7: Verify the hook**

Each case in a throwaway commit, undone with `git reset --soft HEAD~1`
afterwards:

- stage one `.md` change: `git commit` runs `lint:md` on it alone,
  and `lint:types` and `test` in full;
- stage an em dash: the commit is refused;
- Review Focus 5: edit `x.md` and `y.md`, stage and commit `x.md`,
  then stage `y.md` (with a lint error) and commit: refused;
- a message `bad message`: refused by `lint:commit`.

Record outputs in the report.

- [ ] **Step 8: Commit**, granularly: `build: Run hooks through mise`,
  `build: Run worktrunk steps through mise`, `build: Keep only
  outside callers in package.json` (with knip and mentions).

### Task 5: A fresh worktree comes out whole

**Files:**

- Modify: `docs/reports/2026-11-11_mise-tasks.md`

- [ ] **Step 1: Make one**: `wt switch --create probe/mise-tasks
  --no-cd`, from this branch.
- [ ] **Step 2: Verify**: in it, without running `mise trust`:
  `node_modules` exists, `ls .claude/skills .agents/skills` matches this
  worktree, `mise run check` passes, and a throwaway commit runs the
  pre-commit hook. Should mise refuse an untrusted config, stop and report
  to the user; no step runs `mise trust` on their behalf.
- [ ] **Step 3: Remove it**: `wt remove probe/mise-tasks`, then delete
  the branch if `wt` left it.
- [ ] **Step 4: Commit the report**: `docs: Report fresh worktree probe`.

### Task 6: The `configuring-mise-tasks` skill

**Files:**

- Create: `skills/configuring-mise-tasks/SKILL.md`
- Create: `skills/configuring-mise-tasks/scripts/with-files.sh` (a copy
  of `scripts/with-files.sh`, breadcrumb line excepted)
- Create: `skills/configuring-mise-tasks/assets/tasks.toml`
- Create, if `SKILL.md` would otherwise carry detail most uses do not
  need: `skills/configuring-mise-tasks/references/*.md`
- Test: `tests/configuring-mise-tasks.test.mts`
- Modify: `README.md` skill table

**Interfaces:**

- Consumes: what Tasks 1 to 5 proved and recorded in the report.

- [ ] **Step 1: Write the failing tests**

- `"bundles with-files.sh as this repository uses it"`: the two copies
  are equal once the `::: :/` breadcrumb line is removed from each.
- `"its template defines the standard set"`: `Bun.TOML.parse` of
  `assets/tasks.toml` has `install`, `lint`, `format`, `test`, `check`,
  each with a `description`, aliases `i`, `l`, `f`, `t`, `c`, and no
  other task with an alias.
- `"its template forwards --staged from check to lint"`: `check` and
  `lint` declare the flag; `check.depends` contains the templated
  `lint` entry.
- `"its template holds no act"`.

- [ ] **Step 2: Run to see them fail**: `bun test
  tests/configuring-mise-tasks.test.mts`, FAIL.
- [ ] **Step 3: Copy the script and write the template**: the standard
  set wired as in Task 3, with one example `lint:<kind>` and
  `format:<kind>` each showing `with-files.sh`, `sources` and the index
  source; placeholder commands where a repository puts its tools. It
  passes `tombi lint`.
- [ ] **Step 4: Write `SKILL.md`**: frontmatter `name:
  configuring-mise-tasks`, `license: GPL-3.0-only`, a `description`
  starting "Use when" (adding, changing, reviewing or adopting a
  repository's mise tasks, or wiring hooks through them), within 1024
  characters. Body: every rule in the spec's "The rules the skill
  states", in the house voice of `skills/worktrees/SKILL.md`, speaking of
  "the project's runtime tool" with Bun as the example; how to adopt
  (copy the script to `scripts/`, the template to
  `.config/mise/tasks.toml`, add the include); the remote-task exception
  as a pattern naming no repository.
- [ ] **Step 5: Run `bun test` and `bun run check`**: all pass,
  including `tests/skills.test.mts` for the new skill.
- [ ] **Step 6: README**: add the row `configuring-mise-tasks` |
  `Writing and naming a repository's mise tasks alike`.
- [ ] **Step 7: Commit**, granularly: `test(skill): Pin mise task
  template and script`, `feat(skill): Add configuring-mise-tasks`,
  `docs: List configuring-mise-tasks`.

### Task 7: Final verification

- [ ] **Step 1**: `mise run check --force` and `bun run check` pass;
  `git grep -nP '\x{2014}'` finds nothing.
- [ ] **Step 2**: the spec's "Done looks like" list, item by item, each
  with its command and output in the report; commit it.
- [ ] **Step 3**: ask the user before pushing, so CI runs; optionally
  `mise run act` locally first.
