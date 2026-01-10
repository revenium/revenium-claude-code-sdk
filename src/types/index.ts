import type { SubscriptionTier } from '../utils/constants.js';

/**
 * Configuration stored in ~/.claude/revenium.env
 */
export interface ReveniumConfig {
  apiKey: string;
  endpoint: string;
  email?: string;
  subscriptionTier?: SubscriptionTier;
  /** Optional override for the cost multiplier (overrides tier default) */
  costMultiplierOverride?: number;
  /** Optional organization ID for attributing costs to a specific customer/company */
  organizationId?: string;
  /** Optional product ID for attributing costs to a specific product/project */
  productId?: string;
}

/**
 * Result of configuration validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Result of endpoint health check
 */
export interface HealthCheckResult {
  healthy: boolean;
  statusCode?: number;
  message: string;
  latencyMs?: number;
}

/**
 * Shell types supported for profile updates
 */
export type ShellType = 'bash' | 'zsh' | 'fish' | 'unknown';

/**
 * Result of shell profile update
 */
export interface ShellUpdateResult {
  success: boolean;
  shellType: ShellType;
  profilePath?: string;
  message: string;
}

/**
 * OTEL metrics payload structure (matching backend expectations)
 * Uses OTEL metrics format with sum datapoints for token counts
 * Sent to: POST /meter/v2/otel/v1/metrics
 */
export interface OTLPMetricsPayload {
  resourceMetrics: Array<{
    resource?: {
      attributes?: Array<{
        key: string;
        value: OTLPValue;
      }>;
    };
    scopeMetrics: Array<{
      metrics: Array<{
        name: string;
        unit?: string;
        sum: {
          dataPoints: Array<{
            attributes?: Array<{
              key: string;
              value: OTLPValue;
            }>;
            timeUnixNano?: string;
            asInt?: number;
            asDouble?: number;
          }>;
        };
      }>;
    }>;
  }>;
}

/**
 * OTLP any value type
 */
export interface OTLPValue {
  stringValue?: string;
  intValue?: number;
  doubleValue?: number;
  boolValue?: boolean;
}

/**
 * Response from OTEL metrics endpoint
 */
export interface OTLPResponse {
  id: string;
  resourceType: string;
  processedMetrics: number;
  created: string;
}
