<!--
   -
   - ~chewygumxx/agent-library.git
   - ::: :/skills/configuring-mise-tasks/references/remote-tasks.md
   -
   -->

# Remote tasks

The one exception to TOML-only tasks: `act`, and any CI task that depends on
a remote script referenced by a tag and fetched uncached. Such a task is
a hidden remote file task, run by a visible wrapper that fetches it
afresh each time, both in `other.task.toml`:

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

<!-- vim:set expandtab shiftwidth=2 filetype=markdown foldlevel=3: -->
