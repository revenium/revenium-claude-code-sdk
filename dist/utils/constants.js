"use strict";
/**
 * Constants for the Revenium Claude Code Metering CLI
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV_VARS = exports.SUBSCRIPTION_TIERS = exports.SUBSCRIPTION_TIER_CONFIG = exports.CONFIG_FILE_MODE = exports.REVENIUM_ENV_FILE = exports.CLAUDE_CONFIG_DIR = exports.API_KEY_PREFIX = exports.OTLP_PATH = exports.DEFAULT_REVENIUM_URL = void 0;
exports.getCostMultiplier = getCostMultiplier;
/** Default Revenium API base URL */
exports.DEFAULT_REVENIUM_URL = 'https://api.revenium.ai';
/** Path appended to base URL for OTLP endpoint */
exports.OTLP_PATH = '/meter/v2/otlp';
/** API key prefix required for valid Revenium API keys */
exports.API_KEY_PREFIX = 'hak_';
/** Directory for Claude Code configuration */
exports.CLAUDE_CONFIG_DIR = '.claude';
/** Filename for Revenium environment configuration */
exports.REVENIUM_ENV_FILE = 'revenium.env';
/** File permissions for config file (owner read/write only) */
exports.CONFIG_FILE_MODE = 0o600;
/** Available subscription tiers with their cost multipliers
 *
 * Cost multipliers represent the effective discount vs API pricing.
 * Values are estimates based on fully consuming monthly token allotments.
 *
 * Calculation basis: Max 20x tier ($200 for 20X tokens = $2,500 API equivalent)
 * establishes $125 per X tokens at API rates. Other tiers calculated proportionally.
 *
 * For detailed explanation and manual override instructions, see README.md
 */
exports.SUBSCRIPTION_TIER_CONFIG = {
    pro: {
        name: 'Pro (~$20 USD/month or local equivalent)',
        multiplier: 0.16, // $20 / $125 API equivalent = 16%
    },
    max_5x: {
        name: 'Max 5x (~$100 USD/month or local equivalent)',
        multiplier: 0.16, // $100 / $625 API equivalent = 16%
    },
    max_20x: {
        name: 'Max 20x (~$200 USD/month or local equivalent)',
        multiplier: 0.08, // $200 / $2,500 API equivalent = 8% (baseline from real data)
    },
    team_premium: {
        name: 'Team Premium (~$125 USD/seat or local equivalent)',
        multiplier: 0.20, // $125 / $625 API equivalent = 20%
    },
    enterprise: {
        name: 'Enterprise (custom)',
        multiplier: 0.05, // Custom pricing with best discounts
    },
    api: {
        name: 'API (no subscription)',
        multiplier: 1.0, // Full API pricing
    },
};
exports.SUBSCRIPTION_TIERS = Object.keys(exports.SUBSCRIPTION_TIER_CONFIG);
/** Get the cost multiplier for a given tier */
function getCostMultiplier(tier) {
    return exports.SUBSCRIPTION_TIER_CONFIG[tier].multiplier;
}
/** Environment variable names */
exports.ENV_VARS = {
    TELEMETRY_ENABLED: 'CLAUDE_CODE_ENABLE_TELEMETRY',
    OTLP_ENDPOINT: 'OTEL_EXPORTER_OTLP_ENDPOINT',
    OTLP_HEADERS: 'OTEL_EXPORTER_OTLP_HEADERS',
    OTLP_PROTOCOL: 'OTEL_EXPORTER_OTLP_PROTOCOL',
    SUBSCRIBER_EMAIL: 'REVENIUM_SUBSCRIBER_EMAIL',
    SUBSCRIPTION: 'CLAUDE_CODE_SUBSCRIPTION',
    COST_MULTIPLIER: 'CLAUDE_CODE_COST_MULTIPLIER',
    ORGANIZATION_ID: 'REVENIUM_ORGANIZATION_ID',
    PRODUCT_ID: 'REVENIUM_PRODUCT_ID',
};
//# sourceMappingURL=constants.js.map