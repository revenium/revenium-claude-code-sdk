import { describe, it, expect } from 'vitest';
import { generateTransactionId, type TransactionIdComponents } from '../../src/utils/hashing.js';

describe('generateTransactionId', () => {
  const baseComponents: TransactionIdComponents = {
    sessionId: '5345477c-26de-46ed-8eb1-d1deea0ee61f',
    timestamp: '2026-01-13T15:15:09.790Z',
    model: 'claude-opus-4-5-20251101',
    inputTokens: 100,
    outputTokens: 50,
    cacheReadTokens: 1000,
    cacheCreationTokens: 500,
  };

  it('should generate a 32-character hex string', () => {
    const result = generateTransactionId(baseComponents);
    expect(result).toHaveLength(32);
    expect(result).toMatch(/^[0-9a-f]{32}$/);
  });

  it('should be deterministic (same input produces same output)', () => {
    const result1 = generateTransactionId(baseComponents);
    const result2 = generateTransactionId(baseComponents);
    const result3 = generateTransactionId({ ...baseComponents });
    expect(result1).toBe(result2);
    expect(result1).toBe(result3);
  });

  it('should produce different outputs for different inputs', () => {
    const result1 = generateTransactionId(baseComponents);
    const result2 = generateTransactionId({
      ...baseComponents,
      inputTokens: 101,
    });
    expect(result1).not.toBe(result2);
  });

  it('should be sensitive to sessionId changes', () => {
    const result1 = generateTransactionId(baseComponents);
    const result2 = generateTransactionId({
      ...baseComponents,
      sessionId: 'different-session-id',
    });
    expect(result1).not.toBe(result2);
  });

  it('should be sensitive to timestamp changes', () => {
    const result1 = generateTransactionId(baseComponents);
    const result2 = generateTransactionId({
      ...baseComponents,
      timestamp: '2026-01-13T15:15:09.791Z',
    });
    expect(result1).not.toBe(result2);
  });

  it('should be sensitive to model changes', () => {
    const result1 = generateTransactionId(baseComponents);
    const result2 = generateTransactionId({
      ...baseComponents,
      model: 'claude-sonnet-4-20250514',
    });
    expect(result1).not.toBe(result2);
  });

  it('should handle zero token values', () => {
    const zeroTokenComponents: TransactionIdComponents = {
      sessionId: 'test-session',
      timestamp: '2026-01-01T00:00:00.000Z',
      model: 'test-model',
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
    };
    const result = generateTransactionId(zeroTokenComponents);
    expect(result).toHaveLength(32);
    expect(result).toMatch(/^[0-9a-f]{32}$/);
  });

  it('should handle large token values', () => {
    const largeTokenComponents: TransactionIdComponents = {
      ...baseComponents,
      inputTokens: 1000000,
      outputTokens: 500000,
      cacheReadTokens: 10000000,
      cacheCreationTokens: 5000000,
    };
    const result = generateTransactionId(largeTokenComponents);
    expect(result).toHaveLength(32);
    expect(result).toMatch(/^[0-9a-f]{32}$/);
  });

  /**
   * CROSS-IMPLEMENTATION VERIFICATION TEST
   *
   * This test vector must produce the same hash in both:
   * - TypeScript (this implementation)
   * - Kotlin (ClaudeCodeMapper.kt in the backend)
   *
   * If you change the hash formula, update both implementations
   * and regenerate this expected value.
   */
  it('should produce known hash for test vector (cross-implementation verification)', () => {
    const testVector: TransactionIdComponents = {
      sessionId: '5345477c-26de-46ed-8eb1-d1deea0ee61f',
      timestamp: '2026-01-13T15:15:09.790Z',
      model: 'claude-opus-4-5-20251101',
      inputTokens: 100,
      outputTokens: 50,
      cacheReadTokens: 1000,
      cacheCreationTokens: 500,
    };

    const result = generateTransactionId(testVector);

    // This is the expected hash for the above input.
    // The Kotlin implementation must produce the same value.
    // Input string: "5345477c-26de-46ed-8eb1-d1deea0ee61f|2026-01-13T15:15:09.790Z|claude-opus-4-5-20251101|100|50|1000|500"
    expect(result).toBe('a4ae0241320cd35508c022af01424382');
  });
});
