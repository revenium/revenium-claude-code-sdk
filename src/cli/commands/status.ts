import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, configExists, isEnvLoaded, getConfigPath, checkMigrationStatus } from '../../core/config/loader.js';
import { checkEndpointHealth } from '../../core/api/client.js';
import { maskApiKey, maskEmail } from '../../utils/masking.js';
import { detectShell, getProfilePath } from '../../core/shell/detector.js';

/**
 * Displays the current configuration status.
 */
export async function statusCommand(): Promise<void> {
  console.log(chalk.bold('\nRevenium Claude Code Metering Status\n'));

  // Check if config file exists
  const configPath = getConfigPath();
  if (!configExists()) {
    console.log(chalk.red('Configuration not found'));
    console.log(chalk.dim(`Expected at: ${configPath}`));
    console.log(
      chalk.yellow('\nRun `revenium-metering setup` to configure Claude Code metering.')
    );
    process.exit(1);
  }

  console.log(chalk.green('Configuration file found'));
  console.log(chalk.dim(`  ${configPath}`));

  // Load and display configuration
  const config = await loadConfig();
  if (!config) {
    console.log(chalk.red('\nCould not parse configuration file'));
    console.log(chalk.yellow('Run `revenium-metering setup` to reconfigure.'));
    process.exit(1);
  }

  console.log('\n' + chalk.bold('Configuration:'));
  console.log(`  API Key:    ${maskApiKey(config.apiKey)}`);
  console.log(`  Endpoint:   ${config.endpoint}`);
  if (config.email) {
    console.log(`  Email:      ${maskEmail(config.email)}`);
  }
  if (config.subscriptionTier) {
    console.log(`  Tier:       ${config.subscriptionTier}`);
  }
  if (config.organizationId) {
    console.log(`  Org ID:     ${config.organizationId}`);
  }
  if (config.productId) {
    console.log(`  Product ID: ${config.productId}`);
  }

  // Check for migration issues
  const migrationStatus = await checkMigrationStatus();
  if (migrationStatus.needsMigration) {
    console.log('\n' + chalk.bold.yellow('⚠️  Migration Required:'));
    for (const issue of migrationStatus.issues) {
      console.log(chalk.yellow(`  • ${issue}`));
    }
    console.log(chalk.dim('  Run `revenium-metering setup` to update your configuration.'));
  }

  // Check if environment is loaded
  console.log('\n' + chalk.bold('Environment:'));
  if (isEnvLoaded()) {
    console.log(chalk.green('  Environment variables are loaded in current shell'));
  } else {
    console.log(chalk.yellow('  Environment variables not loaded in current shell'));
    console.log(chalk.dim('  Run: source ~/.claude/revenium.env'));
  }

  // Shell profile status
  const shellType = detectShell();
  const profilePath = getProfilePath(shellType);
  console.log(`  Shell:      ${shellType}`);
  if (profilePath) {
    console.log(`  Profile:    ${profilePath}`);
  }

  // Test endpoint connectivity
  console.log('\n' + chalk.bold('Endpoint Health:'));
  const spinner = ora('  Testing connectivity...').start();

  try {
    const healthResult = await checkEndpointHealth(config.endpoint, config.apiKey, {
      organizationId: config.organizationId,
      productId: config.productId,
    });

    if (healthResult.healthy) {
      spinner.succeed(`  Endpoint healthy (${healthResult.latencyMs}ms)`);
    } else {
      spinner.fail(`  Endpoint unhealthy: ${healthResult.message}`);
    }
  } catch (error) {
    spinner.fail(`  Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  console.log('');
}
