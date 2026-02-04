#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.program = void 0;
const commander_1 = require("commander");
const setup_js_1 = require("./commands/setup.js");
const status_js_1 = require("./commands/status.js");
const test_js_1 = require("./commands/test.js");
const backfill_js_1 = require("./commands/backfill.js");
exports.program = new commander_1.Command();
exports.program
    .name("revenium-metering")
    .description("Configure Claude Code telemetry export to Revenium")
    .version("0.1.3");
exports.program
    .command("setup")
    .description("Interactive setup wizard to configure Claude Code metering")
    .option("-k, --api-key <key>", "Revenium API key (hak_...)")
    .option("-e, --email <email>", "Email for usage attribution")
    .option("-t, --tier <tier>", "Subscription tier (professional, max, team, enterprise, api)")
    .option("--endpoint <url>", "Revenium API endpoint URL")
    .option("-o, --organization <name>", "Organization name for cost attribution")
    .option("-p, --product <name>", "Product name for cost attribution")
    .option("--skip-shell-update", "Skip automatic shell profile update")
    .action(async (options) => {
    await (0, setup_js_1.setupCommand)({
        apiKey: options.apiKey,
        email: options.email,
        tier: options.tier,
        endpoint: options.endpoint,
        organizationId: options.organization,
        productId: options.product,
        skipShellUpdate: options.skipShellUpdate,
    });
});
exports.program
    .command("status")
    .description("Check current configuration and endpoint connectivity")
    .action(async () => {
    await (0, status_js_1.statusCommand)();
});
exports.program
    .command("test")
    .description("Send a test metric to verify the integration")
    .option("-v, --verbose", "Show detailed payload information")
    .action(async (options) => {
    await (0, test_js_1.testCommand)({ verbose: options.verbose });
});
exports.program
    .command("backfill")
    .description("Import historical Claude Code usage data from local JSONL files")
    .option("--since <date>", 'Only backfill after this date (ISO format or relative like "7d", "1m")')
    .option("--dry-run", "Show what would be sent without sending")
    .option("--batch-size <n>", "Messages per API batch (default: 100)", "100")
    .option("--delay <ms>", "Delay between batches in milliseconds (default: 100)", "100")
    .option("-v, --verbose", "Show detailed progress")
    .action(async (options) => {
    const batchSize = parseInt(options.batchSize, 10);
    if (!Number.isFinite(batchSize) || batchSize < 1 || batchSize > 10000) {
        console.error("Error: --batch-size must be between 1 and 10000");
        process.exit(1);
    }
    const delay = parseInt(options.delay, 10);
    if (!Number.isFinite(delay) || delay < 0 || delay > 60000) {
        console.error("Error: --delay must be between 0 and 60000 milliseconds");
        process.exit(1);
    }
    await (0, backfill_js_1.backfillCommand)({
        since: options.since,
        dryRun: options.dryRun,
        batchSize,
        delay,
        verbose: options.verbose,
    });
});
if (process.env.NODE_ENV !== "test") {
    exports.program.parse();
}
//# sourceMappingURL=index.js.map