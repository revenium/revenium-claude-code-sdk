/**
 * Constants for the Revenium Claude Code Metering CLI
 */
/** Default Revenium API base URL */
export declare const DEFAULT_REVENIUM_URL = "https://api.revenium.ai";
/** Path appended to base URL for OTLP endpoint */
export declare const OTLP_PATH = "/meter/v2/otlp";
/** API key prefix required for valid Revenium API keys */
export declare const API_KEY_PREFIX = "hak_";
/** Directory for Claude Code configuration */
export declare const CLAUDE_CONFIG_DIR = ".claude";
/** Filename for Revenium environment configuration */
export declare const REVENIUM_ENV_FILE = "revenium.env";
/** File permissions for config file (owner read/write only) */
export declare const CONFIG_FILE_MODE = 384;
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
export declare const SUBSCRIPTION_TIER_CONFIG: {
    readonly pro: {
        readonly name: "Pro (~$20 USD/month or local equivalent)";
        readonly multiplier: 0.16;
    };
    readonly max_5x: {
        readonly name: "Max 5x (~$100 USD/month or local equivalent)";
        readonly multiplier: 0.16;
    };
    readonly max_20x: {
        readonly name: "Max 20x (~$200 USD/month or local equivalent)";
        readonly multiplier: 0.08;
    };
    readonly team_premium: {
        readonly name: "Team Premium (~$125 USD/seat or local equivalent)";
        readonly multiplier: 0.2;
    };
    readonly enterprise: {
        readonly name: "Enterprise (custom)";
        readonly multiplier: 0.05;
    };
    readonly api: {
        readonly name: "API (no subscription)";
        readonly multiplier: 1;
    };
};
export declare const SUBSCRIPTION_TIERS: ReadonlyArray<keyof typeof SUBSCRIPTION_TIER_CONFIG>;
export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIER_CONFIG;
/** Get the cost multiplier for a given tier */
export declare function getCostMultiplier(tier: SubscriptionTier): number;
/** Environment variable names */
export declare const ENV_VARS: {
    readonly TELEMETRY_ENABLED: "CLAUDE_CODE_ENABLE_TELEMETRY";
    readonly OTLP_ENDPOINT: "OTEL_EXPORTER_OTLP_ENDPOINT";
    readonly OTLP_HEADERS: "OTEL_EXPORTER_OTLP_HEADERS";
    readonly OTLP_PROTOCOL: "OTEL_EXPORTER_OTLP_PROTOCOL";
    readonly SUBSCRIBER_EMAIL: "REVENIUM_SUBSCRIBER_EMAIL";
    readonly SUBSCRIPTION: "CLAUDE_CODE_SUBSCRIPTION";
    readonly COST_MULTIPLIER: "CLAUDE_CODE_COST_MULTIPLIER";
    readonly ORGANIZATION_ID: "REVENIUM_ORGANIZATION_ID";
    readonly PRODUCT_ID: "REVENIUM_PRODUCT_ID";
};
//# sourceMappingURL=constants.d.ts.map