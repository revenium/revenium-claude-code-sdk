"use strict";
/**
 * Utility functions for masking sensitive data in terminal output
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskApiKey = maskApiKey;
exports.maskEmail = maskEmail;
/**
 * Masks an API key, showing only the prefix and last 4 characters.
 * Example: "hak_tenant_abc123xyz" -> "hak_***xyz"
 */
function maskApiKey(apiKey) {
    if (!apiKey || apiKey.length < 8) {
        return '***';
    }
    const prefix = apiKey.substring(0, 4); // "hak_"
    const lastFour = apiKey.substring(apiKey.length - 4);
    return `${prefix}***${lastFour}`;
}
/**
 * Masks an email address, showing only the first character and domain.
 * Example: "dev@company.com" -> "d***@company.com"
 */
function maskEmail(email) {
    const atIndex = email.indexOf('@');
    if (atIndex <= 0) {
        return '***';
    }
    const firstChar = email.charAt(0);
    const domain = email.substring(atIndex);
    return `${firstChar}***${domain}`;
}
//# sourceMappingURL=masking.js.map