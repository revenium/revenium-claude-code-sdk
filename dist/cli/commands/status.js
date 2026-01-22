"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusCommand = statusCommand;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const loader_js_1 = require("../../core/config/loader.js");
const client_js_1 = require("../../core/api/client.js");
const masking_js_1 = require("../../utils/masking.js");
const detector_js_1 = require("../../core/shell/detector.js");
/**
 * Displays the current configuration status.
 */
async function statusCommand() {
    console.log(chalk_1.default.bold('\nRevenium Claude Code Metering Status\n'));
    // Check if config file exists
    const configPath = (0, loader_js_1.getConfigPath)();
    if (!(0, loader_js_1.configExists)()) {
        console.log(chalk_1.default.red('Configuration not found'));
        console.log(chalk_1.default.dim(`Expected at: ${configPath}`));
        console.log(chalk_1.default.yellow('\nRun `revenium-metering setup` to configure Claude Code metering.'));
        process.exit(1);
    }
    console.log(chalk_1.default.green('Configuration file found'));
    console.log(chalk_1.default.dim(`  ${configPath}`));
    // Load and display configuration
    const config = await (0, loader_js_1.loadConfig)();
    if (!config) {
        console.log(chalk_1.default.red('\nCould not parse configuration file'));
        console.log(chalk_1.default.yellow('Run `revenium-metering setup` to reconfigure.'));
        process.exit(1);
    }
    console.log('\n' + chalk_1.default.bold('Configuration:'));
    console.log(`  API Key:    ${(0, masking_js_1.maskApiKey)(config.apiKey)}`);
    console.log(`  Endpoint:   ${config.endpoint}`);
    if (config.email) {
        console.log(`  Email:      ${(0, masking_js_1.maskEmail)(config.email)}`);
    }
    if (config.subscriptionTier) {
        console.log(`  Tier:       ${config.subscriptionTier}`);
    }
    if (config.organizationId) {
        console.log(`  Organization: ${config.organizationId}`);
    }
    if (config.productId) {
        console.log(`  Product:    ${config.productId}`);
    }
    // Check if environment is loaded
    console.log('\n' + chalk_1.default.bold('Environment:'));
    if ((0, loader_js_1.isEnvLoaded)()) {
        console.log(chalk_1.default.green('  Environment variables are loaded in current shell'));
    }
    else {
        console.log(chalk_1.default.yellow('  Environment variables not loaded in current shell'));
        console.log(chalk_1.default.dim('  Run: source ~/.claude/revenium.env'));
    }
    // Shell profile status
    const shellType = (0, detector_js_1.detectShell)();
    const profilePath = (0, detector_js_1.getProfilePath)(shellType);
    console.log(`  Shell:      ${shellType}`);
    if (profilePath) {
        console.log(`  Profile:    ${profilePath}`);
    }
    // Test endpoint connectivity
    console.log('\n' + chalk_1.default.bold('Endpoint Health:'));
    const spinner = (0, ora_1.default)('  Testing connectivity...').start();
    try {
        const healthResult = await (0, client_js_1.checkEndpointHealth)(config.endpoint, config.apiKey, {
            organizationId: config.organizationId,
            productId: config.productId,
        });
        if (healthResult.healthy) {
            spinner.succeed(`  Endpoint healthy (${healthResult.latencyMs}ms)`);
        }
        else {
            spinner.fail(`  Endpoint unhealthy: ${healthResult.message}`);
        }
    }
    catch (error) {
        spinner.fail(`  Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    console.log('');
}
//# sourceMappingURL=status.js.map