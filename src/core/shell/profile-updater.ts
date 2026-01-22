import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { ShellType, ShellUpdateResult } from "../../types/index.js";
import { detectShell, getProfilePath, getSourceCommand } from "./detector.js";
import { getConfigFilePath } from "../config/writer.js";

/** Marker comment to identify our configuration block */
const CONFIG_MARKER_START = "# >>> revenium-claude-code-metering >>>";
const CONFIG_MARKER_END = "# <<< revenium-claude-code-metering <<<";

/**
 * Checks if the shell profile already has the Revenium source command.
 */
async function hasReveniumConfig(profilePath: string): Promise<boolean> {
  if (!existsSync(profilePath)) {
    return false;
  }

  const content = await readFile(profilePath, "utf-8");
  return content.includes(CONFIG_MARKER_START);
}

/**
 * Generates the complete configuration block for the shell profile.
 */
function generateConfigBlock(shellType: ShellType, configPath: string): string {
  const sourceCmd = getSourceCommand(shellType, configPath);
  return `\n${CONFIG_MARKER_START}\n${sourceCmd}\n${CONFIG_MARKER_END}\n`;
}

/**
 * Removes existing Revenium configuration from profile content.
 */
function removeExistingConfig(content: string): string {
  const startIndex = content.indexOf(CONFIG_MARKER_START);
  const endIndex = content.indexOf(CONFIG_MARKER_END);

  if (startIndex === -1 || endIndex === -1) {
    return content;
  }

  const before = content.substring(0, startIndex).trimEnd();
  const after = content
    .substring(endIndex + CONFIG_MARKER_END.length)
    .trimStart();

  return before + (after ? "\n" + after : "");
}

/**
 * Updates the shell profile to source the Revenium configuration file.
 * Returns details about the update operation.
 */
export async function updateShellProfile(): Promise<ShellUpdateResult> {
  const shellType = detectShell();

  if (shellType === "unknown") {
    return {
      success: false,
      shellType,
      message:
        "Could not detect shell type. Please manually add the source command to your shell profile.",
    };
  }

  const profilePath = getProfilePath(shellType);

  if (!profilePath) {
    return {
      success: false,
      shellType,
      message: `Could not determine profile path for ${shellType}.`,
    };
  }

  const configPath = getConfigFilePath();

  try {
    // Check if already configured
    if (await hasReveniumConfig(profilePath)) {
      // Remove existing and re-add (in case config path changed)
      let content = await readFile(profilePath, "utf-8");
      content = removeExistingConfig(content);
      const configBlock = generateConfigBlock(shellType, configPath);
      await writeFile(profilePath, content + configBlock, "utf-8");

      return {
        success: true,
        shellType,
        profilePath,
        message: `Updated existing configuration in ${profilePath}`,
      };
    }

    // Add new configuration
    let content = "";
    if (existsSync(profilePath)) {
      content = await readFile(profilePath, "utf-8");
    }

    const configBlock = generateConfigBlock(shellType, configPath);
    await writeFile(profilePath, content + configBlock, "utf-8");

    return {
      success: true,
      shellType,
      profilePath,
      message: `Added configuration to ${profilePath}`,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      shellType,
      profilePath,
      message: `Failed to update shell profile: ${errorMessage}`,
    };
  }
}

/**
 * Gets instructions for manual shell profile configuration.
 */
export function getManualInstructions(shellType: ShellType): string {
  const configPath = getConfigFilePath();
  const sourceCmd = getSourceCommand(shellType, configPath);
  const profilePath = getProfilePath(shellType);

  return `Add the following to ${profilePath || "your shell profile"}:\n\n${sourceCmd}`;
}
