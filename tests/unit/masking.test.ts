import { describe, it, expect } from 'vitest';
import { maskApiKey, maskEmail } from '../../src/utils/masking.js';

describe('maskApiKey', () => {
  it('should mask API key showing prefix and last 4 chars', () => {
    const result = maskApiKey('hak_tenant_abc123xyz');
    expect(result).toBe('hak_***3xyz');
  });

  it('should handle short API keys', () => {
    const result = maskApiKey('short');
    expect(result).toBe('***');
  });

  it('should handle empty string', () => {
    const result = maskApiKey('');
    expect(result).toBe('***');
  });

  it('should handle minimum length key', () => {
    const result = maskApiKey('hak_1234');
    expect(result).toBe('hak_***1234');
  });
});

describe('maskEmail', () => {
  it('should mask email showing first char and domain', () => {
    const result = maskEmail('user@example.com');
    expect(result).toBe('u***@example.com');
  });

  it('should handle email without @', () => {
    const result = maskEmail('invalid-email');
    expect(result).toBe('***');
  });

  it('should handle email starting with @', () => {
    const result = maskEmail('@example.com');
    expect(result).toBe('***');
  });

  it('should handle long usernames', () => {
    const result = maskEmail('verylongusername@company.com');
    expect(result).toBe('v***@company.com');
  });
});
