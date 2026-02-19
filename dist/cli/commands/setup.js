"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupCommand = setupCommand;
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const constants_js_1 = require("../../utils/constants.js");
const masking_js_1 = require("../../utils/masking.js");
const validator_js_1 = require("../../core/config/validator.js");
const writer_js_1 = require("../../core/config/writer.js");
const client_js_1 = require("../../core/api/client.js");
const profile_updater_js_1 = require("../../core/shell/profile-updater.js");
const detector_js_1 = require("../../core/shell/detector.js");
/**
 * Interactive setup wizard for Revenium Claude Code metering.
 */
async function setupCommand(options = {}) {
    console.log(chalk_1.default.bold("\nRevenium Claude Code Metering Setup\n"));
    console.log(chalk_1.default.dim("This wizard will configure Claude Code to export telemetry to Revenium.\n"));
    // Collect configuration
    const config = await collectConfiguration(options);
    // Validate API key with endpoint
    const spinner = (0, ora_1.default)("Testing API key...").start();
    try {
        const healthResult = await (0, client_js_1.checkEndpointHealth)(config.endpoint, config.apiKey);
        if (!healthResult.healthy) {
            spinner.fail(`API key validation failed: ${healthResult.message}`);
            console.log(chalk_1.default.yellow("\nPlease check your API key and try again. If the problem persists, contact support."));
            process.exit(1);
        }
        spinner.succeed(`API key validated (${healthResult.latencyMs}ms latency)`);
    }
    catch (error) {
        spinner.fail("Failed to validate API key");
        console.error(chalk_1.default.red(`Error: ${error instanceof Error ? error.message : "Unknown error"}`));
        process.exit(1);
    }
    // Write configuration file
    const writeSpinner = (0, ora_1.default)("Writing configuration...").start();
    try {
        const configPath = await (0, writer_js_1.writeConfig)(config);
        writeSpinner.succeed(`Configuration written to ${chalk_1.default.cyan(configPath)}`);
    }
    catch (error) {
        writeSpinner.fail("Failed to write configuration");
        console.error(chalk_1.default.red(`Error: ${error instanceof Error ? error.message : "Unknown error"}`));
        process.exit(1);
    }
    // Update shell profile
    if (!options.skipShellUpdate) {
        const shellSpinner = (0, ora_1.default)("Updating shell profile...").start();
        try {
            const shellResult = await (0, profile_updater_js_1.updateShellProfile)();
            if (shellResult.success) {
                shellSpinner.succeed(shellResult.message);
            }
            else {
                shellSpinner.warn(shellResult.message);
                const shellType = (0, detector_js_1.detectShell)();
                console.log(chalk_1.default.dim(`\nManual setup:\n${(0, profile_updater_js_1.getManualInstructions)(shellType)}`));
            }
        }
        catch {
            shellSpinner.warn("Could not update shell profile automatically");
            const shellType = (0, detector_js_1.detectShell)();
            console.log(chalk_1.default.dim(`\nManual setup:\n${(0, profile_updater_js_1.getManualInstructions)(shellType)}`));
        }
    }
    // Print success message
    printSuccessMessage(config);
}
async function collectConfiguration(options) {
    const answers = await inquirer_1.default.prompt([
        {
            type: "password",
            name: "apiKey",
            message: "Enter your Revenium API key:",
            when: !options.apiKey,
            validate: (input) => {
                const result = (0, validator_js_1.validateApiKey)(input);
                return result.valid || result.errors.join(", ");
            },
            mask: "*",
        },
        {
            type: "input",
            name: "email",
            message: "Enter your email (for usage attribution):",
            when: !options.email,
            validate: (input) => {
                if (!input)
                    return true; // Optional
                const result = (0, validator_js_1.validateEmail)(input);
                return result.valid || result.errors.join(", ");
            },
        },
        {
            type: "list",
            name: "tier",
            message: "Select your Claude Code subscription tier (for estimating discounts from list API rates):",
            when: !options.tier,
            pageSize: 20,
            choices: [
                ...Object.entries(constants_js_1.SUBSCRIPTION_TIER_CONFIG).map(([key, config]) => ({
                    name: config.name,
                    value: key,
                })),
                new inquirer_1.default.Separator(" "),
                new inquirer_1.default.Separator(chalk_1.default.dim("  Note: if you have a custom discount from Anthropic, you can configure it later in ~/.claude/revenium.env.")),
                new inquirer_1.default.Separator(" "),
            ],
        },
        {
            type: "input",
            name: "endpoint",
            message: "Revenium API endpoint:",
            default: constants_js_1.DEFAULT_REVENIUM_URL,
            when: !options.endpoint,
            validate: (input) => {
                const result = (0, validator_js_1.validateEndpointUrl)(input);
                if (!result.valid) {
                    return result.errors[0] || "Invalid endpoint URL";
                }
                return true;
            },
        },
    ]);
    // Normalize endpoint by removing trailing slashes and /meter paths
    const rawEndpoint = options.endpoint || answers.endpoint || constants_js_1.DEFAULT_REVENIUM_URL;
    let endpoint = rawEndpoint.replace(/\/+$/, ""); // Remove trailing slashes
    // Strip /meter paths if user included them (e.g., /meter/v2/otlp, /meter/v2/ai/otlp, or just /meter)
    try {
        const url = new URL(endpoint);
        if (url.pathname.includes("/meter")) {
            url.pathname = url.pathname.split("/meter")[0];
            endpoint = url.origin + url.pathname;
        }
    }
    catch {
        // If URL parsing fails, just use the cleaned endpoint as-is
    }
    // Remove any remaining trailing slashes after path manipulation
    endpoint = endpoint.replace(/\/+$/, "");
    return {
        apiKey: options.apiKey || answers.apiKey,
        email: options.email || answers.email || undefined,
        subscriptionTier: (options.tier || answers.tier),
        endpoint,
        organizationId: options.organizationId,
        productId: options.productId,
    };
}
function printSuccessMessage(config) {
    console.log("\n" + chalk_1.default.green.bold("Setup complete!") + "\n");
    console.log(chalk_1.default.bold("Configuration:"));
    console.log(`  API Key:    ${(0, masking_js_1.maskApiKey)(config.apiKey)}`);
    console.log(`  Endpoint:   ${config.endpoint}`);
    if (config.email) {
        console.log(`  Email:      ${(0, masking_js_1.maskEmail)(config.email)}`);
    }
    if (config.subscriptionTier) {
        const tier = config.subscriptionTier;
        const tierConfig = constants_js_1.SUBSCRIPTION_TIER_CONFIG[tier];
        console.log(`  Tier:       ${tierConfig.name}`);
    }
    if (config.organizationId) {
        console.log(`  Organization: ${config.organizationId}`);
    }
    if (config.productId) {
        console.log(`  Product:    ${config.productId}`);
    }
    console.log("\n" + chalk_1.default.yellow.bold("Next steps:"));
    console.log("  1. Restart your terminal or run:");
    console.log(chalk_1.default.cyan("     source ~/.claude/revenium.env"));
    console.log("  2. Start using Claude Code - telemetry will be sent automatically");
    console.log("  3. Import past usage by running: " +
        chalk_1.default.cyan("revenium-metering backfill"));
    console.log("  4. Check your usage at https://app.revenium.ai");
    console.log("\n" +
        chalk_1.default.dim("Run `revenium-metering status` to verify the configuration at any time."));
}
//# sourceMappingURL=setup.js.map