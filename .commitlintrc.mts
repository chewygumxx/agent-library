// vim:set expandtab shiftwidth=4 filetype=typescript:
// SPDX-License-Identifier: GPL-3.0-only

//
//
// ~chewygumxx/agent-library.git
// ::: :/.commitlintrc.mts
//
//

import { defineConfig } from "@chewygumxx/commitlint-config";

const scopes = [
    {
        name: "skill",
        fullName: "Agent Skill",
        description: "General agent skill development",
    },
];

export default defineConfig({
    scopes: scopes,
});
