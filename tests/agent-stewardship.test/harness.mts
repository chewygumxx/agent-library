// vim:set expandtab shiftwidth=4 filetype=typescript:
// SPDX-License-Identifier: GPL-3.0-only

//
//
// ~chewygumxx/agent-library.git
// ::: :/tests/agent-stewardship.test/harness.mts
//
//

// What the agent-stewardship tests share: the skill's scripts, run against
// the stand-ins in `bin/` for herdr and systemd-run, from a temporary root
// that each test gets afresh. The tests stay out of the skill's directory,
// as `skills add` copies all of that to whoever installs it.

import { afterEach, beforeEach } from "bun:test";
import {
    chmod,
    mkdir,
    mkdtemp,
    readFile,
    rm,
    writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const scripts = join(
    import.meta.dir,
    "..",
    "..",
    "skills",
    "agent-stewardship",
    "scripts",
);
export const send = join(scripts, "send-prompt.sh");
export const compact = join(scripts, "compact-self.sh");
export const job = join(scripts, "job.sh");
export const stopped = join(scripts, "job-stopped.sh");

// The stand-ins, which `bin/herdr` documents, take their cues from files
// in the root, which $STUB names.
const standIns = join(import.meta.dir, "bin");
// Stand-ins that are not on PATH, copied beside the scripts they serve.
export const standIn = (name: string) =>
    join(import.meta.dir, "stand-ins", name);

export let root: string;
let env: Record<string, string>;

// Gives each test of the calling file its own root. A test file calls it
// once, at its top: Bun loads this module once for every file, so hooks
// registered here at load would reach only the first.
export function sandbox() {
    beforeEach(async () => {
        root = await mkdtemp(join(tmpdir(), "agent-stewardship-"));
        await mkdir(join(root, "bin"));
        await mkdir(join(root, "run"));
        await writeFile(join(root, "status"), "idle");
        // Not the ambient environment: no HERDR_PANE_ID, nor the user's XDG.
        env = {
            // The root's own `bin` takes a test's further stand-ins.
            PATH: [join(root, "bin"), standIns, process.env.PATH ?? ""].join(
                ":",
            ),
            HOME: root,
            XDG_RUNTIME_DIR: join(root, "run"),
            XDG_STATE_HOME: join(root, "state"),
            STUB: root,
            TZ: "UTC",
            // The pause before Enter, not waited out but for its own test.
            AGENT_STEWARDSHIP_SEND_PAUSE: "0",
        };
    });

    afterEach(async () => {
        await rm(root, { recursive: true, force: true });
    });
}

export const sendsDir = () => join(root, "state", "agent-stewardship", "sends");
export const lockFile = () =>
    join(root, "run", "agent-stewardship", "w1_p2.lock");
export const setStatus = (status: string) =>
    writeFile(join(root, "status"), status);
export const touch = (name: string) => writeFile(join(root, name), "");

// Puts on PATH, ahead of the real one, a command that only logs its calls.
export async function logOnly(name: string) {
    const path = join(root, "bin", name);
    await writeFile(path, `#!/bin/sh\nexec log-call ${name} "$@"\n`);
    await chmod(path, 0o755);
}

// Every call to a stand-in, as its name and arguments.
export async function calls(): Promise<string[][]> {
    const raw = await readFile(join(root, "calls.log"), "utf8").catch(() => "");
    return raw
        .split("\x01")
        .filter(Boolean)
        .map((call) => call.split("\0").slice(0, -1));
}

// The calls that wrote to a pane, without their `herdr` prefix.
export async function writes(): Promise<string[][]> {
    return (await calls())
        .filter(
            (call) =>
                call[0] === "herdr" &&
                call[1] === "pane" &&
                call[2]?.startsWith("send-"),
        )
        .map((call) => call.slice(2));
}

export const start = (
    script: string,
    args: string[],
    stdin = "",
    extra: Record<string, string> = {},
    cwd = root,
) =>
    Bun.spawn([script, ...args], {
        // A tool on PATH may be a mise shim, which reads the config of every
        // directory above its own and refuses one the user has not trusted:
        // trust lives under the real HOME. A worktree may sit within a
        // checkout, whose config no list of this one's paths would cover.
        cwd,
        env: { ...env, ...extra },
        stdin: new Blob([stdin]),
        stdout: "pipe",
        stderr: "pipe",
    });

export async function finish(child: ReturnType<typeof start>) {
    const [out, err, code] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
    ]);
    return { out, err, code };
}

export const run = (
    script: string,
    args: string[],
    stdin = "",
    extra: Record<string, string> = {},
) => finish(start(script, args, stdin, extra));

export async function until(done: () => Promise<boolean>) {
    for (let waited = 0; waited < 5000; waited += 20) {
        if (await done()) return;
        await Bun.sleep(20);
    }
    throw new Error("timed out waiting");
}
