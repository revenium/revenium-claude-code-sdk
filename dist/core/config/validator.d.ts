import type { ReveniumConfig, ValidationResult } from "../../types/index.js";
/**
 * Validates that an API key has the correct format.
 * Valid format: hak_{tenant}_{random}
 */
export declare function validateApiKey(apiKey: string): ValidationResult;
/**
 * Validates an email address format.
 */
export declare function validateEmail(email: string): ValidationResult;
/**
 * Validates a subscription tier.
 */
export declare function validateSubscriptionTier(tier: string): ValidationResult;
/**
 * Validates an endpoint URL and ensures it uses HTTPS.
 */
export declare function validateEndpointUrl(endpoint: string): ValidationResult;
/**
 * Validates a complete Revenium configuration.
 */
export declare function validateConfig(config: Partial<ReveniumConfig>): ValidationResult;
//# sourceMappingURL=validator.d.ts.map