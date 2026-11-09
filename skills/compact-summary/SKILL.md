---
name: compact-summary
description: >-
  Use when deciding whether to compact the conversation, when context is
  running out, or when writing the instructions for a /compact.
argument-hint: "[foreseeable work]"
---

<!--
   -
   - ~chewygumxx/agent-library.git
   - ::: :/skills/compact-summary/SKILL.md
   -
   -->

# Compact Summary

Assess compacting the conversation now, for the work you foresee being asked
to do next. Work stated on the next line overrides your own expectation;
when it is blank, or shows an unfilled placeholder, rely on yours.

Foreseeable work: $ARGUMENTS

Print exactly these four lines, in this order, and nothing else:

```text
/compact <instructions>
Justification: <one terse sentence>
Appraisal: <1-100>
Risk: <1-100>
```

Where your client's compaction command has another name, print that in
place of `/compact`.

## Instructions

The argument to `/compact` steers the summary that replaces the
conversation. Name what the foreseeable work needs carried through: open
tasks, decisions and their reasons, constraints the user has stated, and the
files and state in play. Write it first; both ratings judge it.

## Appraisal

The share of the current context that the foreseeable work no longer needs.
Rate the context, not how well the session went.

- 1-20: nearly all of it bears on the work ahead
- 21-40: some finished work, mostly still relevant
- 41-60: about half is spent: finished tasks, superseded drafts, exploratory
  reads
- 61-80: most is spent; the work ahead draws on a small part
- 81-100: the work ahead needs little beyond the instructions, as between
  unrelated tasks

## Risk

How likely the instructions are to let compaction lose what the foreseeable
work needs, weighted by how severe that loss would be. Severity turns on
recovery: what is on disk, in git or in memory can be read again; what
exists only in the conversation, such as the user's reasons, rejected
approaches or corrections, cannot.

- 1-20: everything needed is carried, or recoverable with a re-read
- 21-40: a minor loss is likely, recovered from files or git
- 41-60: a needed detail is likely lost, costing real rework
- 61-80: context that exists only in the conversation is likely lost
- 81-100: a loss would likely cause wrong or destructive action

Score each rating by its bands alone. Neither rating rewards the session;
above 80 the justification must say why.

<!-- vim:set expandtab shiftwidth=2 filetype=markdown foldlevel=3: -->
