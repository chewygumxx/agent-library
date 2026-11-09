// vim:set expandtab shiftwidth=4 filetype=typescript:
// SPDX-License-Identifier: GPL-3.0-only

//
//
// ~chewygumxx/agent-library.git
// ::: :/tests/skills.test.mts
//
//

// What keeps a skill here installable anywhere: `skills add` copies its
// directory alone, so nothing in it may lean on this repository, or on the
// project a skill was imported from.

import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = join(import.meta.dir, "..", "skills");
const skills = readdirSync(root);
// The project these skills were imported from, and its users' accounts.
const imported = /dorothy|cgumxx|vtracey/i;

const files = (skill: string) =>
    readdirSync(join(root, skill), { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => join(entry.parentPath, entry.name));

const frontmatter = (skill: string) => {
    const text = readFileSync(join(root, skill, "SKILL.md"), "utf8");
    const yaml = text.match(/^---\n(.*?)\n---\n/s)?.[1] ?? "";
    return Bun.YAML.parse(yaml) as { name?: string; description?: string };
};

// The targets of a file's Markdown links, without fragments, that are
// paths rather than URLs or fragments alone.
const linkTargets = (file: string) =>
    [...readFileSync(file, "utf8").matchAll(/\]\(([^)\s]+)\)/g)]
        .map((match) => (match[1] ?? "").split("#")[0] ?? "")
        .filter((target) => target && !/^[a-z]+:/.test(target));

describe.each(skills)("%s", (skill) => {
    it("is named for its directory", () => {
        expect(frontmatter(skill).name).toBe(skill);
    });

    it("says when to use it within the specification's limit", () => {
        const description = frontmatter(skill).description ?? "";
        expect(description).toStartWith("Use when");
        expect(description.length).toBeLessThanOrEqual(1024);
    });

    it("links only to files inside itself", () => {
        const base = join(root, skill);
        for (const file of files(skill).filter((f) => f.endsWith(".md"))) {
            for (const target of linkTargets(file)) {
                const path = resolve(dirname(file), target);
                const where = `${relative(root, file)}: ${target}`;
                expect([where, path.startsWith(base)]).toEqual([where, true]);
                expect([where, existsSync(path)]).toEqual([where, true]);
            }
        }
    });

    it("names nothing of the project it came from", () => {
        for (const file of files(skill)) {
            const hits = readFileSync(file, "utf8").match(imported);
            expect([relative(root, file), hits]).toEqual([
                relative(root, file),
                null,
            ]);
        }
    });
});
