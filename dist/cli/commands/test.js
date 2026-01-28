"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testCommand = testCommand;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const loader_js_1 = require("../../core/config/loader.js");
const client_js_1 = require("../../core/api/client.js");
/**
 * Sends a test metric to verify the integration.
 */
async function testCommand(options = {}) {
    console.log(chalk_1.default.bold('\nRevenium Claude Code Metering Test\n'));
    // Check if configured
    if (!(0, loader_js_1.configExists)()) {
        console.log(chalk_1.default.red('Configuration not found'));
        console.log(chalk_1.default.yellow('Run `revenium-metering setup` first to configure the integration.'));
        process.exit(1);
    }
    // Load configuration
    const config = await (0, loader_js_1.loadConfig)();
    if (!config) {
        console.log(chalk_1.default.red('Could not load configuration'));
        process.exit(1);
    }
    // Generate test payload with optional subscriber/attribution attributes
    const sessionId = (0, client_js_1.generateTestSessionId)();
    const payload = (0, client_js_1.createTestPayload)(sessionId, {
        email: config.email,
        organizationId: config.organizationId,
        productId: config.productId,
    });
    if (options.verbose) {
        console.log(chalk_1.default.dim('Test payload:'));
        console.log(chalk_1.default.dim(JSON.stringify(payload, null, 2)));
        console.log('');
    }
    // Send test metric
    const spinner = (0, ora_1.default)('Sending test metric...').start();
    try {
        const startTime = Date.now();
        const response = await (0, client_js_1.sendOtlpLogs)(config.endpoint, config.apiKey, payload);
        const latencyMs = Date.now() - startTime;
        spinner.succeed(`Test metric sent successfully (${latencyMs}ms)`);
        console.log('\n' + chalk_1.default.bold('Response:'));
        console.log(`  ID:              ${response.id}`);
        console.log(`  Resource Type:   ${response.resourceType}`);
        console.log(`  Processed:       ${response.processedEvents} event(s)`);
        console.log(`  Created:         ${response.created}`);
        console.log('\n' + chalk_1.default.green.bold('Integration is working correctly!'));
        console.log(chalk_1.default.dim('\nNote: This test metric uses session ID: ' + sessionId));
        console.log(chalk_1.default.dim('You can verify it in the Revenium dashboard at https://app.revenium.ai'));
    }
    catch (error) {
        spinner.fail('Failed to send test metric');
        console.error(chalk_1.default.red(`\nError: ${error instanceof Error ? error.message : 'Unknown error'}`));
        console.log('\n' + chalk_1.default.yellow('Troubleshooting:'));
        console.log('  1. Verify your API key is correct');
        console.log('  2. Check the endpoint URL');
        console.log('  3. Ensure you have network connectivity');
        console.log('  4. Run `revenium-metering status` for more details');
        process.exit(1);
    }
    console.log('');
}
//# sourceMappingURL=test.js.map