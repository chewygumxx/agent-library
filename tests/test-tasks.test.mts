// vim:set expandtab shiftwidth=4 filetype=typescript:
// SPDX-License-Identifier: GPL-3.0-only

//
//
// ~chewygumxx/agent-library.git
// ::: :/tests/test-tasks.test.mts
//
//

// What keeps the tests' mise tasks a true map, for `mise tasks` and the
// `mise://tasks` resource of `mise mcp`: every test file is run by one
// task, which tags with `covers:<path>` what that file runs. The tasks
// map the tests; `mise run test` still runs them all in one `bun test`.

import { describe, expect, it } from "bun:test";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");

type Task = {
    name: string;
    depends: string[];
    run: string[];
    tags: string[];
    sources: unknown;
    outputs: unknown;
};

// As mise reads them, includes and all: the project's own tasks.
const listed = Bun.spawnSync(["mise", "tasks", "ls", "--json", "--no-global"], {
    cwd: root,
});
const all = JSON.parse(listed.stdout.toString()) as Task[];
const tasks = all.filter((task) => task.name.startsWith("test:"));
const runners = tasks.filter((task) => task.run.length > 0);

const testFiles = [...new Bun.Glob("tests/**/*.test.mts").scanSync(root)];
const run = (file: string) => `bun test ./${file}`;
const covered = (task: Task) =>
    task.tags
        .filter((tag) => tag.startsWith("covers:"))
        .map((tag) => tag.slice("covers:".length));

// A test file past this is split into a directory of a file per part.
const maxBytes = 20 * 1024;

describe("the test files", () => {
    it("are each 20 KiB at most", () => {
        for (const file of testFiles) {
            const bytes = statSync(join(root, file)).size;
            expect([file, bytes <= maxBytes]).toEqual([file, true]);
        }
    });
});

describe("the test tasks", () => {
    it("are listed by mise", () => {
        expect(listed.exitCode).toBe(0);
        expect(runners.length).toBeGreaterThan(0);
    });

    it("run each test file in exactly one task", () => {
        for (const file of testFiles) {
            const by = runners.filter((task) => task.run.includes(run(file)));
            expect([file, by.length]).toEqual([file, 1]);
        }
    });

    it("run one test file each, and only that", () => {
        for (const task of runners) {
            const [only, ...rest] = task.run;
            const file = only?.replace(/^bun test \.\//, "") ?? "";
            expect([task.name, rest, testFiles]).toEqual([
                task.name,
                [],
                expect.arrayContaining([file]),
            ]);
        }
    });

    it("are tagged test, and cover paths that exist", () => {
        for (const task of runners) {
            expect([task.name, task.tags]).toEqual([
                task.name,
                expect.arrayContaining(["test"]),
            ]);
            expect([task.name, covered(task).length > 0]).toEqual([
                task.name,
                true,
            ]);
            for (const path of covered(task)) {
                expect([task.name, path, existsSync(join(root, path))]).toEqual(
                    [task.name, path, true],
                );
            }
        }
    });

    // The rule `test` keeps: a check that cannot be narrowed to the files
    // changed always runs. mise skips a task with sources, outputs or not.
    it("declare no sources or outputs, so never skip", () => {
        for (const task of tasks) {
            expect([task.name, task.sources, task.outputs]).toEqual([
                task.name,
                [],
                [],
            ]);
        }
    });

    // They map the tests, unlike a lint:<kind>, which its parent runs:
    // `test` runs every test itself, and through them would run each twice.
    it("are not run by `test`", () => {
        const test = all.find((task) => task.name === "test");
        expect(
            test?.depends.filter((name) => name.startsWith("test:")),
        ).toEqual([]);
    });
});
