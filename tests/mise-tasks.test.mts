// vim:set expandtab shiftwidth=4 filetype=typescript:
// SPDX-License-Identifier: GPL-3.0-only

//
//
// ~chewygumxx/agent-library.git
// ::: :/tests/mise-tasks.test.mts
//
//

// What keeps a task's skip honest, in this repository's tasks and in the
// skill's template: a staged run watches git's index by an absolute path,
// and a check watches the lockfile and tool pins that govern it.

import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");

type Task = { usage?: string; sources?: string[] };

const files = {
    "this repository": join(root, ".config", "mise", "tasks.toml"),
    "the template": join(
        root,
        "skills",
        "configuring-mise-tasks",
        "assets",
        "tasks.toml",
    ),
};

const tasks = (path: string) =>
    Object.entries(
        Bun.TOML.parse(readFileSync(path, "utf8")) as Record<string, Task>,
    );

// git prints the index's path relative to where mise runs the template,
// `.config/mise/`, unless asked for an absolute one.
const absoluteIndex =
    '{% if usage.staged %}{{ exec(command="git rev-parse --path-format=absolute --git-path index") }}{% endif %}';

describe.each(Object.entries(files))("%s", (_, path) => {
    it("watches git's index by an absolute path in every staged run", () => {
        for (const [name, task] of tasks(path)) {
            if (!task.usage?.includes("--staged") || !task.sources) continue;
            expect([name, task.sources]).toEqual([
                name,
                expect.arrayContaining([absoluteIndex]),
            ]);
        }
    });

    it("never reads the index through a config-wide variable", () => {
        expect(readFileSync(path, "utf8")).not.toContain("vars.index");
    });

    it("never skips a check that reads the whole project", () => {
        const whole = Object.fromEntries(tasks(path));
        for (const name of ["lint:types", "lint:deps", "test"]) {
            if (!whole[name]) continue;
            expect([name, whole[name].sources]).toEqual([name, undefined]);
        }
    });

    it("watches the lockfile and tool pins in every check", () => {
        for (const [name, task] of tasks(path)) {
            if (!task.sources) continue;
            const sources = task.sources.join(" ");
            const watched =
                task.sources.includes("**/*") ||
                (/lock/.test(sources) &&
                    sources.includes(".config/mise/config.toml"));
            expect([name, watched]).toEqual([name, true]);
        }
    });
});

it("the skill recommends no config-wide index variable", () => {
    const skill = join(root, "skills", "configuring-mise-tasks", "SKILL.md");
    const text = readFileSync(skill, "utf8");
    expect(text).not.toContain("vars.index");
    expect(text).toContain("--path-format=absolute --git-path index");
});
