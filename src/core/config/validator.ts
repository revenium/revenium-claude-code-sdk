import { API_KEY_PREFIX, SUBSCRIPTION_TIER_CONFIG } from '../../utils/constants.js';

const VALID_TIERS = Object.keys(SUBSCRIPTION_TIER_CONFIG);
import type { ReveniumConfig, ValidationResult } from '../../types/index.js';

/**
 * Validates that an API key has the correct format.
 * Valid format: hak_{tenant}_{random}
 */
export function validateApiKey(apiKey: string): ValidationResult {
  const errors: string[] = [];

  if (!apiKey || apiKey.trim() === '') {
    errors.push('API key is required');
    return { valid: false, errors };
  }

  if (!apiKey.startsWith(API_KEY_PREFIX)) {
    errors.push(`API key must start with "${API_KEY_PREFIX}"`);
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
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

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
export function validateSubscriptionTier(tier: string): ValidationResult {
  const errors: string[] = [];

  if (!tier || tier.trim() === '') {
    // Tier is optional
    return { valid: true, errors: [] };
  }

  const lowerTier = tier.toLowerCase();
  if (!VALID_TIERS.includes(lowerTier)) {
    errors.push(
      `Invalid subscription tier. Valid options: ${VALID_TIERS.join(', ')}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a complete Revenium configuration.
 */
export function validateConfig(config: Partial<ReveniumConfig>): ValidationResult {
  const allErrors: string[] = [];

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
  } else {
    try {
      new URL(config.endpoint);
    } catch {
      allErrors.push('Invalid endpoint URL format');
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}
