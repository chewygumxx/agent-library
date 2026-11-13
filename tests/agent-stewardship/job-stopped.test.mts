// vim:set expandtab shiftwidth=4 filetype=typescript:
// SPDX-License-Identifier: GPL-3.0-only

//
//
// ~chewygumxx/agent-library.git
// ::: :/tests/agent-stewardship/job-stopped.test.mts
//
//

// job-stopped.sh: recording a stopped job and telling its agent.

import { describe, expect, it } from "bun:test";
import { chmod, copyFile, mkdir, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
    calls,
    root,
    run,
    sandbox,
    scripts,
    sendsDir,
    standIn,
    stopped,
    touch,
} from "./harness.mts";

sandbox();

describe("job-stopped.sh", () => {
    const unit = "agent-stewardship-job-eval-run-1761900000000000000";
    const jobs = () => join(root, "state", "agent-stewardship", "jobs");
    const result = () => readFile(join(jobs(), `${unit}.result`), "utf8");
    const at = "at=\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\dZ\n$";

    // The helper beside a send-prompt.sh that logs, and fails on demand.
    async function stubSend() {
        const dir = join(root, "stubbed");
        await mkdir(dir);
        for (const file of ["job-stopped.sh", "pane-lock.sh"]) {
            await copyFile(join(scripts, file), join(dir, file));
        }
        await copyFile(standIn("send-prompt.sh"), join(dir, "send-prompt.sh"));
        for (const file of ["job-stopped.sh", "send-prompt.sh"]) {
            await chmod(join(dir, file), 0o755);
        }
        return join(dir, "job-stopped.sh");
    }

    it("records an exit, then tells the agent through a timed send", async () => {
        const helper = await stubSend();
        const { code } = await run(helper, [unit, "bob"], "", {
            SERVICE_RESULT: "exit-code",
            EXIT_CODE: "exited",
            EXIT_STATUS: "1",
        });
        expect(code).toBe(0);
        expect(await result()).toMatch(
            new RegExp(
                `^result=exit-code\nexit_code=exited\nexit_status=1\n${at}`,
            ),
        );
        expect(await calls()).toEqual([
            ["send-prompt.sh", "--from", "job:eval-run", "--in", "1s", "bob"],
        ]);
        expect(await readFile(join(root, "send.stdin"), "utf8")).toBe(
            `job ${unit} stopped: exit-code (exited 1); log ${join(jobs(), `${unit}.log`)}\n`,
        );
    });

    it("records a signal", async () => {
        const helper = await stubSend();
        await run(helper, [unit, "bob"], "", {
            SERVICE_RESULT: "signal",
            EXIT_CODE: "killed",
            EXIT_STATUS: "9",
        });
        expect(await result()).toMatch(
            new RegExp(
                `^result=signal\nexit_code=killed\nexit_status=9\n${at}`,
            ),
        );
        expect(await readFile(join(root, "send.stdin"), "utf8")).toContain(
            "stopped: signal (killed 9); log",
        );
    });

    it("records a failed start, which has no exit code or status", async () => {
        const helper = await stubSend();
        await run(helper, [unit, "bob"], "", { SERVICE_RESULT: "resources" });
        expect(await result()).toMatch(
            new RegExp(`^result=resources\nexit_code=\nexit_status=\n${at}`),
        );
        expect(await readFile(join(root, "send.stdin"), "utf8")).toBe(
            `job ${unit} stopped: resources; log ${join(jobs(), `${unit}.log`)}\n`,
        );
    });

    it("keeps the result and exits 0 when the send fails", async () => {
        const helper = await stubSend();
        await touch("fail-send");
        const { code } = await run(helper, [unit, "bob"], "", {
            SERVICE_RESULT: "exit-code",
            EXIT_CODE: "exited",
            EXIT_STATUS: "1",
        });
        expect(code).toBe(0);
        expect(await result()).toMatch(/^result=exit-code\nexit_code=exited\n/);
        expect(
            await readFile(join(jobs(), `${unit}.notify.log`), "utf8"),
        ).toMatch(
            /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ send to bob failed \(3\): send-prompt.sh: boom second line\n$/,
        );
    });

    it("tells no one for a dash, and still records the result", async () => {
        const helper = await stubSend();
        const { code } = await run(helper, [unit, "-"], "", {
            SERVICE_RESULT: "success",
            EXIT_CODE: "exited",
            EXIT_STATUS: "0",
        });
        expect(code).toBe(0);
        expect(await result()).toContain("result=success\n");
        expect(await calls()).toEqual([]);
        expect(await readdir(jobs())).toEqual([`${unit}.result`]);
    });

    it("sends through the real send-prompt.sh as a retried timer", async () => {
        const { code } = await run(stopped, [unit, "bob"], "", {
            SERVICE_RESULT: "success",
            EXIT_CODE: "exited",
            EXIT_STATUS: "0",
        });
        expect(code).toBe(0);
        const [call] = await calls();
        expect(call).toContain("--on-active=1s");
        const id = (call?.find((arg) => arg.startsWith("--unit=")) ?? "").slice(
            "--unit=agent-stewardship-send-".length,
        );
        expect(await readFile(join(sendsDir(), `${id}.msg`), "utf8")).toBe(
            `[from job:eval-run, scheduled] job ${unit} stopped: success (exited 0); log ${join(jobs(), `${unit}.log`)}`,
        );
    });

    it("says its usage for a unit or agent it cannot use", async () => {
        for (const args of [
            [],
            [unit],
            ["../x-1", "-"],
            ["other-1", "-"],
            [unit, "a b"],
        ]) {
            const { code } = await run(stopped, args);
            expect([args, code]).toEqual([args, 2]);
        }
        expect(await readdir(root)).not.toContain("state");
    });
});
