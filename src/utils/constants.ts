/**
 * Constants for the Revenium Claude Code Metering CLI
 */

/** Default Revenium API base URL */
export const DEFAULT_REVENIUM_URL = 'https://api.revenium.ai';

/** Path appended to base URL for OTEL metrics endpoint */
export const OTLP_PATH = '/meter/v2/otel';

/** API key prefix required for valid Revenium API keys */
export const API_KEY_PREFIX = 'hak_';

/** Directory for Claude Code configuration */
export const CLAUDE_CONFIG_DIR = '.claude';

/** Filename for Revenium environment configuration */
export const REVENIUM_ENV_FILE = 'revenium.env';

/** File permissions for config file (owner read/write only) */
export const CONFIG_FILE_MODE = 0o600;

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
export const SUBSCRIPTION_TIER_CONFIG = {
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
    name: 'Team Premium (~$150 USD/seat or local equivalent)',
    multiplier: 0.24, // $150 / $625 API equivalent = 24%
  },
  enterprise: {
    name: 'Enterprise (custom)',
    multiplier: 0.05, // Custom pricing with best discounts
  },
  api: {
    name: 'API (no subscription)',
    multiplier: 1.0, // Full API pricing
  },
} as const;

export const SUBSCRIPTION_TIERS = Object.keys(SUBSCRIPTION_TIER_CONFIG) as ReadonlyArray<keyof typeof SUBSCRIPTION_TIER_CONFIG>;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIER_CONFIG;

/** Get the cost multiplier for a given tier */
export function getCostMultiplier(tier: SubscriptionTier): number {
  return SUBSCRIPTION_TIER_CONFIG[tier].multiplier;
}

/** Environment variable names */
export const ENV_VARS = {
  TELEMETRY_ENABLED: 'CLAUDE_CODE_ENABLE_TELEMETRY',
  OTLP_ENDPOINT: 'OTEL_EXPORTER_OTLP_ENDPOINT',
  OTLP_HEADERS: 'OTEL_EXPORTER_OTLP_HEADERS',
  OTLP_PROTOCOL: 'OTEL_EXPORTER_OTLP_PROTOCOL',
  SUBSCRIBER_EMAIL: 'REVENIUM_SUBSCRIBER_EMAIL',
  SUBSCRIPTION: 'CLAUDE_CODE_SUBSCRIPTION',
  COST_MULTIPLIER: 'CLAUDE_CODE_COST_MULTIPLIER',
  ORGANIZATION_ID: 'REVENIUM_ORGANIZATION_ID',
  PRODUCT_ID: 'REVENIUM_PRODUCT_ID',
} as const;
