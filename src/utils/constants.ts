/**
 * Constants for the Revenium Claude Code Metering CLI
 */

/** Default Revenium API base URL */
export const DEFAULT_REVENIUM_URL = 'https://api.revenium.ai';

/** Path appended to base URL for OTLP endpoint */
export const OTLP_PATH = '/meter/v2/otlp';

/** API key prefix required for valid Revenium API keys */
export const API_KEY_PREFIX = 'hak_';

/** Directory for Claude Code configuration */
export const CLAUDE_CONFIG_DIR = '.claude';

/** Filename for Revenium environment configuration */
export const REVENIUM_ENV_FILE = 'revenium.env';

/** File permissions for config file (owner read/write only) */
export const CONFIG_FILE_MODE = 0o600;

/** Available subscription tiers */
export const SUBSCRIPTION_TIER_CONFIG = {
  pro: {
    name: 'Pro (~$20 USD/month or local equivalent)',
  },
  max_5x: {
    name: 'Max 5x (~$100 USD/month or local equivalent)',
  },
  max_20x: {
    name: 'Max 20x (~$200 USD/month or local equivalent)',
  },
  team_premium: {
    name: 'Team Premium (~$125 USD/seat or local equivalent)',
  },
  enterprise: {
    name: 'Enterprise (custom)',
  },
  api: {
    name: 'API (no subscription)',
  },
} as const;

export const SUBSCRIPTION_TIERS = Object.keys(SUBSCRIPTION_TIER_CONFIG) as ReadonlyArray<keyof typeof SUBSCRIPTION_TIER_CONFIG>;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIER_CONFIG;

/** Environment variable names */
export const ENV_VARS = {
  TELEMETRY_ENABLED: 'CLAUDE_CODE_ENABLE_TELEMETRY',
  OTLP_ENDPOINT: 'OTEL_EXPORTER_OTLP_ENDPOINT',
  OTLP_HEADERS: 'OTEL_EXPORTER_OTLP_HEADERS',
  OTLP_PROTOCOL: 'OTEL_EXPORTER_OTLP_PROTOCOL',
  SUBSCRIBER_EMAIL: 'REVENIUM_SUBSCRIBER_EMAIL',
  SUBSCRIPTION: 'CLAUDE_CODE_SUBSCRIPTION',
  // Revenium-specific resource attribute name; value is read from native CLAUDE_CODE_SUBSCRIPTION during setup
  SUBSCRIPTION_TIER: 'CLAUDE_CODE_SUBSCRIPTION_TIER',
  ORGANIZATION_ID: 'REVENIUM_ORGANIZATION_ID',
  PRODUCT_ID: 'REVENIUM_PRODUCT_ID',
  EXTRA_USAGE_ENABLED: 'CLAUDE_CODE_EXTRA_USAGE_ENABLED',
} as const;
