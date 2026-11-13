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
const assets = join(root, "skills", "fragmenting-tests", "assets");

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
