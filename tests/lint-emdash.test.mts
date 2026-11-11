// vim:set expandtab shiftwidth=4 filetype=typescript:
// SPDX-License-Identifier: GPL-3.0-only

//
//
// ~chewygumxx/agent-library.git
// ::: :/tests/lint-emdash.test.mts
//
//

// scripts/lint-emdash.sh, run in a throwaway git repository.

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const script = join(import.meta.dir, "..", "scripts", "lint-emdash.sh");
const emdash = "\u2014";

let repo: string;

// Without git's own variables, which a hook running these tests inherits
// and which would point git at the real repository.
const env = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_")),
);

const git = (...args: string[]) => {
    const run = Bun.spawnSync(["git", ...args], { cwd: repo, env });
    if (run.exitCode !== 0) throw new Error(run.stderr.toString());
};

const lint = (...args: string[]) =>
    Bun.spawnSync(["sh", script, ...args], { cwd: repo, env }).exitCode;

beforeEach(async () => {
    repo = await mkdtemp(join(tmpdir(), "lint-emdash-"));
    git("init", "-q");
    git("config", "user.name", "test");
    git("config", "user.email", "test@example.invalid");
    git("config", "commit.gpgsign", "false");
    await writeFile(join(repo, "a.md"), "plain - text\n");
    git("add", "a.md");
    git("commit", "-qm", "init");
});

afterEach(async () => {
    await rm(repo, { recursive: true, force: true });
});

describe("lint-emdash.sh", () => {
    it("passes a tree without em dashes", () => {
        expect(lint()).toBe(0);
    });

    it("fails on an em dash in an untracked file", async () => {
        await writeFile(join(repo, "new.md"), `a ${emdash} b\n`);
        expect(lint()).toBe(1);
    });

    it("with --staged, fails on an em dash in a staged added line", async () => {
        await writeFile(join(repo, "a.md"), `plain ${emdash} text\n`);
        git("add", "a.md");
        expect(lint("--staged")).toBe(1);
    });

    it("with --staged, passes an em dash only in an unstaged change", async () => {
        await writeFile(join(repo, "a.md"), `plain ${emdash} text\n`);
        expect(lint("--staged")).toBe(0);
    });
});
