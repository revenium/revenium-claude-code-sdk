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
/** Available subscription tiers */
export declare const SUBSCRIPTION_TIER_CONFIG: {
    readonly pro: {
        readonly name: "Pro (~$20 USD/month or local equivalent)";
    };
    readonly max_5x: {
        readonly name: "Max 5x (~$100 USD/month or local equivalent)";
    };
    readonly max_20x: {
        readonly name: "Max 20x (~$200 USD/month or local equivalent)";
    };
    readonly team_premium: {
        readonly name: "Team Premium (~$125 USD/seat or local equivalent)";
    };
    readonly enterprise: {
        readonly name: "Enterprise (custom)";
    };
    readonly api: {
        readonly name: "API (no subscription)";
    };
};
export declare const SUBSCRIPTION_TIERS: ReadonlyArray<keyof typeof SUBSCRIPTION_TIER_CONFIG>;
export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIER_CONFIG;
/** Environment variable names */
export declare const ENV_VARS: {
    readonly TELEMETRY_ENABLED: "CLAUDE_CODE_ENABLE_TELEMETRY";
    readonly OTLP_ENDPOINT: "OTEL_EXPORTER_OTLP_ENDPOINT";
    readonly OTLP_HEADERS: "OTEL_EXPORTER_OTLP_HEADERS";
    readonly OTLP_PROTOCOL: "OTEL_EXPORTER_OTLP_PROTOCOL";
    readonly SUBSCRIBER_EMAIL: "REVENIUM_SUBSCRIBER_EMAIL";
    readonly SUBSCRIPTION: "CLAUDE_CODE_SUBSCRIPTION";
    readonly SUBSCRIPTION_TIER: "CLAUDE_CODE_SUBSCRIPTION_TIER";
    readonly ORGANIZATION_ID: "REVENIUM_ORGANIZATION_ID";
    readonly PRODUCT_ID: "REVENIUM_PRODUCT_ID";
    readonly EXTRA_USAGE_ENABLED: "CLAUDE_CODE_EXTRA_USAGE_ENABLED";
};
//# sourceMappingURL=constants.d.ts.map