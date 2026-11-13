// vim:set expandtab shiftwidth=4 filetype=typescript:
// SPDX-License-Identifier: GPL-3.0-only

//
//
// ~chewygumxx/agent-library.git
// ::: :/tests/agent-stewardship.test/statusline.test.mts
//
//

// statusline.sh: drawing the status line and keeping the usage.

import { describe, expect, it } from "bun:test";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { root, run, sandbox, scripts } from "./harness.mts";

sandbox();

describe("statusline.sh", () => {
    const statusline = join(scripts, "statusline.sh");
    const input = JSON.stringify({
        model: { display_name: "Opus" },
        rate_limits: {
            five_hour: { used_percentage: 41.6, resets_at: 1 },
            seven_day: { used_percentage: 12, resets_at: 2 },
        },
        context_window: { used_percentage: 30, context_window_size: 200000 },
        session_id: "not kept",
    });
    const usage = (account: string) =>
        join(root, "run", `claude-usage-${account}.json`);

    it("keeps the limits and context under the account's name", async () => {
        const { out, code } = await run(statusline, [], input, {
            CLAUDE_CONFIG_DIR: join(root, "accounts", "work"),
        });
        expect([out, code]).toEqual(["Opus | 5h 42%\n", 0]);
        const kept = JSON.parse(await readFile(usage("work"), "utf8"));
        expect(Object.keys(kept).sort()).toEqual([
            "at",
            "context_window",
            "rate_limits",
        ]);
        expect(kept.at).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
        expect(kept.rate_limits.five_hour.used_percentage).toBe(41.6);
        expect((await stat(usage("work"))).mode & 0o777).toBe(0o600);
    });

    it("hands the input to the line named by the user", async () => {
        const { out } = await run(statusline, [], input, {
            AGENT_STEWARDSHIP_STATUSLINE:
                "jq -r .model.display_name; echo drawn",
        });
        expect(out).toBe("Opus\ndrawn\n");
    });

    it("writes nothing for an input with neither field", async () => {
        const { out, code } = await run(statusline, [], '{"model":{}}');
        expect([out, code]).toEqual(["Claude\n", 0]);
        expect(await readdir(join(root, "run"))).toEqual([]);
    });

    it("draws the line with no runtime directory", async () => {
        const { out, code } = await run(statusline, [], input, {
            XDG_RUNTIME_DIR: "",
        });
        expect([out, code]).toEqual(["Opus | 5h 42%\n", 0]);
    });
});
