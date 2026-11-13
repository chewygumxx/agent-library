<!--
   -
   - ~chewygumxx/agent-library.git
   - ::: :/skills/fragmenting-tests/references/bun.md
   -
   -->

# Tests under Bun

What the skill leaves to the runner, as Bun 1.4 does it. For another
runner, learn each of these before splitting or mapping.

- **Finding tests.** Bun runs a file whose own name holds `.test.`,
  `_test`, `.spec.` or `_spec`, and ignores a directory's name. To learn
  another runner's rule, put a marked and an unmarked file in a scratch
  directory under `tests/`, then count the files it ran.
- **One file by path.** `bun test ./<path>` runs that file. Without the
  leading `./`, the argument is a filter, which runs every file whose
  path holds it.
- **Shared modules load once.** Bun loads a module once for every test
  file, so a harness's hooks registered on load reach only the first
  file: export a `sandbox()` that registers them. State the tests read,
  such as a temporary root, is an exported `let`, a live binding the
  setup assigns.
- **Importing `.mts`.** A test imports `./harness.mts` by its own name
  with `allowImportingTsExtensions` in `tsconfig.json`, beside `noEmit`.
- **knip.** Bun finds tests by name, which knip does not follow: its
  `entry` lists `tests/**/*.test.mts`.
- **The guard** is written for Bun and `tests/**/*.test.mts`.

<!-- vim:set expandtab shiftwidth=2 filetype=markdown foldlevel=3: -->
