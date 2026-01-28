import { createHash } from 'node:crypto';

export interface TransactionIdComponents {
  sessionId: string;
  timestamp: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

/**
 * Generates a deterministic transaction ID from record components.
 * Uses SHA-256 hash truncated to 32 hex characters.
 *
 * IMPORTANT: This formula must match ClaudeCodeMapper.kt in the backend.
 * Format: sessionId|timestamp|model|input|output|cacheRead|cacheCreation
 */
export function generateTransactionId(components: TransactionIdComponents): string {
  const input = [
    components.sessionId,
    components.timestamp,
    components.model,
    components.inputTokens,
    components.outputTokens,
    components.cacheReadTokens,
    components.cacheCreationTokens,
  ].join('|');

  return createHash('sha256')
    .update(input)
    .digest('hex')
    .substring(0, 32);
}
