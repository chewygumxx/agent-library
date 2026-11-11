// vim:set expandtab shiftwidth=4 filetype=typescript:
// SPDX-License-Identifier: GPL-3.0-only

//
//
// ~chewygumxx/agent-library.git
// ::: :/tests/with-files.test.mts
//
//

// scripts/with-files.sh, run in a throwaway git repository. The command it
// runs prints each file it was given ended by a NUL, so a name holding a
// newline survives the round trip.

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const script = join(import.meta.dir, "..", "scripts", "with-files.sh");
const print = ["sh", "-c", 'printf "%s\\0" "$@"', "sh"];

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

const files = async (contents: Record<string, string>) => {
    for (const [name, text] of Object.entries(contents)) {
        await writeFile(join(repo, name), text);
    }
};

const withFiles = (...args: string[]) => {
    const run = Bun.spawnSync(["sh", script, ...args], { cwd: repo, env });
    return {
        code: run.exitCode,
        files: run.stdout.toString().split("\0").slice(0, -1).sort(),
        stderr: run.stderr.toString(),
    };
};

beforeEach(async () => {
    repo = await mkdtemp(join(tmpdir(), "with-files-"));
    git("init", "-q");
    git("config", "user.name", "test");
    git("config", "user.email", "test@example.invalid");
    git("config", "commit.gpgsign", "false");
});

afterEach(async () => {
    await rm(repo, { recursive: true, force: true });
});

describe("with-files.sh", () => {
    it("passes every tracked file matching the pathspec", async () => {
        await files({ "a.md": "a", "b.txt": "b" });
        git("add", "a.md", "b.txt");
        await files({ "c.md": "c" });
        expect(withFiles("*.md", "--", ...print).files).toEqual(["a.md"]);
    });

    it("passes every tracked file when given no pathspec", async () => {
        await files({ "a.md": "a", "b.txt": "b" });
        git("add", "a.md", "b.txt");
        expect(withFiles("--", ...print).files).toEqual(["a.md", "b.txt"]);
    });

    it("with --staged, passes staged additions and modifications only", async () => {
        await files({ "a.md": "a", "b.md": "b" });
        git("add", ".");
        git("commit", "-qm", "init");
        await files({ "a.md": "a2", "b.md": "b2", "c.md": "c" });
        git("add", "a.md", "c.md");
        expect(withFiles("--staged", "*.md", "--", ...print).files).toEqual([
            "a.md",
            "c.md",
        ]);
    });

    it("with --staged, skips deletions and passes a rename's new path", async () => {
        await files({ "gone.md": "gone", "x.md": "x" });
        git("add", ".");
        git("commit", "-qm", "init");
        git("rm", "-q", "gone.md");
        git("mv", "x.md", "y.md");
        expect(withFiles("--staged", "--", ...print).files).toEqual(["y.md"]);
    });

    it("passes names with spaces, newlines and a leading dash intact", async () => {
        const names = ["a b.md", "new\nline.md", "-dash.md"];
        await files(Object.fromEntries(names.map((n) => [n, n])));
        git("add", "--", ...names);
        expect(withFiles("*.md", "--", ...print).files).toEqual(
            [...names].sort(),
        );
        expect(withFiles("--staged", "*.md", "--", ...print).files).toEqual(
            [...names].sort(),
        );
    });

    it("runs nothing and succeeds when no file matches", async () => {
        await files({ "a.txt": "a" });
        git("add", "a.txt");
        const run = withFiles("*.md", "--", "sh", "-c", "touch ran");
        expect(run.code).toBe(0);
        expect(existsSync(join(repo, "ran"))).toBe(false);
    });

    it("fails when the command fails", async () => {
        await files({ "a.md": "a" });
        git("add", "a.md");
        expect(withFiles("*.md", "--", "false").code).not.toBe(0);
    });

    it("refuses a call without -- or a command", () => {
        for (const args of [["*.md"], ["*.md", "--"], []]) {
            const run = withFiles(...args);
            expect([args, run.code]).toEqual([args, 2]);
            expect(run.stderr).not.toBe("");
        }
    });
});
