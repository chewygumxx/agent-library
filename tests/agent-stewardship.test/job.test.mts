// vim:set expandtab shiftwidth=4 filetype=typescript:
// SPDX-License-Identifier: GPL-3.0-only

//
//
// ~chewygumxx/agent-library.git
// ::: :/tests/agent-stewardship.test/job.test.mts
//
//

// job.sh: submitting a command as a transient user unit.

import { describe, expect, it } from "bun:test";
import { chmod, copyFile, mkdir, mkdtemp, realpath } from "node:fs/promises";
import { join } from "node:path";
import {
    calls,
    finish,
    job,
    root,
    run,
    sandbox,
    scripts,
    start,
    stopped,
    touch,
} from "./harness.mts";

sandbox();

describe("job.sh", () => {
    const spawnIn = (args: string[], cwd: string, extra = {}) =>
        start(job, args, "", extra, cwd);
    const submitted = async () =>
        (await calls()).find((call) => call[0] === "systemd-run") ?? [];
    const setenvs = (call: string[]) =>
        call
            .filter((arg) => arg.startsWith("--setenv="))
            .map((arg) => arg.slice("--setenv=".length))
            .sort();

    it("submits a user unit that logs, notifies and runs the command", async () => {
        const dir = await mkdtemp(join(root, "cwd-"));
        const command = ["printf", "two words", "$HOME", "--env", "--"];
        const child = spawnIn(
            ["eval-run", "--notify", "bob", "--", ...command],
            dir,
        );
        const { out, code } = await finish(child);
        expect(code).toBe(0);
        const call = await submitted();
        const unit = call.find((arg) => arg.startsWith("--unit=")) ?? "";
        expect(unit).toMatch(/^--unit=agent-stewardship-job-eval-run-\d+$/);
        const name = unit.slice("--unit=".length);
        const log = join(
            root,
            "state",
            "agent-stewardship",
            "jobs",
            `${name}.log`,
        );
        expect(call.slice(0, 3)).toEqual([
            "systemd-run",
            "--user",
            "--collect",
        ]);
        expect(call).toEqual(
            expect.arrayContaining([
                "--expand-environment=no",
                "-p",
                `StandardOutput=append:${log}`,
                `StandardError=append:${log}`,
                `ExecStopPost=${stopped} ${name} bob`,
            ]),
        );
        // Everything after the first "--" is the command, as written.
        expect(call.slice(call.indexOf("--") + 1)).toEqual(command);
        expect(out).toBe(`unit: ${name}\nlog: ${log}\n`);
    });

    it("passes no agent as a dash, and runs in the caller's directory", async () => {
        const dir = await mkdtemp(join(root, "cwd-"));
        const { code } = await finish(spawnIn(["x", "--", "true"], dir));
        expect(code).toBe(0);
        const call = await submitted();
        expect(call).toContain(`--working-directory=${await realpath(dir)}`);
        const post = call.find((arg) => arg.startsWith("ExecStopPost=")) ?? "";
        expect(post).toMatch(/ agent-stewardship-job-x-\d+ -$/);
    });

    it("sets by name only the allowlist that is set, and --env names", async () => {
        const dir = await mkdtemp(join(root, "cwd-"));
        const child = spawnIn(
            [
                "x",
                "--env",
                "FOO",
                "--env",
                "PATH",
                "--env",
                "UNSET_ONE",
                "--",
                "true",
            ],
            dir,
            {
                FOO: "foo-value-1",
                AGENT_STEWARDSHIP_CLAUDE_PRIMARY: "claude-9",
                AGENT_STEWARDSHIP_CLAUDE_RESERVE: "claude-8",
                AGENT_STEWARDSHIP_OTHER: "no",
                SECRET_TOKEN: "hunter2",
                HERDR_SOCKET_PATH: "/tmp/herdr.sock",
            },
        );
        const { code } = await finish(child);
        expect(code).toBe(0);
        const call = await submitted();
        expect(setenvs(call)).toEqual([
            "AGENT_STEWARDSHIP_CLAUDE_PRIMARY",
            "AGENT_STEWARDSHIP_CLAUDE_RESERVE",
            "FOO",
            "HERDR_SOCKET_PATH",
            "HOME",
            "PATH",
            "UNSET_ONE",
            "XDG_RUNTIME_DIR",
            "XDG_STATE_HOME",
        ]);
        const joined = call.join("\n");
        for (const value of [
            "foo-value-1",
            "claude-9",
            "hunter2",
            "herdr.sock",
        ]) {
            expect(joined).not.toContain(value);
        }
    });

    it("refuses a checkout path that systemd would split", async () => {
        const spaced = join(root, "a b");
        await mkdir(spaced);
        for (const file of ["job.sh", "job-stopped.sh", "pane-lock.sh"]) {
            await copyFile(join(scripts, file), join(spaced, file));
            await chmod(join(spaced, file), 0o755);
        }
        const { code, err } = await run(join(spaced, "job.sh"), [
            "x",
            "--",
            "true",
        ]);
        expect(code).toBe(1);
        expect(err).toContain("systemd would read");
        expect(await calls()).toEqual([]);
    });

    it("says its usage for a bad name, env name, agent or no command", async () => {
        for (const args of [
            [],
            ["x"],
            ["x", "--"],
            ["bad name", "--", "true"],
            ["-x", "--", "true"],
            ["x", "--env", "A=b", "--", "true"],
            ["x", "--env", "1A", "--", "true"],
            ["x", "--notify", "a b", "--", "true"],
            ["x", "--notify", "-", "--", "true"],
            ["x", "--bogus", "--", "true"],
            ["x", "true"],
        ]) {
            const { code, err } = await run(job, args);
            expect([args, code]).toEqual([args, 2]);
            expect(err).toContain("usage");
        }
        expect(await calls()).toEqual([]);
    });

    it("prints nothing of its own directory when CDPATH is set", async () => {
        const { out, code } = await run(job, ["x", "--", "true"], "", {
            CDPATH: scripts,
        });
        expect(code).toBe(0);
        expect(out.split("\n")).toHaveLength(3);
        expect(out).toMatch(/^unit: agent-stewardship-job-x-\d+\nlog: /);
    });

    it("fails, printing no unit, when systemd-run refuses", async () => {
        await touch("fail-run");
        const { out, code } = await run(job, ["x", "--", "true"]);
        expect(code).toBe(1);
        expect(out).toBe("");
    });
});
