// vim:set expandtab shiftwidth=4 filetype=typescript:
// SPDX-License-Identifier: GPL-3.0-only

//
//
// ~chewygumxx/agent-library.git
// ::: :/tests/configuring-mise-tasks.test.mts
//
//

// The configuring-mise-tasks skill's bundled files: its script stays the one
// this repository runs, and its template keeps the standard task set.

import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const skill = join(root, "skills", "configuring-mise-tasks");

type Task = {
    description?: string;
    alias?: string | string[];
    usage?: string;
    depends?: string[];
};

const template = () =>
    Bun.TOML.parse(
        readFileSync(join(skill, "assets", "tasks.toml"), "utf8"),
    ) as Record<string, Task>;

// A file without its breadcrumb, the one line that names its own path.
const body = (path: string) =>
    readFileSync(path, "utf8")
        .split("\n")
        .filter((line) => !line.startsWith("# ::: :/"))
        .join("\n");

describe("configuring-mise-tasks", () => {
    it("bundles with-files.sh as this repository uses it", () => {
        expect(body(join(skill, "scripts", "with-files.sh"))).toBe(
            body(join(root, "scripts", "with-files.sh")),
        );
    });

    it("its template defines the standard set", () => {
        const tasks = template();
        const standard = {
            install: "i",
            lint: "l",
            format: "f",
            test: "t",
            check: "c",
        };
        for (const [name, alias] of Object.entries(standard)) {
            expect([name, Boolean(tasks[name]?.description)]).toEqual([
                name,
                true,
            ]);
            expect([name, tasks[name]?.alias]).toEqual([name, alias]);
        }
        const aliased = Object.keys(tasks).filter((name) => tasks[name]?.alias);
        expect(aliased.sort()).toEqual(Object.keys(standard).sort());
    });

    it("its template forwards --staged from check to lint", () => {
        const tasks = template();
        expect(tasks.check?.usage).toContain('flag "--staged"');
        expect(tasks.lint?.usage).toContain('flag "--staged"');
        expect(tasks.check?.depends).toContain(
            "lint {% if usage.staged %}--staged{% endif %}",
        );
    });

    it("its template holds no act", () => {
        const names = Object.keys(template());
        expect(names.filter((name) => name.startsWith("act"))).toEqual([]);
    });
});
