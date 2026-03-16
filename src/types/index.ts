import type { SubscriptionTier } from "../utils/constants.js";

/**
 * Configuration stored in ~/.claude/revenium.env
 */
export interface ReveniumConfig {
  apiKey: string;
  endpoint: string;
  email?: string;
  subscriptionTier?: SubscriptionTier;
  /** Optional organization name for attributing costs to a specific customer/company */
  organizationName?: string;
  /** Alias for organizationName — accepted for backward compatibility */
  organizationId?: string;
  /** Optional product name for attributing costs to a specific product/project */
  productName?: string;
  /** Alias for productName — accepted for backward compatibility */
  productId?: string;
  /** Whether extra usage beyond subscription limits is enabled */
  extraUsageEnabled?: boolean;
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
export type ShellType = "bash" | "zsh" | "fish" | "unknown";

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
 * OTLP log payload structure (matching backend expectations)
 */
export interface OTLPLogsPayload {
  resourceLogs: Array<{
    resource?: {
      attributes?: Array<{
        key: string;
        value: OTLPValue;
      }>;
    };
    scopeLogs: Array<{
      scope?: {
        name: string;
        version: string;
      };
      logRecords: Array<{
        timeUnixNano?: string;
        body: OTLPValue;
        attributes: Array<{
          key: string;
          value: OTLPValue;
        }>;
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
 * Response from OTLP endpoint
 */
export interface OTLPResponse {
  id: string;
  resourceType: string;
  processedEvents: number;
  created: string;
}

export * from "./tool-metering.js";
