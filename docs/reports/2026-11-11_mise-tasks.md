---
ctime: 2026-11-11
mtime: 2026-11-11
spdx: GPL-3.0-only
title: Standardised mise tasks, report
description: >-
  Probes of mise's skipping, flag forwarding and trust, the rulings made on
  the spec while implementing it, and the verification of each step.
tags:
  - mise
  - report
---

<!--
   -
   - ~chewygumxx/agent-library.git
   - ::: :/docs/reports/2026-11-11_mise-tasks.md
   -
   -->

# Standardised mise tasks, report

Implements [the spec](../specs/2026-11-11_mise-tasks.md) by
[the plan](../plans/2026-11-11_mise-tasks.md). All probes ran on mise
2026.11.4.

## Probes

### Skipping, forwarding and arguments

A scratch repository held `check`, `lint` and `lint:md` as the plan
wires them: `lint:md` takes `--staged`, its `sources` are `*.md` plus,
under `--staged` alone, git's index (an empty `else` branch), and parents
forward the flag by a templated `depends`. `lint:commit` takes
`arg "<file>"` and echoes `$usage_file`. Each line is one `mise run`,
then what ran:

```text
check (full, first)                              RAN lint:md []
check (full, again: expect skip)
check --staged (first: expect run)               RAN lint:md [--staged]
check --staged (again: expect skip)
after git add a.md, check --staged (expect run)  RAN lint:md [--staged]
staged b.md, check --staged (expect run)         RAN lint:md [--staged]
check (full, after staged runs: expect skip)
edit a.md, check (full: expect run)              RAN lint:md []
lint:commit 'msg file' (expect path)             RAN lint:commit [msg file]
```

So: records are kept per argument set; a staged file always reruns a
`--staged` run; the flag reaches `lint:md` through two parents; the
`else` branch may be empty; `$usage_file` keeps a space.

A `[vars]` entry, `index`, used as `{{ vars.index }}` in `sources`, and a
negated `!node_modules/**` source, behaved the same. Extra arguments to a
task without `usage` reach its command: `mise run skills --no-remote`
runs `bun run skills --no-remote`.

### Trust

With `HOME` pointed at an empty directory, so that no trust is recorded,
a mise shim (`jq`) run inside a scratch repository refused its config
("not trusted") whenever the config held any of: `[task_config]
includes`, a `[vars]` entry, or any `{{ }}` or `{% %}` template in a task.
A plain task in `config.toml` or in `conf.d/`, or a file task, did not.

`mise run` in that state ran the task, recorded the trust and the shim
then worked:

```text
jq before:   not trusted
mise run:    x hello
jq after:    ok
mise trust --show: /tmp/mise-trust-probe.XXXXXX/repo: trusted
```

So a new checkout is trusted by its first `mise run`, as the review
reported. The tests of `agent-stewardship` give their scripts an empty
`HOME`, where the user's trust is not found, and on a machine where `jq`
is a mise shim the scripts failed; see the ruling below.

## Rulings

- The tests of `agent-stewardship` set `MISE_TRUSTED_CONFIG_PATHS` to the
  repository root in their scripts' environment. The trust the user
  already gave is under the real `HOME`, which those tests replace. No
  trust is recorded anywhere.
- Every file written under the repository, ignored or not, reruns the
  tasks whose `sources` are `**/*`; mise does not read `.gitignore`.
- `act` keeps its three aliases, under the spec's exception for it.
- `lint:editorconfig` is given the tracked files, where the script ran
  the checker over the directory; an untracked file is no longer checked.
- A whole-project task under `--staged` still skips when none of its
  sources changed since it last passed; when it runs, it checks
  everything.

## Verification

### Task 3: the task set

`mise tasks` lists 26 tasks, each with a description; aliases are on
`install`, `lint`, `format`, `test`, `check` (`i`, `l`, `f`, `t`, `c`)
and on `act` alone.

`mise run check` passed in 15.5 seconds. Run again at once, with its log
kept outside the repository, all 14 tasks with `sources` reported
`sources up-to-date, skipping`.

With one new Markdown file staged:

```text
$ scripts/with-files.sh --staged '*.md' -- echo
probe-staged.md
$ mise run lint --staged
rc=0
```

`bun run check`, still the old chain, passed.

### Task 4: hooks, worktrunk and `package.json`

`package.json` holds `check`, `prepare` and `skills` alone. knip then
reported `@biomejs/biome` and `sort-package-json` unused and `mise`
unlisted, as only mise tasks run them; `.knip.jsonc` ignores them.
`bun run check` and `mise run check` both passed.

The hooks, each tried with a throwaway commit then undone:

| Staged                                          | Outcome                     |
| ----------------------------------------------- | --------------------------- |
| One clean Markdown file                         | Committed; `lint:md` ran    |
| A line with an em dash                          | Refused by `lint:emdash`    |
| `probe-y.md`, edited before `probe-x.md` passed | Refused, MD018 on `probe-y` |
| Nothing, message `bad message`                  | Refused by `lint:commit`    |

In the first, `lint:types` and `test` reported `sources up-to-date,
skipping`, as nothing they read had changed.
