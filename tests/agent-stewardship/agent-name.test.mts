// vim:set expandtab shiftwidth=4 filetype=typescript:
// SPDX-License-Identifier: GPL-3.0-only

//
//
// ~chewygumxx/agent-library.git
// ::: :/tests/agent-stewardship/agent-name.test.mts
//
//

// agent-name.sh: your own agent's name.

import { describe, expect, it } from "bun:test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { root, run, sandbox, scripts, touch } from "./harness.mts";

sandbox();

describe("agent-name.sh", () => {
    const name = join(scripts, "agent-name.sh");

    it("prints the agent's name", async () => {
        await writeFile(join(root, "name.w9:p9"), "carol");
        const { out, code } = await run(name, [], "", {
            HERDR_PANE_ID: "w9:p9",
        });
        expect([out, code]).toEqual(["carol\n", 0]);
    });

    it("follows a pane that has moved", async () => {
        await writeFile(join(root, "moved.w0:old"), "w9:p9");
        await writeFile(join(root, "name.w9:p9"), "carol");
        const { out, code } = await run(name, [], "", {
            HERDR_PANE_ID: "w0:old",
        });
        expect([out, code]).toEqual(["carol\n", 0]);
    });

    it("exits 4 with no agent on the pane", async () => {
        await touch("absent");
        const { out, code } = await run(name, [], "", {
            HERDR_PANE_ID: "w9:p9",
        });
        expect([out, code]).toEqual(["", 4]);
    });

    it("says its usage outside herdr", async () => {
        const { err, code } = await run(name, []);
        expect([code, err]).toEqual([2, expect.stringMatching(/^usage: /)]);
    });
});
