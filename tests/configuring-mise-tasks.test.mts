// vim:set expandtab shiftwidth=4 filetype=typescript:
// SPDX-License-Identifier: GPL-3.0-only

//
//
// ~chewygumxx/agent-library.git
// ::: :/tests/configuring-mise-tasks.test.mts
//
//

// The configuring-mise-tasks skill's bundled files: its script stays the one
// this repository runs, and its template keeps the standard task set, one
// file per task family.

import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const skill = join(root, "skills", "configuring-mise-tasks");

type Task = {
    description?: string;
    alias?: string | string[];
    usage?: string;
    depends?: string[];
};

const templates = join(skill, "assets", "tasks");

const parse = (file: string) =>
    Bun.TOML.parse(readFileSync(join(templates, file), "utf8")) as Record<
        string,
        Task
    >;

// Every template file's tasks, as mise merges them through the include.
const template = () =>
    Object.assign(
        {},
        ...readdirSync(templates)
            .sort()
            .map((file) => parse(file)),
    ) as Record<string, Task>;

// The tasks each family's file may hold.
const families: Record<string, (name: string) => boolean> = {
    "standard.task.toml": (name) => ["install", "test", "check"].includes(name),
    "lint.task.toml": (name) => name === "lint" || name.startsWith("lint:"),
    "format.task.toml": (name) =>
        name === "format" || name.startsWith("format:"),
};

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

    it("its template is one file per family", () => {
        expect(readdirSync(templates).sort()).toEqual(
            Object.keys(families).sort(),
        );
        for (const [file, holds] of Object.entries(families)) {
            for (const name of Object.keys(parse(file))) {
                expect([file, name, holds(name)]).toEqual([file, name, true]);
            }
        }
    });

    it("its template files each name their own path", () => {
        for (const file of readdirSync(templates)) {
            const path = `skills/configuring-mise-tasks/assets/tasks/${file}`;
            const text = readFileSync(join(templates, file), "utf8");
            expect(text).toContain(`# ::: :/${path}\n`);
            expect(text).toContain(`.config/mise/tasks/${file}`);
        }
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
