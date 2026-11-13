// vim:set expandtab shiftwidth=4 filetype=typescript:
// SPDX-License-Identifier: GPL-3.0-only

//
//
// ~chewygumxx/agent-library.git
// ::: :/tests/fragmenting-tests.test.mts
//
//

// The fragmenting-tests skill's bundled files: its guard stays the one this
// repository runs, and its task template keeps the map's rules.

import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const skills = join(root, "skills");
const assets = join(skills, "fragmenting-tests", "assets");
const skill = (name: string) =>
    readFileSync(join(skills, name, "SKILL.md"), "utf8");

// The sentence both skills hold, so neither lets `test` run the map.
const notSubTasks = "`test` never depends on a `test:<subject>`";

type Task = {
    depends?: string[];
    tags?: string[];
    run?: string;
    sources?: unknown;
    outputs?: unknown;
};

// A file without its breadcrumb, the one line that names its own path.
const body = (path: string) =>
    readFileSync(path, "utf8")
        .split("\n")
        .filter((line) => !/^(\/\/|#) ::: :\//.test(line))
        .join("\n");

describe("fragmenting-tests", () => {
    it("bundles the guard as this repository runs it", () => {
        expect(body(join(assets, "test-tasks.mts"))).toBe(
            body(join(root, "tests", "test-tasks.test.mts")),
        );
    });

    it("bundles no file that Bun would run as a test", () => {
        const marked = [...new Bun.Glob("**/*").scanSync(assets)].filter(
            (file) => /[._](test|spec)[._]/.test(file),
        );
        expect(marked).toEqual([]);
    });

    it("its template's header says only how it is copied, as configuring-mise-tasks' do", () => {
        // The header's prose: before the first task, after the lines every
        // file opens with.
        const header = readFileSync(join(assets, "tasks.toml"), "utf8").split(
            "\n[",
        )[0];
        const prose = (header ?? "")
            .split("\n")
            .filter((line) => /^# /.test(line))
            .filter(
                (line) => !/vim:|SPDX-License-Identifier|::: :\/|~/.test(line),
            )
            .map((line) => line.slice(2))
            .join(" ");
        expect(prose).toBe(
            "Copied to tests/<subject>/tasks.toml, its own path above " +
                "changed to match. Replace each <...>.",
        );
    });

    it("includes the map beside configuring-mise-tasks' task files", () => {
        const theirs = skill("configuring-mise-tasks").match(
            /includes = \[("[^"]+")\]/,
        )?.[1];
        expect(theirs).toBe('".config/mise/tasks/*.task.toml"');
        expect(skill("fragmenting-tests")).toContain(
            `includes = [${theirs}, "tests/tasks.toml", "tests/*/tasks.toml"]`,
        );
    });

    it("and configuring-mise-tasks both keep `test` from running the map", () => {
        for (const name of ["fragmenting-tests", "configuring-mise-tasks"]) {
            expect([name, skill(name).includes(notSubTasks)]).toEqual([
                name,
                true,
            ]);
        }
    });

    it("its template maps a directory as the guard requires", () => {
        const tasks = Bun.TOML.parse(
            readFileSync(join(assets, "tasks.toml"), "utf8"),
        ) as Record<string, Task>;
        expect(tasks["test:<subject>"]?.depends).toEqual(["test:<subject>:*"]);
        const part = tasks["test:<subject>:<part>"];
        expect(part?.run).toMatch(/^bun test \.\/tests\/<subject>\//);
        expect(part?.tags).toContain("test");
        expect(part?.tags?.some((tag) => tag.startsWith("covers:"))).toBe(true);
        for (const task of Object.values(tasks)) {
            expect([task.sources, task.outputs]).toEqual([
                undefined,
                undefined,
            ]);
        }
    });
});
