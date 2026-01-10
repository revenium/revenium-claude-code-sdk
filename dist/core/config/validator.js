"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateApiKey = validateApiKey;
exports.validateEmail = validateEmail;
exports.validateSubscriptionTier = validateSubscriptionTier;
exports.validateConfig = validateConfig;
const constants_js_1 = require("../../utils/constants.js");
const VALID_TIERS = Object.keys(constants_js_1.SUBSCRIPTION_TIER_CONFIG);
/**
 * Validates that an API key has the correct format.
 * Valid format: hak_{tenant}_{random}
 */
function validateApiKey(apiKey) {
    const errors = [];
    if (!apiKey || apiKey.trim() === '') {
        errors.push('API key is required');
        return { valid: false, errors };
    }
    if (!apiKey.startsWith(constants_js_1.API_KEY_PREFIX)) {
        errors.push(`API key must start with "${constants_js_1.API_KEY_PREFIX}"`);
    }
    // Check for at least two underscores (hak_tenant_random)
    const parts = apiKey.split('_');
    if (parts.length < 3) {
        errors.push('API key format should be: hak_{tenant}_{key}');
    }
    // Minimum length check
    if (apiKey.length < 12) {
        errors.push('API key appears too short');
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
/**
 * Validates an email address format.
 */
function validateEmail(email) {
    const errors = [];
    if (!email || email.trim() === '') {
        // Email is optional
        return { valid: true, errors: [] };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        errors.push('Invalid email format');
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
/**
 * Validates a subscription tier.
 */
function validateSubscriptionTier(tier) {
    const errors = [];
    if (!tier || tier.trim() === '') {
        // Tier is optional
        return { valid: true, errors: [] };
    }
    const lowerTier = tier.toLowerCase();
    if (!VALID_TIERS.includes(lowerTier)) {
        errors.push(`Invalid subscription tier. Valid options: ${VALID_TIERS.join(', ')}`);
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
/**
 * Validates a complete Revenium configuration.
 */
function validateConfig(config) {
    const allErrors = [];
    const apiKeyResult = validateApiKey(config.apiKey || '');
    allErrors.push(...apiKeyResult.errors);
    const emailResult = validateEmail(config.email || '');
    allErrors.push(...emailResult.errors);
    if (config.subscriptionTier) {
        const tierResult = validateSubscriptionTier(config.subscriptionTier);
        allErrors.push(...tierResult.errors);
    }
    if (!config.endpoint || config.endpoint.trim() === '') {
        allErrors.push('Endpoint URL is required');
    }
    else {
        try {
            new URL(config.endpoint);
        }
        catch {
            allErrors.push('Invalid endpoint URL format');
        }
    }
    return {
        valid: allErrors.length === 0,
        errors: allErrors,
    };
}
//# sourceMappingURL=validator.js.map