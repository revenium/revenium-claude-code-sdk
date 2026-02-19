import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import {
  DEFAULT_REVENIUM_URL,
  SUBSCRIPTION_TIER_CONFIG,
  type SubscriptionTier,
} from "../../utils/constants.js";
import { maskApiKey, maskEmail } from "../../utils/masking.js";
import {
  validateApiKey,
  validateEmail,
  validateEndpointUrl,
} from "../../core/config/validator.js";
import { writeConfig } from "../../core/config/writer.js";
import { checkEndpointHealth } from "../../core/api/client.js";
import {
  updateShellProfile,
  getManualInstructions,
} from "../../core/shell/profile-updater.js";
import { detectShell } from "../../core/shell/detector.js";
import type { ReveniumConfig } from "../../types/index.js";

interface SetupOptions {
  apiKey?: string;
  email?: string;
  tier?: string;
  endpoint?: string;
  organizationId?: string;
  productId?: string;
  skipShellUpdate?: boolean;
}

/**
 * Interactive setup wizard for Revenium Claude Code metering.
 */
export async function setupCommand(options: SetupOptions = {}): Promise<void> {
  console.log(chalk.bold("\nRevenium Claude Code Metering Setup\n"));
  console.log(
    chalk.dim(
      "This wizard will configure Claude Code to export telemetry to Revenium.\n"
    )
  );

  // Collect configuration
  const config = await collectConfiguration(options);

  // Validate API key with endpoint
  const spinner = ora("Testing API key...").start();

  try {
    const healthResult = await checkEndpointHealth(
      config.endpoint,
      config.apiKey
    );

    if (!healthResult.healthy) {
      spinner.fail(`API key validation failed: ${healthResult.message}`);
      console.log(
        chalk.yellow(
          "\nPlease check your API key and try again. If the problem persists, contact support."
        )
      );
      process.exit(1);
    }

    spinner.succeed(`API key validated (${healthResult.latencyMs}ms latency)`);
  } catch (error) {
    spinner.fail("Failed to validate API key");
    console.error(
      chalk.red(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    );
    process.exit(1);
  }

  // Write configuration file
  const writeSpinner = ora("Writing configuration...").start();

  try {
    const configPath = await writeConfig(config);
    writeSpinner.succeed(`Configuration written to ${chalk.cyan(configPath)}`);
  } catch (error) {
    writeSpinner.fail("Failed to write configuration");
    console.error(
      chalk.red(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    );
    process.exit(1);
  }

  // Update shell profile
  if (!options.skipShellUpdate) {
    const shellSpinner = ora("Updating shell profile...").start();

    try {
      const shellResult = await updateShellProfile();

      if (shellResult.success) {
        shellSpinner.succeed(shellResult.message);
      } else {
        shellSpinner.warn(shellResult.message);
        const shellType = detectShell();
        console.log(
          chalk.dim(`\nManual setup:\n${getManualInstructions(shellType)}`)
        );
      }
    } catch {
      shellSpinner.warn("Could not update shell profile automatically");
      const shellType = detectShell();
      console.log(
        chalk.dim(`\nManual setup:\n${getManualInstructions(shellType)}`)
      );
    }
  }

  // Print success message
  printSuccessMessage(config);
}

async function collectConfiguration(
  options: SetupOptions
): Promise<ReveniumConfig> {
  const answers = await inquirer.prompt([
    {
      type: "password",
      name: "apiKey",
      message: "Enter your Revenium API key:",
      when: !options.apiKey,
      validate: (input: string) => {
        const result = validateApiKey(input);
        return result.valid || result.errors.join(", ");
      },
      mask: "*",
    },
    {
      type: "input",
      name: "email",
      message: "Enter your email (for usage attribution):",
      when: !options.email,
      validate: (input: string) => {
        if (!input) return true; // Optional
        const result = validateEmail(input);
        return result.valid || result.errors.join(", ");
      },
    },
    {
      type: "list",
      name: "tier",
      message:
        "Select your Claude Code subscription tier (for estimating discounts from list API rates):",
      when: !options.tier,
      pageSize: 20,
      choices: [
        ...Object.entries(SUBSCRIPTION_TIER_CONFIG).map(([key, config]) => ({
          name: config.name,
          value: key,
        })),
        new inquirer.Separator(" "),
        new inquirer.Separator(
          chalk.dim(
            "  Note: if you have a custom discount from Anthropic, you can configure it later in ~/.claude/revenium.env."
          )
        ),
        new inquirer.Separator(" "),
      ],
    },
    {
      type: "input",
      name: "endpoint",
      message: "Revenium API endpoint:",
      default: DEFAULT_REVENIUM_URL,
      when: !options.endpoint,
      validate: (input: string) => {
        const result = validateEndpointUrl(input);
        if (!result.valid) {
          return result.errors[0] || "Invalid endpoint URL";
        }
        return true;
      },
    },
  ]);

  // Normalize endpoint by removing trailing slashes and /meter paths
  const rawEndpoint =
    options.endpoint || answers.endpoint || DEFAULT_REVENIUM_URL;
  let endpoint = rawEndpoint.replace(/\/+$/, ""); // Remove trailing slashes

  // Strip /meter paths if user included them (e.g., /meter/v2/otlp, /meter/v2/ai/otlp, or just /meter)
  try {
    const url = new URL(endpoint);
    if (url.pathname.includes("/meter")) {
      url.pathname = url.pathname.split("/meter")[0];
      endpoint = url.origin + url.pathname;
    }
  } catch {
    // If URL parsing fails, just use the cleaned endpoint as-is
  }

  // Remove any remaining trailing slashes after path manipulation
  endpoint = endpoint.replace(/\/+$/, "");

  return {
    apiKey: options.apiKey || answers.apiKey,
    email: options.email || answers.email || undefined,
    subscriptionTier: (options.tier || answers.tier) as SubscriptionTier,
    endpoint,
    organizationId: options.organizationId,
    productId: options.productId,
  };
}

function printSuccessMessage(config: ReveniumConfig): void {
  console.log("\n" + chalk.green.bold("Setup complete!") + "\n");

  console.log(chalk.bold("Configuration:"));
  console.log(`  API Key:    ${maskApiKey(config.apiKey)}`);
  console.log(`  Endpoint:   ${config.endpoint}`);
  if (config.email) {
    console.log(`  Email:      ${maskEmail(config.email)}`);
  }
  if (config.subscriptionTier) {
    const tier = config.subscriptionTier as SubscriptionTier;
    const tierConfig = SUBSCRIPTION_TIER_CONFIG[tier];
    console.log(`  Tier:       ${tierConfig.name}`);
  }
  if (config.organizationId) {
    console.log(`  Organization: ${config.organizationId}`);
  }
  if (config.productId) {
    console.log(`  Product:    ${config.productId}`);
  }

  console.log("\n" + chalk.yellow.bold("Next steps:"));
  console.log("  1. Restart your terminal or run:");
  console.log(chalk.cyan("     source ~/.claude/revenium.env"));
  console.log(
    "  2. Start using Claude Code - telemetry will be sent automatically"
  );
  console.log(
    "  3. Import past usage by running: " +
      chalk.cyan("revenium-metering backfill")
  );
  console.log("  4. Check your usage at https://app.revenium.ai");

  console.log(
    "\n" +
      chalk.dim(
        "Run `revenium-metering status` to verify the configuration at any time."
      )
  );
}
