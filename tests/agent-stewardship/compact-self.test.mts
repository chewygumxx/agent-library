// vim:set expandtab shiftwidth=4 filetype=typescript:
// SPDX-License-Identifier: GPL-3.0-only

//
//
// ~chewygumxx/agent-library.git
// ::: :/tests/agent-stewardship/compact-self.test.mts
//
//

// compact-self.sh: typing /compact and its instructions into your own pane.

import { beforeEach, describe, expect, it } from "bun:test";
import { stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
    calls,
    compact,
    finish,
    lockFile,
    root,
    run,
    sandbox,
    send,
    setStatus,
    start,
    touch,
    until,
    writes,
} from "./harness.mts";

sandbox();

describe("compact-self.sh", () => {
    const pane = "w7:p3";
    const quick = { HERDR_PANE_ID: pane, AGENT_STEWARDSHIP_COMPACT_PAUSE: "0" };

    beforeEach(() => writeFile(join(root, `pane.${pane}`), pane));

    async function instructions(text: string) {
        const file = join(root, "instructions.md");
        await writeFile(file, text);
        return file;
    }

    it("compacts in a pane that has moved", async () => {
        await writeFile(join(root, "moved.w0:old"), pane);
        const { code } = await run(compact, [await instructions("go")], "", {
            ...quick,
            HERDR_PANE_ID: "w0:old",
        });
        expect(code).toBe(0);
        expect((await writes()).map((call) => call[1])).toEqual([
            pane,
            pane,
            pane,
        ]);
    });

    it("waits, rechecks, then writes /compact and the file, then Enter", async () => {
        const text = "Resume the plan at task 5.\nKeep `this`.\n";
        const file = await instructions(text);
        const { code } = await run(compact, [file], "", quick);
        expect(code).toBe(0);
        expect(await calls()).toEqual([
            ["herdr", "pane", "get", pane],
            ["herdr", "agent", "get", pane],
            [
                "herdr",
                "agent",
                "wait",
                pane,
                "--until",
                "idle",
                "--until",
                "done",
            ],
            ["herdr", "agent", "get", pane],
            ["herdr", "pane", "send-text", pane, "/compact "],
            ["herdr", "pane", "send-text", pane, text.trimEnd()],
            ["herdr", "pane", "send-keys", pane, "enter"],
        ]);
    });

    it("spaces instructions that begin with a dash", async () => {
        const file = await instructions("- Resume at task 5\n- Then task 6");
        const { code } = await run(compact, [file], "", quick);
        expect(code).toBe(0);
        expect((await writes())[1]).toEqual([
            "send-text",
            pane,
            " - Resume at task 5\n- Then task 6",
        ]);
    });

    it("compacts an agent whose turn is done but unseen", async () => {
        // herdr says done, not idle, of a finished turn in a pane no one
        // is looking at.
        await setStatus("done");
        const file = await instructions("go on");
        const { code } = await run(compact, [file], "", quick);
        expect(code).toBe(0);
        expect((await writes()).map((write) => write[0])).toEqual([
            "send-text",
            "send-text",
            "send-keys",
        ]);
    });

    it("sends nothing when the agent is no longer idle", async () => {
        await setStatus("working");
        const file = await instructions("go on");
        const { code } = await run(compact, [file], "", quick);
        expect(code).toBe(5);
        expect(await writes()).toEqual([]);
    });

    it("locks and writes the pane herdr reports after a move", async () => {
        await writeFile(join(root, `pane.${pane}`), "w1:p2");
        const file = await instructions("go on");
        const { code } = await run(compact, [file], "", quick);
        expect(code).toBe(0);
        expect(await calls()).toEqual([
            ["herdr", "pane", "get", pane],
            ["herdr", "agent", "get", pane],
            [
                "herdr",
                "agent",
                "wait",
                "w1:p2",
                "--until",
                "idle",
                "--until",
                "done",
            ],
            ["herdr", "agent", "get", "w1:p2"],
            ["herdr", "pane", "send-text", "w1:p2", "/compact "],
            ["herdr", "pane", "send-text", "w1:p2", "go on"],
            ["herdr", "pane", "send-keys", "w1:p2", "enter"],
        ]);
        expect((await stat(lockFile())).isFile()).toBe(true);
    });

    it("sends nothing when no agent is on the pane", async () => {
        await touch("absent");
        const file = await instructions("go on");
        const { code } = await run(compact, [file], "", quick);
        expect(code).toBe(4);
        expect(await writes()).toEqual([]);
    });

    it("names the partial state when the instructions fail", async () => {
        await touch("fail-instructions");
        const file = await instructions("go on");
        const { code, err } = await run(compact, [file], "", quick);
        expect(code).toBe(1);
        expect(err).toContain("/compact typed");
        expect(err).toContain("clear the input");
        // The failed write is logged as attempted, and no Enter follows.
        expect(await writes()).toEqual([
            ["send-text", pane, "/compact "],
            ["send-text", pane, "go on"],
        ]);
    });

    it("names the partial state when Enter fails", async () => {
        await touch("fail-keys");
        const file = await instructions("go on");
        const { code, err } = await run(compact, [file], "", quick);
        expect(code).toBe(1);
        expect(err).toContain("enter failed");
    });

    it("holds the pane's lock until its Enter is sent", async () => {
        const file = await instructions("go on");
        const compacting = start(compact, [file], "", {
            HERDR_PANE_ID: "w1:p2",
            AGENT_STEWARDSHIP_COMPACT_PAUSE: "1",
        });
        await until(async () => (await writes()).length > 0);
        const sending = start(send, ["--from", "a", "bob"], "ping");
        await Promise.all([finish(compacting), finish(sending)]);
        expect((await writes()).map((call) => call[2])).toEqual([
            "/compact ",
            "go on",
            "enter",
            "[from a] ping",
            "enter",
        ]);
    });

    it("says its usage outside herdr, touching nothing", async () => {
        const file = await instructions("go on");
        const { code, err } = await run(compact, [file]);
        expect(code).toBe(2);
        expect(err).toContain("usage");
        expect(await calls()).toEqual([]);
    });
});
