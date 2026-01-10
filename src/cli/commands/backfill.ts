import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../../core/config/loader.js';
import { sendOtlpMetrics } from '../../core/api/client.js';
import { getCostMultiplier, type SubscriptionTier } from '../../utils/constants.js';
import type { OTLPMetricsPayload } from '../../types/index.js';

export interface BackfillOptions {
  since?: string;
  dryRun?: boolean;
  batchSize?: number;
  verbose?: boolean;
}

interface UsageData {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

interface JsonlEntry {
  type: string;
  sessionId?: string;
  timestamp?: string;
  message?: {
    model?: string;
    usage?: UsageData;
  };
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

/**
 * Parses a relative date string like "7d" or "1m" into a Date.
 */
function parseRelativeDate(input: string): Date | null {
  const match = input.match(/^(\d+)([dmwMy])$/);
  if (!match) return null;

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
function parseSinceDate(since: string): Date | null {
  // Try relative format first
  const relativeDate = parseRelativeDate(since);
  if (relativeDate) return relativeDate;

  // Try ISO format
  const isoDate = new Date(since);
  if (!isNaN(isoDate.getTime())) return isoDate;

  return null;
}

/**
 * Recursively finds all .jsonl files in a directory.
 * Returns an object with found files and any errors encountered.
 */
async function findJsonlFiles(
  dir: string,
  errors: string[] = []
): Promise<{ files: string[]; errors: string[] }> {
  const files: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        const result = await findJsonlFiles(fullPath, errors);
        files.push(...result.files);
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`${dir}: ${message}`);
  }

  return { files, errors };
}

interface StreamResult {
  record?: ParsedRecord;
  parseError?: boolean;
}

/**
 * Streams a JSONL file and extracts records with usage data.
 * Yields objects indicating either a valid record or a parse error.
 */
async function* streamJsonlRecords(
  filePath: string,
  sinceDate: Date | null
): AsyncGenerator<StreamResult> {
  const fileStream = createReadStream(filePath);
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  try {
    for await (const line of rl) {
      if (!line.trim()) continue;

      try {
        const entry: JsonlEntry = JSON.parse(line);

        // Only process assistant messages with usage data
        if (entry.type !== 'assistant' || !entry.message?.usage) continue;

        const usage = entry.message.usage;
        const timestamp = entry.timestamp;
        const sessionId = entry.sessionId;
        const model = entry.message.model;

        // Skip if missing required fields
        if (!timestamp || !sessionId || !model) continue;

        // Validate timestamp is a valid date
        const entryDate = new Date(timestamp);
        if (!Number.isFinite(entryDate.getTime())) continue;

        // Check date filter
        if (sinceDate) {
          if (entryDate < sinceDate) continue;
        }

        // Skip entries with no actual token usage
        const totalTokens =
          (usage.input_tokens || 0) +
          (usage.output_tokens || 0) +
          (usage.cache_read_input_tokens || 0) +
          (usage.cache_creation_input_tokens || 0);

        if (totalTokens === 0) continue;

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
      } catch {
        // Invalid JSON line, signal parse error
        yield { parseError: true };
      }
    }
  } finally {
    // Ensure file stream is properly closed even on early exit
    fileStream.destroy();
    rl.close();
  }
}

/**
 * Converts a timestamp to nanoseconds since Unix epoch.
 * Returns null if the timestamp is invalid.
 */
function toUnixNano(timestamp: string): string | null {
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
function createOtlpPayload(
  records: ParsedRecord[],
  costMultiplier: number
): OTLPMetricsPayload {
  // Build metrics for all records
  const allMetrics: Array<{
    name: string;
    sum: {
      dataPoints: Array<{
        attributes: Array<{ key: string; value: { stringValue?: string; doubleValue?: number } }>;
        timeUnixNano: string;
        asInt: number;
      }>;
    };
  }> = [];

  for (const record of records) {
    const timeUnixNano = toUnixNano(record.timestamp);
    if (timeUnixNano === null) continue;

    // Common attributes for this record
    const attributes: Array<{ key: string; value: { stringValue?: string; doubleValue?: number } }> = [
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
export async function backfillCommand(options: BackfillOptions = {}): Promise<void> {
  const { since, dryRun = false, batchSize = 100, verbose = false } = options;

  console.log(chalk.bold('\nRevenium Claude Code Backfill\n'));

  if (dryRun) {
    console.log(chalk.yellow('Running in dry-run mode - no data will be sent\n'));
  }

  // Load configuration
  const config = await loadConfig();
  if (!config) {
    console.log(chalk.red('Configuration not found'));
    console.log(
      chalk.yellow('\nRun `revenium-metering setup` to configure Claude Code metering.')
    );
    process.exit(1);
  }

  // Parse since date
  let sinceDate: Date | null = null;
  if (since) {
    sinceDate = parseSinceDate(since);
    if (!sinceDate) {
      console.log(chalk.red(`Invalid --since value: ${since}`));
      console.log(chalk.dim('Use ISO format (2024-01-15) or relative format (7d, 1m, 1y)'));
      process.exit(1);
    }
    console.log(chalk.dim(`Filtering records since: ${sinceDate.toISOString()}\n`));
  }

  // Get cost multiplier (use ?? to allow explicit 0 override for free tier/testing)
  const costMultiplier = config.costMultiplierOverride ??
    (config.subscriptionTier ? getCostMultiplier(config.subscriptionTier as SubscriptionTier) : 0.08);

  // Discover JSONL files
  const projectsDir = join(homedir(), '.claude', 'projects');
  const discoverSpinner = ora('Discovering JSONL files...').start();

  const { files: jsonlFiles, errors: discoveryErrors } = await findJsonlFiles(projectsDir);

  if (discoveryErrors.length > 0 && verbose) {
    discoverSpinner.warn(`Found ${jsonlFiles.length} JSONL file(s) with ${discoveryErrors.length} directory error(s)`);
    console.log(chalk.yellow('\nDirectory access errors:'));
    for (const error of discoveryErrors.slice(0, 5)) {
      console.log(chalk.yellow(`  ${error}`));
    }
    if (discoveryErrors.length > 5) {
      console.log(chalk.yellow(`  ... and ${discoveryErrors.length - 5} more`));
    }
  } else if (jsonlFiles.length === 0) {
    discoverSpinner.fail('No JSONL files found');
    console.log(chalk.dim(`Searched in: ${projectsDir}`));
    if (discoveryErrors.length > 0) {
      console.log(chalk.yellow('\nDirectory access errors:'));
      for (const error of discoveryErrors) {
        console.log(chalk.yellow(`  ${error}`));
      }
    }
    process.exit(1);
  } else {
    discoverSpinner.succeed(`Found ${jsonlFiles.length} JSONL file(s)`);
  }

  if (verbose) {
    console.log(chalk.dim('\nFiles:'));
    for (const file of jsonlFiles.slice(0, 10)) {
      console.log(chalk.dim(`  ${file}`));
    }
    if (jsonlFiles.length > 10) {
      console.log(chalk.dim(`  ... and ${jsonlFiles.length - 10} more`));
    }
    console.log('');
  }

  // Process files and collect records
  const processSpinner = ora('Processing files...').start();
  const allRecords: ParsedRecord[] = [];
  let processedFiles = 0;
  let skippedLines = 0;
  let skippedFiles = 0;

  for (const file of jsonlFiles) {
    try {
      for await (const result of streamJsonlRecords(file, sinceDate)) {
        if (result.parseError) {
          skippedLines++;
        } else if (result.record) {
          allRecords.push(result.record);
        }
      }
      processedFiles++;
      processSpinner.text = `Processing files... (${processedFiles}/${jsonlFiles.length})`;
    } catch (error) {
      skippedFiles++;
      if (verbose) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(chalk.yellow(`\nWarning: Could not process ${file}: ${message}`));
      }
    }
  }

  // Build status message with skipped line info
  let statusMessage = `Processed ${processedFiles} files, found ${allRecords.length} usage records`;
  if (skippedLines > 0) {
    statusMessage += chalk.yellow(` (${skippedLines} malformed line${skippedLines > 1 ? 's' : ''} skipped)`);
  }
  if (skippedFiles > 0) {
    statusMessage += chalk.yellow(` (${skippedFiles} file${skippedFiles > 1 ? 's' : ''} failed)`);
  }

  processSpinner.succeed(statusMessage);

  if (allRecords.length === 0) {
    console.log(chalk.yellow('\nNo usage records found to backfill.'));
    if (since) {
      console.log(chalk.dim(`Try a broader date range or remove the --since filter.`));
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

  console.log('\n' + chalk.bold('Summary:'));
  console.log(`  Records:              ${allRecords.length.toLocaleString()}`);
  console.log(`  Date range:           ${oldestRecord.timestamp.split('T')[0]} to ${newestRecord.timestamp.split('T')[0]}`);
  console.log(`  Input tokens:         ${totalInputTokens.toLocaleString()}`);
  console.log(`  Output tokens:        ${totalOutputTokens.toLocaleString()}`);
  console.log(`  Cache read tokens:    ${totalCacheReadTokens.toLocaleString()}`);
  console.log(`  Cache creation:       ${totalCacheCreationTokens.toLocaleString()}`);
  console.log(`  Cost multiplier:      ${costMultiplier}`);

  if (dryRun) {
    console.log('\n' + chalk.yellow('Dry run complete. Use without --dry-run to send data.'));

    if (verbose) {
      console.log('\n' + chalk.dim('Sample OTLP payload (first batch):'));
      const sampleRecords = allRecords.slice(0, Math.min(batchSize, 3));
      const samplePayload = createOtlpPayload(sampleRecords, costMultiplier);
      console.log(chalk.dim(JSON.stringify(samplePayload, null, 2)));
    }
    return;
  }

  // Send data in batches
  const totalBatches = Math.ceil(allRecords.length / batchSize);
  const sendSpinner = ora(`Sending data... (0/${totalBatches} batches)`).start();
  let sentBatches = 0;
  let sentRecords = 0;
  let failedBatches = 0;

  for (let i = 0; i < allRecords.length; i += batchSize) {
    const batch = allRecords.slice(i, i + batchSize);
    const payload = createOtlpPayload(batch, costMultiplier);

    try {
      await sendOtlpMetrics(config.endpoint, config.apiKey, payload);
      sentBatches++;
      sentRecords += batch.length;
      sendSpinner.text = `Sending data... (${sentBatches}/${totalBatches} batches)`;
    } catch (error) {
      failedBatches++;
      if (verbose) {
        const batchNumber = Math.floor(i / batchSize) + 1;
        console.log(
          chalk.yellow(`\nBatch ${batchNumber} failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        );
      }
    }
  }

  if (failedBatches === 0) {
    sendSpinner.succeed(`Sent ${sentRecords.toLocaleString()} records in ${sentBatches} batches`);
  } else {
    sendSpinner.warn(
      `Sent ${sentRecords.toLocaleString()} records in ${sentBatches} batches (${failedBatches} failed)`
    );
  }

  console.log('\n' + chalk.green.bold('Backfill complete!'));
  console.log(chalk.dim('Check your Revenium dashboard to see the imported data.'));
}
