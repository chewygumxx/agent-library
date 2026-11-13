// vim:set expandtab shiftwidth=4 filetype=typescript:
// SPDX-License-Identifier: GPL-3.0-only

//
//
// ~chewygumxx/agent-library.git
// ::: :/tests/agent-stewardship/at-limit.test.mts
//
//

// at-limit.sh: running a command again while it is at its usage limit.

import { describe, expect, it } from "bun:test";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { calls, logOnly, root, run, sandbox, scripts } from "./harness.mts";

sandbox();

describe("at-limit.sh", () => {
    const atLimit = join(scripts, "at-limit.sh");
    // Exits with each code of $STUB/codes in turn, then 0; logs each run.
    const sequence = (...codes: number[]) =>
        writeFile(join(root, "codes"), codes.map(String).join("\n"));
    const counted = [
        "sh",
        "-c",
        'echo "$*" >>"$STUB/runs"; n=$(wc -l <"$STUB/runs"); ' +
            'exit "$(sed -n "$n"p "$STUB/codes" | grep . || echo 0)"',
        "sh",
        "a b",
    ];
    const runs = async () =>
        (await readFile(join(root, "runs"), "utf8").catch(() => ""))
            .split("\n")
            .filter(Boolean);

    it("runs again after 75, and exits 0 when it then succeeds", async () => {
        await sequence(75, 0);
        const { code, err } = await run(atLimit, [
            "--wait",
            "0",
            "--",
            ...counted,
        ]);
        expect(code).toBe(0);
        expect(await runs()).toEqual(["a b", "a b"]);
        expect(err).toMatch(
            /^\d\d:\d\d limited; retrying in 0s \(1 of 40\)\n$/,
        );
    });

    it("stops after N tries with 75 if it never succeeds", async () => {
        await sequence(75, 75, 75, 75, 75, 75);
        const { code, err } = await run(atLimit, [
            "--wait",
            "0",
            "--tries",
            "3",
            "--",
            ...counted,
        ]);
        expect(code).toBe(75);
        expect((await runs()).length).toBe(4);
        expect(err.trim().split("\n")).toEqual([
            expect.stringMatching(/ limited; retrying in 0s \(1 of 3\)$/),
            expect.stringMatching(/ limited; retrying in 0s \(2 of 3\)$/),
            expect.stringMatching(/ limited; retrying in 0s \(3 of 3\)$/),
        ]);
    });

    it("does not retry any other failure", async () => {
        await sequence(1, 0);
        const { code, err } = await run(atLimit, [
            "--wait",
            "0",
            "--",
            ...counted,
        ]);
        expect([code, err]).toEqual([1, ""]);
        expect(await runs()).toHaveLength(1);
    });

    it("does not retry a success", async () => {
        const { code } = await run(atLimit, ["--wait", "0", "--", ...counted]);
        expect(code).toBe(0);
        expect(await runs()).toHaveLength(1);
    });

    it("runs --retry from the second try, as written", async () => {
        await sequence(75, 75, 0);
        const { code } = await run(atLimit, [
            "--wait",
            "0",
            "--retry",
            'echo "resume $HOME" >>"$STUB/retried"; exit 3',
            "--",
            ...counted,
        ]);
        // The first retry's 3 ends the loop; the command ran once only.
        expect(code).toBe(3);
        expect(await runs()).toHaveLength(1);
        expect(await readFile(join(root, "retried"), "utf8")).toBe(
            `resume ${root}\n`,
        );
    });

    it("retries --retry while it too exits 75", async () => {
        await sequence(75);
        const { code } = await run(atLimit, [
            "--wait",
            "0",
            "--retry",
            'echo r >>"$STUB/retried"; [ "$(wc -l <"$STUB/retried")" -ge 2 ]; ' +
                "exit $(($? == 0 ? 0 : 75))",
            "--",
            ...counted,
        ]);
        expect(code).toBe(0);
        expect(await runs()).toHaveLength(1);
        expect((await readFile(join(root, "retried"), "utf8")).length).toBe(4);
    });

    it("passes an option-like command through after --", async () => {
        const { code, out } = await run(atLimit, [
            "--",
            "printf",
            "%s",
            "--wait",
        ]);
        expect([code, out]).toEqual([0, "--wait"]);
    });

    it("sleeps the wait it was given", async () => {
        await sequence(75, 0);
        await logOnly("sleep");
        await run(atLimit, ["--wait", "7", "--", ...counted]);
        expect((await calls()).filter((call) => call[0] === "sleep")).toEqual([
            ["sleep", "7"],
        ]);
    });

    it("says its usage and runs nothing on a bad invocation", async () => {
        for (const args of [
            [],
            ["--wait", "0"],
            ["--wait", "soon", "--", "true"],
            ["--tries"],
            ["--bogus", "--", "true"],
            ["true"],
        ]) {
            const { err, code } = await run(atLimit, args);
            expect([args, code]).toEqual([args, 2]);
            expect(err).toMatch(/^usage: /);
        }
    });
});
