import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, configExists } from '../../core/config/loader.js';
import {
  sendOtlpLogs,
  createTestPayload,
  generateTestSessionId,
} from '../../core/api/client.js';

interface TestOptions {
  verbose?: boolean;
}

/**
 * Sends a test metric to verify the integration.
 */
export async function testCommand(options: TestOptions = {}): Promise<void> {
  console.log(chalk.bold('\nRevenium Claude Code Metering Test\n'));

  // Check if configured
  if (!configExists()) {
    console.log(chalk.red('Configuration not found'));
    console.log(
      chalk.yellow('Run `revenium-metering setup` first to configure the integration.')
    );
    process.exit(1);
  }

  // Load configuration
  const config = await loadConfig();
  if (!config) {
    console.log(chalk.red('Could not load configuration'));
    process.exit(1);
  }

  // Generate test payload with optional subscriber/attribution attributes
  const sessionId = generateTestSessionId();
  const payload = createTestPayload(sessionId, {
    email: config.email,
    organizationId: config.organizationId,
    productId: config.productId,
  });

  if (options.verbose) {
    console.log(chalk.dim('Test payload:'));
    console.log(chalk.dim(JSON.stringify(payload, null, 2)));
    console.log('');
  }

  // Send test metric
  const spinner = ora('Sending test metric...').start();

  try {
    const startTime = Date.now();
    const response = await sendOtlpLogs(config.endpoint, config.apiKey, payload);
    const latencyMs = Date.now() - startTime;

    spinner.succeed(`Test metric sent successfully (${latencyMs}ms)`);

    console.log('\n' + chalk.bold('Response:'));
    console.log(`  ID:              ${response.id}`);
    console.log(`  Resource Type:   ${response.resourceType}`);
    console.log(`  Processed:       ${response.processedEvents} event(s)`);
    console.log(`  Created:         ${response.created}`);

    console.log('\n' + chalk.green.bold('Integration is working correctly!'));
    console.log(
      chalk.dim(
        '\nNote: This test metric uses session ID: ' + sessionId
      )
    );
    console.log(
      chalk.dim('You can verify it in the Revenium dashboard at https://app.revenium.ai')
    );
  } catch (error) {
    spinner.fail('Failed to send test metric');
    console.error(
      chalk.red(`\nError: ${error instanceof Error ? error.message : 'Unknown error'}`)
    );

    console.log('\n' + chalk.yellow('Troubleshooting:'));
    console.log('  1. Verify your API key is correct');
    console.log('  2. Check the endpoint URL');
    console.log('  3. Ensure you have network connectivity');
    console.log('  4. Run `revenium-metering status` for more details');

    process.exit(1);
  }

  console.log('');
}
