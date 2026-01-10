/**
 * Utility functions for masking sensitive data in terminal output
 */
/**
 * Masks an API key, showing only the prefix and last 4 characters.
 * Example: "hak_tenant_abc123xyz" -> "hak_***xyz"
 */
export declare function maskApiKey(apiKey: string): string;
/**
 * Masks an email address, showing only the first character and domain.
 * Example: "dev@company.com" -> "d***@company.com"
 */
export declare function maskEmail(email: string): string;
//# sourceMappingURL=masking.d.ts.map