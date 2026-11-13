// vim:set expandtab shiftwidth=4 filetype=typescript:
// SPDX-License-Identifier: GPL-3.0-only

//
//
// ~chewygumxx/agent-library.git
// ::: :/tests/agent-stewardship.test/with-claude.test.mts
//
//

// with-claude.sh: choosing a Claude account by its usage.

import { beforeEach, describe, expect, it } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { root, run, sandbox, scripts } from "./harness.mts";

sandbox();

describe("with-claude.sh", () => {
    const withClaude = join(scripts, "with-claude.sh");
    const printChoice = [
        "sh",
        "-c",
        'printf "%s %s" "$AGENT_STEWARDSHIP_CLAUDE_ACCOUNT" "$CLAUDE_CONFIG_DIR"',
    ];
    const primary = () => join(root, "accounts", "work");
    const reserve = () => join(root, "accounts", "spare");
    const accounts = () => ({
        AGENT_STEWARDSHIP_CLAUDE_PRIMARY: primary(),
        AGENT_STEWARDSHIP_CLAUDE_RESERVE: reserve(),
    });
    const usagePath = (account: string) =>
        join(root, "run", `claude-usage-${account}.json`);
    // Fresh by default; the `at` has no fractions, as statusline.sh's.
    const reading = (
        five: number,
        week: number,
        ageSeconds = 0,
        account = "work",
    ) =>
        writeFile(
            usagePath(account),
            JSON.stringify({
                at: new Date(Date.now() - ageSeconds * 1000)
                    .toISOString()
                    .replace(/\.\d+Z$/, "Z"),
                rate_limits: {
                    five_hour: { used_percentage: five, resets_at: 1 },
                    seven_day: { used_percentage: week, resets_at: 2 },
                },
                context_window: {},
            }),
        );
    const choose = (extra: Record<string, string> = accounts()) =>
        run(withClaude, printChoice, "", extra);

    beforeEach(async () => {
        await mkdir(primary(), { recursive: true });
        await mkdir(reserve(), { recursive: true });
    });

    it("picks the primary for a fresh, low reading", async () => {
        await reading(10, 20);
        const { out, err, code } = await choose();
        expect([out, code]).toEqual([`primary ${primary()}`, 0]);
        expect(err).toMatch(/^\d\d:\d\d claude account: primary\n$/);
    });

    it("picks the reserve at 90% of the five-hour window", async () => {
        await reading(90, 20);
        const { out, err } = await choose();
        expect(out).toBe(`reserve ${reserve()}`);
        expect(err).toMatch(/claude account: reserve\n$/);
    });

    it("picks the reserve at 80% of the week", async () => {
        await reading(10, 80);
        expect((await choose()).out).toBe(`reserve ${reserve()}`);
    });

    it("keeps the primary just under both limits", async () => {
        await reading(89.9, 79.9);
        expect((await choose()).out).toBe(`primary ${primary()}`);
    });

    it("keeps the primary for a stale, high reading", async () => {
        await reading(99, 99, 600);
        expect((await choose()).out).toBe(`primary ${primary()}`);
    });

    it("keeps the primary with no reading", async () => {
        const { out, err, code } = await choose();
        expect([out, code]).toEqual([`primary ${primary()}`, 0]);
        expect(err).toMatch(/claude account: primary\n$/);
    });

    const readings: [string, string][] = [
        ["malformed", "{not json"],
        ["empty", ""],
        ["without rate_limits", '{"at":"2099-01-01T00:00:00Z"}'],
        ["an array", "[1,2]"],
        [
            "without an at",
            '{"rate_limits":{"five_hour":{"used_percentage":99}}}',
        ],
    ];
    for (const [label, body] of readings) {
        it(`counts a ${label} reading as none`, async () => {
            await writeFile(usagePath("work"), body);
            const { out, err, code } = await choose();
            expect([out, code]).toEqual([`primary ${primary()}`, 0]);
            expect(err).not.toMatch(/jq|error/i);
        });
    }

    it("picks the reserve when the primary's directory is gone", async () => {
        await rm(primary(), { recursive: true });
        const { out, err } = await choose();
        expect(out).toBe(`reserve ${reserve()}`);
        expect(err).toMatch(/claude account: reserve\n$/);
    });

    it("stays on a spent primary with no reserve named", async () => {
        await reading(99, 99);
        const { out } = await choose({
            AGENT_STEWARDSHIP_CLAUDE_PRIMARY: primary(),
        });
        expect(out).toBe(`primary ${primary()}`);
    });

    it("takes the session's account as the primary by default", async () => {
        await reading(10, 20);
        const { out } = await choose({ CLAUDE_CONFIG_DIR: primary() });
        expect(out).toBe(`primary ${primary()}`);

        await reading(99, 99);
        const limited = await choose({
            CLAUDE_CONFIG_DIR: primary(),
            AGENT_STEWARDSHIP_CLAUDE_RESERVE: reserve(),
        });
        expect(limited.out).toBe(`reserve ${reserve()}`);
    });

    it("falls back on ~/.claude with nothing configured", async () => {
        const { out } = await choose({});
        expect(out).toBe(`primary ${join(root, ".claude")}`);
    });

    it("reads the usage of the primary, not of another account", async () => {
        await reading(99, 99, 0, "spare");
        expect((await choose()).out).toBe(`primary ${primary()}`);
    });

    it("runs its command with its arguments as written", async () => {
        const { out } = await run(withClaude, [
            "printf",
            "%s|",
            "two words",
            "$HOME",
            "--",
        ]);
        expect(out).toBe("two words|$HOME|--|");
    });

    it("says its usage and runs nothing without a command", async () => {
        const { err, code } = await run(withClaude, []);
        expect([code, err]).toEqual([2, expect.stringMatching(/^usage: /)]);
    });
});
