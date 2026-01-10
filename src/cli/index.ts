#!/usr/bin/env node

import { Command } from 'commander';
import { setupCommand } from './commands/setup.js';
import { statusCommand } from './commands/status.js';
import { testCommand } from './commands/test.js';
import { backfillCommand } from './commands/backfill.js';

const program = new Command();

program
  .name('revenium-metering')
  .description('Configure Claude Code telemetry export to Revenium')
  .version('0.1.0');

program
  .command('setup')
  .description('Interactive setup wizard to configure Claude Code metering')
  .option('-k, --api-key <key>', 'Revenium API key (hak_...)')
  .option('-e, --email <email>', 'Email for usage attribution')
  .option('-t, --tier <tier>', 'Subscription tier (pro, max_5x, max_20x, team_premium, enterprise, api)')
  .option('--endpoint <url>', 'Revenium API endpoint URL')
  .option('--skip-shell-update', 'Skip automatic shell profile update')
  .action(async (options) => {
    await setupCommand({
      apiKey: options.apiKey,
      email: options.email,
      tier: options.tier,
      endpoint: options.endpoint,
      skipShellUpdate: options.skipShellUpdate,
    });
  });

program
  .command('status')
  .description('Check current configuration and endpoint connectivity')
  .action(async () => {
    await statusCommand();
  });

program
  .command('test')
  .description('Send a test metric to verify the integration')
  .option('-v, --verbose', 'Show detailed payload information')
  .action(async (options) => {
    await testCommand({ verbose: options.verbose });
  });

program
  .command('backfill')
  .description('Import historical Claude Code usage data from local JSONL files')
  .option('--since <date>', 'Only backfill after this date (ISO format or relative like "7d", "1m")')
  .option('--dry-run', 'Show what would be sent without sending')
  .option('--batch-size <n>', 'Messages per API batch (default: 100)', '100')
  .option('-v, --verbose', 'Show detailed progress')
  .action(async (options) => {
    const batchSize = parseInt(options.batchSize, 10);
    if (!Number.isFinite(batchSize) || batchSize < 1) {
      console.error('Error: --batch-size must be a positive integer');
      process.exit(1);
    }
    await backfillCommand({
      since: options.since,
      dryRun: options.dryRun,
      batchSize,
      verbose: options.verbose,
    });
  });

program.parse();
