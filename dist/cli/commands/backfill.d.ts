import { homedir } from "node:os";
import { loadConfig } from "../../core/config/loader.js";
import type { OTLPLogsPayload } from "../../types/index.js";
export interface BackfillOptions {
    since?: string;
    dryRun?: boolean;
    batchSize?: number;
    delay?: number;
    verbose?: boolean;
}
export interface BackfillDependencies {
    loadConfig: typeof loadConfig;
    findJsonlFiles: typeof findJsonlFiles;
    streamJsonlRecords: typeof streamJsonlRecords;
    sendBatchWithRetry: typeof sendBatchWithRetry;
    homedir: typeof homedir;
}
interface ParsedRecord {
    sessionId: string;
    timestamp: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
}
interface RetryResult {
    success: boolean;
    attempts: number;
    error?: string;
}
/**
 * Sleep for a specified number of milliseconds.
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Sanitize error message to prevent API key leakage.
 * Truncates long messages and removes potential sensitive data.
 */
export declare function sanitizeErrorMessage(errorMsg: string): string;
/**
 * Check if an error is retryable based on HTTP status code.
 * 4xx errors (except 429) are not retryable as they indicate client errors.
 */
export declare function isRetryableError(errorMsg: string): boolean;
/**
 * Send a batch with retry logic and exponential backoff.
 */
export declare function sendBatchWithRetry(endpoint: string, apiKey: string, payload: OTLPLogsPayload, maxRetries: number, verbose: boolean): Promise<RetryResult>;
/**
 * Parses a relative date string like "7d" or "1m" into a Date.
 */
export declare function parseRelativeDate(input: string): Date | null;
/**
 * Parses the --since option into a Date.
 */
export declare function parseSinceDate(since: string): Date | null;
/**
 * Recursively finds all .jsonl files in a directory.
 * Returns an object with found files and any errors encountered.
 */
export declare function findJsonlFiles(dir: string, errors?: string[]): Promise<{
    files: string[];
    errors: string[];
}>;
interface StreamResult {
    record?: ParsedRecord;
    parseError?: boolean;
    missingFields?: boolean;
}
export interface RecordStatistics {
    totalRecords: number;
    oldestTimestamp: string;
    newestTimestamp: string;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCacheReadTokens: number;
    totalCacheCreationTokens: number;
}
export declare function calculateStatistics(records: ParsedRecord[]): RecordStatistics;
export declare function parseJsonlLine(line: string, sinceDate: Date | null): StreamResult;
/**
 * Streams a JSONL file and extracts records with usage data.
 * Yields objects indicating either a valid record or a parse error.
 */
export declare function streamJsonlRecords(filePath: string, sinceDate: Date | null): AsyncGenerator<StreamResult>;
/**
 * Converts a timestamp to nanoseconds since Unix epoch.
 * Returns null if the timestamp is invalid.
 */
export declare function toUnixNano(timestamp: string): string | null;
/**
 * Creates an OTLP logs payload from parsed records.
 * Filters out records with invalid timestamps as a safety measure.
 */
export interface PayloadOptions {
    costMultiplier: number;
    email?: string;
    organizationName?: string;
    /**
     * @deprecated Use organizationName instead. This field will be removed in a future version.
     */
    organizationId?: string;
    productName?: string;
    /**
     * @deprecated Use productName instead. This field will be removed in a future version.
     */
    productId?: string;
}
export declare function createOtlpPayload(records: ParsedRecord[], options: PayloadOptions): OTLPLogsPayload;
/**
 * Backfill command - imports historical Claude Code usage data.
 */
export declare function backfillCommand(options?: BackfillOptions, deps?: Partial<BackfillDependencies>): Promise<void>;
export {};
//# sourceMappingURL=backfill.d.ts.map