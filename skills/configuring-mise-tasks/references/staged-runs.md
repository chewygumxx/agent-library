<!--
   -
   - ~chewygumxx/agent-library.git
   - ::: :/skills/configuring-mise-tasks/references/staged-runs.md
   -
   -->

# Staged runs

Why a `--staged` run watches git's index as the skill's snippet does.

- **The index is a source.** mise compares a run against the last one
  with the same arguments. A second `--staged` run would otherwise skip
  a file staged since the first but last edited before it. The index
  changes whenever anything is staged, so the run sees it.
- **By an absolute path.** mise runs the template from `.config/mise/`,
  where the relative path git prints points outside the repository, and
  mise drops a source outside it without a word.
- **Inside the task, for `--staged` alone.** Asking git fails outside a
  repository, so the template asks only when the flag is given, and a
  full run does not rerun on every `git add`.

<!-- vim:set expandtab shiftwidth=2 filetype=markdown foldlevel=3: -->
