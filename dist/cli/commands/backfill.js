"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = sleep;
exports.sanitizeErrorMessage = sanitizeErrorMessage;
exports.isRetryableError = isRetryableError;
exports.sendBatchWithRetry = sendBatchWithRetry;
exports.parseRelativeDate = parseRelativeDate;
exports.parseSinceDate = parseSinceDate;
exports.findJsonlFiles = findJsonlFiles;
exports.calculateStatistics = calculateStatistics;
exports.parseJsonlLine = parseJsonlLine;
exports.streamJsonlRecords = streamJsonlRecords;
exports.toUnixNano = toUnixNano;
exports.createOtlpPayload = createOtlpPayload;
exports.backfillCommand = backfillCommand;
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_readline_1 = require("node:readline");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const loader_js_1 = require("../../core/config/loader.js");
const client_js_1 = require("../../core/api/client.js");
const constants_js_1 = require("../../utils/constants.js");
const hashing_js_1 = require("../../utils/hashing.js");
/**
 * Sleep for a specified number of milliseconds.
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Sanitize error message to prevent API key leakage.
 * Truncates long messages and removes potential sensitive data.
 */
function sanitizeErrorMessage(errorMsg) {
    const maxLength = 500;
    let sanitized = errorMsg;
    if (sanitized.length > maxLength) {
        sanitized = `${sanitized.substring(0, maxLength)}...`;
    }
    return sanitized;
}
/**
 * Check if an error is retryable based on HTTP status code.
 * 4xx errors (except 429) are not retryable as they indicate client errors.
 */
function isRetryableError(errorMsg) {
    const statusMatch = errorMsg.match(/OTLP request failed: (\d{3})/);
    if (!statusMatch) {
        return true;
    }
    const statusCode = parseInt(statusMatch[1], 10);
    if (statusCode === 429) {
        return true;
    }
    if (statusCode >= 400 && statusCode < 500) {
        return false;
    }
    return true;
}
/**
 * Send a batch with retry logic and exponential backoff.
 */
async function sendBatchWithRetry(endpoint, apiKey, payload, maxRetries, verbose) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            await (0, client_js_1.sendOtlpLogs)(endpoint, apiKey, payload);
            if (verbose && attempt > 0) {
                console.log(chalk_1.default.green(`  ✓ Succeeded after ${attempt + 1} attempts`));
            }
            return { success: true, attempts: attempt + 1 };
        }
        catch (error) {
            const rawErrorMsg = error instanceof Error ? error.message : "Unknown error";
            const errorMsg = sanitizeErrorMessage(rawErrorMsg);
            const isRetryable = isRetryableError(errorMsg);
            if (!isRetryable) {
                if (verbose) {
                    console.log(chalk_1.default.red(`  ✗ Non-retryable error (client error): ${errorMsg}`));
                }
                return { success: false, attempts: attempt + 1, error: errorMsg };
            }
            if (attempt < maxRetries - 1) {
                const backoffDelay = 1000 * Math.pow(2, attempt);
                if (verbose) {
                    console.log(chalk_1.default.yellow(`  ✗ Attempt ${attempt + 1} failed: ${errorMsg}`));
                    console.log(chalk_1.default.blue(`  ⏳ Retrying in ${backoffDelay}ms...`));
                }
                await sleep(backoffDelay);
            }
            else {
                if (verbose) {
                    console.log(chalk_1.default.red(`  ✗ All ${maxRetries} attempts failed`));
                }
                return { success: false, attempts: maxRetries, error: errorMsg };
            }
        }
    }
    return { success: false, attempts: maxRetries };
}
/**
 * Parses a relative date string like "7d" or "1m" into a Date.
 */
function parseRelativeDate(input) {
    const match = input.match(/^(\d+)([dmwMy])$/);
    if (!match)
        return null;
    const amount = parseInt(match[1], 10);
    const unit = match[2];
    const now = new Date();
    switch (unit) {
        case "d":
            now.setDate(now.getDate() - amount);
            break;
        case "w":
            now.setDate(now.getDate() - amount * 7);
            break;
        case "m":
            now.setMonth(now.getMonth() - amount);
            break;
        case "M":
            now.setMonth(now.getMonth() - amount);
            break;
        case "y":
            now.setFullYear(now.getFullYear() - amount);
            break;
        default:
            return null;
    }
    return now;
}
/**
 * Parses the --since option into a Date.
 */
function parseSinceDate(since) {
    // Try relative format first
    const relativeDate = parseRelativeDate(since);
    if (relativeDate)
        return relativeDate;
    // Try ISO format
    const isoDate = new Date(since);
    if (!isNaN(isoDate.getTime()))
        return isoDate;
    return null;
}
/**
 * Recursively finds all .jsonl files in a directory.
 * Returns an object with found files and any errors encountered.
 */
async function findJsonlFiles(dir, errors = []) {
    const files = [];
    try {
        const entries = await (0, promises_1.readdir)(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = (0, node_path_1.join)(dir, entry.name);
            if (entry.isDirectory()) {
                const result = await findJsonlFiles(fullPath, errors);
                files.push(...result.files);
            }
            else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
                files.push(fullPath);
            }
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${dir}: ${message}`);
    }
    return { files, errors };
}
function calculateStatistics(records) {
    if (records.length === 0) {
        return {
            totalRecords: 0,
            oldestTimestamp: "",
            newestTimestamp: "",
            totalInputTokens: 0,
            totalOutputTokens: 0,
            totalCacheReadTokens: 0,
            totalCacheCreationTokens: 0,
        };
    }
    const sortedRecords = [...records].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return {
        totalRecords: records.length,
        oldestTimestamp: sortedRecords[0].timestamp,
        newestTimestamp: sortedRecords[sortedRecords.length - 1].timestamp,
        totalInputTokens: records.reduce((sum, r) => sum + r.inputTokens, 0),
        totalOutputTokens: records.reduce((sum, r) => sum + r.outputTokens, 0),
        totalCacheReadTokens: records.reduce((sum, r) => sum + r.cacheReadTokens, 0),
        totalCacheCreationTokens: records.reduce((sum, r) => sum + r.cacheCreationTokens, 0),
    };
}
function parseJsonlLine(line, sinceDate) {
    if (!line.trim()) {
        return {};
    }
    let entry;
    try {
        entry = JSON.parse(line);
    }
    catch {
        return { parseError: true };
    }
    if (entry.type !== "assistant" || !entry.message?.usage) {
        return {};
    }
    const usage = entry.message.usage;
    const timestamp = entry.timestamp;
    const sessionId = entry.sessionId;
    const model = entry.message.model;
    if (!timestamp || !sessionId || !model) {
        return { missingFields: true };
    }
    const entryDate = new Date(timestamp);
    if (!Number.isFinite(entryDate.getTime())) {
        return {};
    }
    if (sinceDate && entryDate < sinceDate) {
        return {};
    }
    const totalTokens = (usage.input_tokens || 0) +
        (usage.output_tokens || 0) +
        (usage.cache_read_input_tokens || 0) +
        (usage.cache_creation_input_tokens || 0);
    if (totalTokens === 0) {
        return {};
    }
    return {
        record: {
            sessionId,
            timestamp,
            model,
            inputTokens: usage.input_tokens || 0,
            outputTokens: usage.output_tokens || 0,
            cacheReadTokens: usage.cache_read_input_tokens || 0,
            cacheCreationTokens: usage.cache_creation_input_tokens || 0,
        },
    };
}
/**
 * Streams a JSONL file and extracts records with usage data.
 * Yields objects indicating either a valid record or a parse error.
 */
async function* streamJsonlRecords(filePath, sinceDate) {
    const fileStream = (0, node_fs_1.createReadStream)(filePath);
    const rl = (0, node_readline_1.createInterface)({
        input: fileStream,
        crlfDelay: Infinity,
    });
    try {
        for await (const line of rl) {
            const result = parseJsonlLine(line, sinceDate);
            if (result.record || result.parseError || result.missingFields) {
                yield result;
            }
        }
    }
    finally {
        fileStream.destroy();
        rl.close();
    }
}
/**
 * Converts a timestamp to nanoseconds since Unix epoch.
 * Returns null if the timestamp is invalid.
 */
function toUnixNano(timestamp) {
    const date = new Date(timestamp);
    const ms = date.getTime();
    if (!Number.isFinite(ms)) {
        return null;
    }
    return (BigInt(ms) * BigInt(1_000_000)).toString();
}
function createOtlpPayload(records, options) {
    const { costMultiplier, email, organizationName, organizationId, productName, productId, } = options;
    // Support both new and old field names with fallback
    const organizationValue = organizationName || organizationId;
    const productValue = productName || productId;
    // Filter and map records, skipping any with invalid timestamps
    const logRecords = records
        .map((record) => {
        const timeUnixNano = toUnixNano(record.timestamp);
        if (timeUnixNano === null) {
            return null;
        }
        // Build attributes array with required fields
        const attributes = [
            {
                key: "transaction_id",
                value: { stringValue: (0, hashing_js_1.generateTransactionId)(record) },
            },
            {
                key: "session.id",
                value: { stringValue: record.sessionId },
            },
            {
                key: "model",
                value: { stringValue: record.model },
            },
            {
                key: "input_tokens",
                value: { intValue: record.inputTokens },
            },
            {
                key: "output_tokens",
                value: { intValue: record.outputTokens },
            },
            {
                key: "cache_read_tokens",
                value: { intValue: record.cacheReadTokens },
            },
            {
                key: "cache_creation_tokens",
                value: { intValue: record.cacheCreationTokens },
            },
        ];
        // Add optional subscriber/attribution attributes at log record level
        // (backend ClaudeCodeMapper reads these from log record attrs, not resource attrs)
        if (email) {
            attributes.push({ key: "user.email", value: { stringValue: email } });
        }
        if (organizationValue) {
            attributes.push({
                key: "organization.name",
                value: { stringValue: organizationValue },
            });
        }
        if (productValue) {
            attributes.push({
                key: "product.name",
                value: { stringValue: productValue },
            });
        }
        return {
            timeUnixNano,
            body: { stringValue: "claude_code.api_request" },
            attributes,
        };
    })
        .filter((record) => record !== null);
    return {
        resourceLogs: [
            {
                resource: {
                    attributes: [
                        {
                            key: "service.name",
                            value: { stringValue: "claude-code" },
                        },
                        {
                            key: "cost_multiplier",
                            value: { doubleValue: costMultiplier },
                        },
                    ],
                },
                scopeLogs: [
                    {
                        scope: {
                            name: "claude-code",
                            version: "1.0.0",
                        },
                        logRecords,
                    },
                ],
            },
        ],
    };
}
/**
 * Backfill command - imports historical Claude Code usage data.
 */
async function backfillCommand(options = {}, deps = {}) {
    const { since, dryRun = false, batchSize = 100, delay = 100, verbose = false, } = options;
    const { loadConfig: getConfig = loader_js_1.loadConfig, findJsonlFiles: findFiles = findJsonlFiles, streamJsonlRecords: streamRecords = streamJsonlRecords, sendBatchWithRetry: sendBatch = sendBatchWithRetry, homedir: getHomedir = node_os_1.homedir, } = deps;
    console.log(chalk_1.default.bold("\nRevenium Claude Code Backfill\n"));
    if (dryRun) {
        console.log(chalk_1.default.yellow("Running in dry-run mode - no data will be sent\n"));
    }
    // Load configuration
    const config = await getConfig();
    if (!config) {
        console.log(chalk_1.default.red("Configuration not found"));
        console.log(chalk_1.default.yellow("\nRun `revenium-metering setup` to configure Claude Code metering."));
        process.exit(1);
    }
    // Parse since date
    let sinceDate = null;
    if (since) {
        sinceDate = parseSinceDate(since);
        if (!sinceDate) {
            console.log(chalk_1.default.red(`Invalid --since value: ${since}`));
            console.log(chalk_1.default.dim("Use ISO format (2024-01-15) or relative format (7d, 1m, 1y)"));
            process.exit(1);
        }
        console.log(chalk_1.default.dim(`Filtering records since: ${sinceDate.toISOString()}\n`));
    }
    // Get cost multiplier (use ?? to allow explicit 0 override for free tier/testing)
    const costMultiplier = config.costMultiplierOverride ??
        (config.subscriptionTier
            ? (0, constants_js_1.getCostMultiplier)(config.subscriptionTier)
            : 0.08);
    // Discover JSONL files
    const projectsDir = (0, node_path_1.join)(getHomedir(), ".claude", "projects");
    const discoverSpinner = (0, ora_1.default)("Discovering JSONL files...").start();
    const { files: jsonlFiles, errors: discoveryErrors } = await findFiles(projectsDir);
    if (discoveryErrors.length > 0 && verbose) {
        discoverSpinner.warn(`Found ${jsonlFiles.length} JSONL file(s) with ${discoveryErrors.length} directory error(s)`);
        console.log(chalk_1.default.yellow("\nDirectory access errors:"));
        for (const error of discoveryErrors.slice(0, 5)) {
            console.log(chalk_1.default.yellow(`  ${error}`));
        }
        if (discoveryErrors.length > 5) {
            console.log(chalk_1.default.yellow(`  ... and ${discoveryErrors.length - 5} more`));
        }
    }
    else if (jsonlFiles.length === 0) {
        discoverSpinner.fail("No JSONL files found");
        console.log(chalk_1.default.dim(`Searched in: ${projectsDir}`));
        if (discoveryErrors.length > 0) {
            console.log(chalk_1.default.yellow("\nDirectory access errors:"));
            for (const error of discoveryErrors) {
                console.log(chalk_1.default.yellow(`  ${error}`));
            }
        }
        process.exit(1);
    }
    else {
        discoverSpinner.succeed(`Found ${jsonlFiles.length} JSONL file(s)`);
    }
    if (verbose) {
        console.log(chalk_1.default.dim("\nFiles:"));
        for (const file of jsonlFiles.slice(0, 10)) {
            console.log(chalk_1.default.dim(`  ${file}`));
        }
        if (jsonlFiles.length > 10) {
            console.log(chalk_1.default.dim(`  ... and ${jsonlFiles.length - 10} more`));
        }
        console.log("");
    }
    // Process files and collect records
    const processSpinner = (0, ora_1.default)("Processing files...").start();
    const allRecords = [];
    let processedFiles = 0;
    let skippedLines = 0;
    let skippedFiles = 0;
    let skippedMissingFields = 0;
    for (const file of jsonlFiles) {
        try {
            for await (const result of streamRecords(file, sinceDate)) {
                if (result.parseError) {
                    skippedLines++;
                }
                else if (result.missingFields) {
                    skippedMissingFields++;
                }
                else if (result.record) {
                    allRecords.push(result.record);
                }
            }
            processedFiles++;
            processSpinner.text = `Processing files... (${processedFiles}/${jsonlFiles.length})`;
        }
        catch (error) {
            skippedFiles++;
            if (verbose) {
                const message = error instanceof Error ? error.message : String(error);
                console.log(chalk_1.default.yellow(`\nWarning: Could not process ${file}: ${message}`));
            }
        }
    }
    // Build status message with skipped line info
    let statusMessage = `Processed ${processedFiles} files, found ${allRecords.length} usage records`;
    if (skippedLines > 0) {
        statusMessage += chalk_1.default.yellow(` (${skippedLines} malformed line${skippedLines > 1 ? "s" : ""} skipped)`);
    }
    if (skippedMissingFields > 0) {
        statusMessage += chalk_1.default.yellow(` (${skippedMissingFields} record${skippedMissingFields > 1 ? "s" : ""} missing required fields)`);
    }
    if (skippedFiles > 0) {
        statusMessage += chalk_1.default.yellow(` (${skippedFiles} file${skippedFiles > 1 ? "s" : ""} failed)`);
    }
    processSpinner.succeed(statusMessage);
    if (allRecords.length === 0) {
        console.log(chalk_1.default.yellow("\nNo usage records found to backfill."));
        if (skippedMissingFields > 0) {
            console.log(chalk_1.default.dim(`${skippedMissingFields} record${skippedMissingFields > 1 ? "s were" : " was"} skipped due to missing required fields (timestamp, sessionId, or model).`));
        }
        if (since) {
            console.log(chalk_1.default.dim(`Try a broader date range or remove the --since filter.`));
        }
        return;
    }
    // Calculate statistics
    const stats = calculateStatistics(allRecords);
    console.log("\n" + chalk_1.default.bold("Summary:"));
    console.log(`  Records:              ${stats.totalRecords.toLocaleString()}`);
    console.log(`  Date range:           ${stats.oldestTimestamp.split("T")[0]} to ${stats.newestTimestamp.split("T")[0]}`);
    console.log(`  Input tokens:         ${stats.totalInputTokens.toLocaleString()}`);
    console.log(`  Output tokens:        ${stats.totalOutputTokens.toLocaleString()}`);
    console.log(`  Cache read tokens:    ${stats.totalCacheReadTokens.toLocaleString()}`);
    console.log(`  Cache creation:       ${stats.totalCacheCreationTokens.toLocaleString()}`);
    console.log(`  Cost multiplier:      ${costMultiplier}`);
    if (verbose &&
        (skippedLines > 0 || skippedMissingFields > 0 || skippedFiles > 0)) {
        console.log("\n" + chalk_1.default.dim("Skipped records:"));
        if (skippedLines > 0) {
            console.log(chalk_1.default.dim(`  Malformed JSON:       ${skippedLines.toLocaleString()}`));
        }
        if (skippedMissingFields > 0) {
            console.log(chalk_1.default.dim(`  Missing fields:       ${skippedMissingFields.toLocaleString()} (timestamp, sessionId, or model)`));
        }
        if (skippedFiles > 0) {
            console.log(chalk_1.default.dim(`  Failed files:         ${skippedFiles.toLocaleString()}`));
        }
    }
    if (dryRun) {
        console.log("\n" +
            chalk_1.default.yellow("Dry run complete. Use without --dry-run to send data."));
        if (verbose) {
            console.log("\n" + chalk_1.default.dim("Sample OTLP payload (first batch):"));
            const sampleRecords = allRecords.slice(0, Math.min(batchSize, 3));
            const samplePayload = createOtlpPayload(sampleRecords, {
                costMultiplier,
                email: config.email,
                organizationName: config.organizationName || config.organizationId,
                productName: config.productName || config.productId,
            });
            console.log(chalk_1.default.dim(JSON.stringify(samplePayload, null, 2)));
        }
        return;
    }
    // Send data in batches
    const totalBatches = Math.ceil(allRecords.length / batchSize);
    const sendSpinner = (0, ora_1.default)(`Sending data... (0/${totalBatches} batches, ~${delay}ms delay)`).start();
    let sentBatches = 0;
    let sentRecords = 0;
    let permanentlyFailedBatches = 0;
    let totalRetryAttempts = 0;
    const failedBatchDetails = [];
    const maxRetries = 3;
    for (let i = 0; i < allRecords.length; i += batchSize) {
        const batchNumber = Math.floor(i / batchSize) + 1;
        const batch = allRecords.slice(i, i + batchSize);
        const payload = createOtlpPayload(batch, {
            costMultiplier,
            email: config.email,
            organizationName: config.organizationName || config.organizationId,
            productName: config.productName || config.productId,
        });
        sendSpinner.text = `Sending batch ${batchNumber}/${totalBatches}...`;
        const result = await sendBatch(config.endpoint, config.apiKey, payload, maxRetries, verbose);
        totalRetryAttempts += result.attempts;
        if (result.success) {
            sentBatches++;
            sentRecords += batch.length;
            sendSpinner.text = `Sending data... (${sentBatches}/${totalBatches} batches, ~${delay}ms delay)`;
        }
        else {
            permanentlyFailedBatches++;
            failedBatchDetails.push({
                batchNumber,
                error: result.error || "Unknown error",
            });
        }
        // Apply rate limiting delay between batches (except after the last batch)
        if (i + batchSize < allRecords.length) {
            sendSpinner.text = `Waiting ${delay}ms before next batch...`;
            await sleep(delay);
        }
    }
    if (permanentlyFailedBatches === 0) {
        sendSpinner.succeed(`Sent ${sentRecords.toLocaleString()} records in ${sentBatches} batches`);
    }
    else {
        sendSpinner.warn(`Sent ${sentRecords.toLocaleString()} records in ${sentBatches} batches (${permanentlyFailedBatches} permanently failed)`);
    }
    // Show retry statistics if there were retries
    const retriedBatches = totalRetryAttempts - totalBatches;
    if (retriedBatches > 0 && verbose) {
        console.log("\n" + chalk_1.default.bold("Retry Statistics:"));
        console.log(`  Total retry attempts:     ${retriedBatches}`);
        console.log(`  Average attempts/batch:   ${(totalRetryAttempts / totalBatches).toFixed(2)}`);
    }
    // Show permanently failed batches details
    if (permanentlyFailedBatches > 0) {
        console.log("\n" + chalk_1.default.red.bold("Permanently Failed Batches:"));
        for (const failed of failedBatchDetails) {
            console.log(chalk_1.default.red(`  Batch ${failed.batchNumber}: ${failed.error}`));
        }
        console.log("\n" +
            chalk_1.default.yellow("Tip: You can re-run the backfill command to retry failed batches."));
    }
    console.log("\n" + chalk_1.default.green.bold("Backfill complete!"));
    console.log(chalk_1.default.dim("Check your Revenium dashboard to see the imported data."));
}
//# sourceMappingURL=backfill.js.map