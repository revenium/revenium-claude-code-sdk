"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTransactionId = generateTransactionId;
const node_crypto_1 = require("node:crypto");
/**
 * Generates a deterministic transaction ID from record components.
 * Uses SHA-256 hash truncated to 32 hex characters.
 *
 * IMPORTANT: This formula must match ClaudeCodeMapper.kt in the backend.
 * Format: sessionId|timestamp|model|input|output|cacheRead|cacheCreation
 */
function generateTransactionId(components) {
    const input = [
        components.sessionId,
        components.timestamp,
        components.model,
        components.inputTokens,
        components.outputTokens,
        components.cacheReadTokens,
        components.cacheCreationTokens,
    ].join('|');
    return (0, node_crypto_1.createHash)('sha256')
        .update(input)
        .digest('hex')
        .substring(0, 32);
}
//# sourceMappingURL=hashing.js.map