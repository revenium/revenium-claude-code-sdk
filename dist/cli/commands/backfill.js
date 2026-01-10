"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
        case 'd':
            now.setDate(now.getDate() - amount);
            break;
        case 'w':
            now.setDate(now.getDate() - amount * 7);
            break;
        case 'm':
            now.setMonth(now.getMonth() - amount);
            break;
        case 'M':
            now.setMonth(now.getMonth() - amount);
            break;
        case 'y':
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
            else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
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
            if (!line.trim())
                continue;
            try {
                const entry = JSON.parse(line);
                // Only process assistant messages with usage data
                if (entry.type !== 'assistant' || !entry.message?.usage)
                    continue;
                const usage = entry.message.usage;
                const timestamp = entry.timestamp;
                const sessionId = entry.sessionId;
                const model = entry.message.model;
                // Skip if missing required fields
                if (!timestamp || !sessionId || !model)
                    continue;
                // Validate timestamp is a valid date
                const entryDate = new Date(timestamp);
                if (!Number.isFinite(entryDate.getTime()))
                    continue;
                // Check date filter
                if (sinceDate) {
                    if (entryDate < sinceDate)
                        continue;
                }
                // Skip entries with no actual token usage
                const totalTokens = (usage.input_tokens || 0) +
                    (usage.output_tokens || 0) +
                    (usage.cache_read_input_tokens || 0) +
                    (usage.cache_creation_input_tokens || 0);
                if (totalTokens === 0)
                    continue;
                yield {
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
            catch {
                // Invalid JSON line, signal parse error
                yield { parseError: true };
            }
        }
    }
    finally {
        // Ensure file stream is properly closed even on early exit
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
/**
 * Creates an OTEL metrics payload from parsed records.
 * Each record generates multiple metrics (input_tokens, output_tokens, etc.)
 */
function createOtlpPayload(records, costMultiplier) {
    // Build metrics for all records
    const allMetrics = [];
    for (const record of records) {
        const timeUnixNano = toUnixNano(record.timestamp);
        if (timeUnixNano === null)
            continue;
        // Common attributes for this record
        const attributes = [
            { key: 'ai.transaction_id', value: { stringValue: record.sessionId } },
            { key: 'ai.model', value: { stringValue: record.model } },
            { key: 'ai.provider', value: { stringValue: 'anthropic' } },
            { key: 'cost_multiplier', value: { doubleValue: costMultiplier } },
        ];
        // Create metrics for each token type
        const tokenMetrics = [
            { name: 'ai.tokens.input', value: record.inputTokens },
            { name: 'ai.tokens.output', value: record.outputTokens },
            { name: 'ai.tokens.cache_read', value: record.cacheReadTokens },
            { name: 'ai.tokens.cache_creation', value: record.cacheCreationTokens },
        ];
        for (const metric of tokenMetrics) {
            allMetrics.push({
                name: metric.name,
                sum: {
                    dataPoints: [{
                            attributes,
                            timeUnixNano,
                            asInt: metric.value,
                        }],
                },
            });
        }
    }
    return {
        resourceMetrics: [
            {
                resource: {
                    attributes: [
                        { key: 'service.name', value: { stringValue: 'claude-code' } },
                    ],
                },
                scopeMetrics: [
                    {
                        metrics: allMetrics,
                    },
                ],
            },
        ],
    };
}
/**
 * Backfill command - imports historical Claude Code usage data.
 */
async function backfillCommand(options = {}) {
    const { since, dryRun = false, batchSize = 100, verbose = false } = options;
    console.log(chalk_1.default.bold('\nRevenium Claude Code Backfill\n'));
    if (dryRun) {
        console.log(chalk_1.default.yellow('Running in dry-run mode - no data will be sent\n'));
    }
    // Load configuration
    const config = await (0, loader_js_1.loadConfig)();
    if (!config) {
        console.log(chalk_1.default.red('Configuration not found'));
        console.log(chalk_1.default.yellow('\nRun `revenium-metering setup` to configure Claude Code metering.'));
        process.exit(1);
    }
    // Parse since date
    let sinceDate = null;
    if (since) {
        sinceDate = parseSinceDate(since);
        if (!sinceDate) {
            console.log(chalk_1.default.red(`Invalid --since value: ${since}`));
            console.log(chalk_1.default.dim('Use ISO format (2024-01-15) or relative format (7d, 1m, 1y)'));
            process.exit(1);
        }
        console.log(chalk_1.default.dim(`Filtering records since: ${sinceDate.toISOString()}\n`));
    }
    // Get cost multiplier (use ?? to allow explicit 0 override for free tier/testing)
    const costMultiplier = config.costMultiplierOverride ??
        (config.subscriptionTier ? (0, constants_js_1.getCostMultiplier)(config.subscriptionTier) : 0.08);
    // Discover JSONL files
    const projectsDir = (0, node_path_1.join)((0, node_os_1.homedir)(), '.claude', 'projects');
    const discoverSpinner = (0, ora_1.default)('Discovering JSONL files...').start();
    const { files: jsonlFiles, errors: discoveryErrors } = await findJsonlFiles(projectsDir);
    if (discoveryErrors.length > 0 && verbose) {
        discoverSpinner.warn(`Found ${jsonlFiles.length} JSONL file(s) with ${discoveryErrors.length} directory error(s)`);
        console.log(chalk_1.default.yellow('\nDirectory access errors:'));
        for (const error of discoveryErrors.slice(0, 5)) {
            console.log(chalk_1.default.yellow(`  ${error}`));
        }
        if (discoveryErrors.length > 5) {
            console.log(chalk_1.default.yellow(`  ... and ${discoveryErrors.length - 5} more`));
        }
    }
    else if (jsonlFiles.length === 0) {
        discoverSpinner.fail('No JSONL files found');
        console.log(chalk_1.default.dim(`Searched in: ${projectsDir}`));
        if (discoveryErrors.length > 0) {
            console.log(chalk_1.default.yellow('\nDirectory access errors:'));
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
        console.log(chalk_1.default.dim('\nFiles:'));
        for (const file of jsonlFiles.slice(0, 10)) {
            console.log(chalk_1.default.dim(`  ${file}`));
        }
        if (jsonlFiles.length > 10) {
            console.log(chalk_1.default.dim(`  ... and ${jsonlFiles.length - 10} more`));
        }
        console.log('');
    }
    // Process files and collect records
    const processSpinner = (0, ora_1.default)('Processing files...').start();
    const allRecords = [];
    let processedFiles = 0;
    let skippedLines = 0;
    let skippedFiles = 0;
    for (const file of jsonlFiles) {
        try {
            for await (const result of streamJsonlRecords(file, sinceDate)) {
                if (result.parseError) {
                    skippedLines++;
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
        statusMessage += chalk_1.default.yellow(` (${skippedLines} malformed line${skippedLines > 1 ? 's' : ''} skipped)`);
    }
    if (skippedFiles > 0) {
        statusMessage += chalk_1.default.yellow(` (${skippedFiles} file${skippedFiles > 1 ? 's' : ''} failed)`);
    }
    processSpinner.succeed(statusMessage);
    if (allRecords.length === 0) {
        console.log(chalk_1.default.yellow('\nNo usage records found to backfill.'));
        if (since) {
            console.log(chalk_1.default.dim(`Try a broader date range or remove the --since filter.`));
        }
        return;
    }
    // Sort records by timestamp
    allRecords.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    // Show summary
    const oldestRecord = allRecords[0];
    const newestRecord = allRecords[allRecords.length - 1];
    const totalInputTokens = allRecords.reduce((sum, r) => sum + r.inputTokens, 0);
    const totalOutputTokens = allRecords.reduce((sum, r) => sum + r.outputTokens, 0);
    const totalCacheReadTokens = allRecords.reduce((sum, r) => sum + r.cacheReadTokens, 0);
    const totalCacheCreationTokens = allRecords.reduce((sum, r) => sum + r.cacheCreationTokens, 0);
    console.log('\n' + chalk_1.default.bold('Summary:'));
    console.log(`  Records:              ${allRecords.length.toLocaleString()}`);
    console.log(`  Date range:           ${oldestRecord.timestamp.split('T')[0]} to ${newestRecord.timestamp.split('T')[0]}`);
    console.log(`  Input tokens:         ${totalInputTokens.toLocaleString()}`);
    console.log(`  Output tokens:        ${totalOutputTokens.toLocaleString()}`);
    console.log(`  Cache read tokens:    ${totalCacheReadTokens.toLocaleString()}`);
    console.log(`  Cache creation:       ${totalCacheCreationTokens.toLocaleString()}`);
    console.log(`  Cost multiplier:      ${costMultiplier}`);
    if (dryRun) {
        console.log('\n' + chalk_1.default.yellow('Dry run complete. Use without --dry-run to send data.'));
        if (verbose) {
            console.log('\n' + chalk_1.default.dim('Sample OTLP payload (first batch):'));
            const sampleRecords = allRecords.slice(0, Math.min(batchSize, 3));
            const samplePayload = createOtlpPayload(sampleRecords, costMultiplier);
            console.log(chalk_1.default.dim(JSON.stringify(samplePayload, null, 2)));
        }
        return;
    }
    // Send data in batches
    const totalBatches = Math.ceil(allRecords.length / batchSize);
    const sendSpinner = (0, ora_1.default)(`Sending data... (0/${totalBatches} batches)`).start();
    let sentBatches = 0;
    let sentRecords = 0;
    let failedBatches = 0;
    for (let i = 0; i < allRecords.length; i += batchSize) {
        const batch = allRecords.slice(i, i + batchSize);
        const payload = createOtlpPayload(batch, costMultiplier);
        try {
            await (0, client_js_1.sendOtlpMetrics)(config.endpoint, config.apiKey, payload);
            sentBatches++;
            sentRecords += batch.length;
            sendSpinner.text = `Sending data... (${sentBatches}/${totalBatches} batches)`;
        }
        catch (error) {
            failedBatches++;
            if (verbose) {
                const batchNumber = Math.floor(i / batchSize) + 1;
                console.log(chalk_1.default.yellow(`\nBatch ${batchNumber} failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
        }
    }
    if (failedBatches === 0) {
        sendSpinner.succeed(`Sent ${sentRecords.toLocaleString()} records in ${sentBatches} batches`);
    }
    else {
        sendSpinner.warn(`Sent ${sentRecords.toLocaleString()} records in ${sentBatches} batches (${failedBatches} failed)`);
    }
    console.log('\n' + chalk_1.default.green.bold('Backfill complete!'));
    console.log(chalk_1.default.dim('Check your Revenium dashboard to see the imported data.'));
}
//# sourceMappingURL=backfill.js.map