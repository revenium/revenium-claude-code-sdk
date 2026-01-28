import type { SubscriptionTier } from "../utils/constants.js";
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
    /** Optional organization name for attributing costs to a specific customer/company */
    organizationName?: string;
    /**
     * @deprecated Use organizationName instead. This field will be removed in a future version.
     * Organization or company identifier
     */
    organizationId?: string;
    /** Optional product name for attributing costs to a specific product/project */
    productName?: string;
    /**
     * @deprecated Use productName instead. This field will be removed in a future version.
     * Product or application identifier
     */
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
//# sourceMappingURL=index.d.ts.map