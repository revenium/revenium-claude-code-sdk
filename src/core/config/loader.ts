import { homedir } from "node:os";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import {
  CLAUDE_CONFIG_DIR,
  REVENIUM_ENV_FILE,
  ENV_VARS,
  OTLP_PATH,
} from "../../utils/constants.js";
import type { ReveniumConfig } from "../../types/index.js";
import type { SubscriptionTier } from "../../utils/constants.js";

/**
 * Gets the path to the Revenium configuration file.
 */
export function getConfigPath(): string {
  return join(homedir(), CLAUDE_CONFIG_DIR, REVENIUM_ENV_FILE);
}

/**
 * Checks if the configuration file exists.
 */
export function configExists(): boolean {
  return existsSync(getConfigPath());
}

/**
 * Parses an .env file content into key-value pairs.
 */
export function parseEnvContent(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const line of content.split("\n")) {
    let trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    // Handle 'export' prefix
    if (trimmed.startsWith("export ")) {
      trimmed = trimmed.substring(7).trim();
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.substring(0, equalsIndex).trim();
    let value = trimmed.substring(equalsIndex + 1).trim();

    // Remove surrounding quotes if present and unescape
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.substring(1, value.length - 1);
      // Unescape common shell escape sequences
      value = value
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\$/g, "$")
        .replace(/\\`/g, "`")
        .replace(/\\\\/g, "\\");
    }

    result[key] = value;
  }

  return result;
}

/**
 * Extracts the API key from the OTEL_EXPORTER_OTLP_HEADERS value.
 * Format: "x-api-key=hak_xxx"
 */
function extractApiKeyFromHeaders(headers: string): string | undefined {
  const match = headers.match(/x-api-key=\s*(hak_[^\s"]+)/);
  return match?.[1];
}

/**
 * Extracts the base endpoint from the full OTLP endpoint URL.
 * Example: "https://api.revenium.ai/meter/v2/otlp" -> "https://api.revenium.ai"
 */
function extractBaseEndpoint(fullEndpoint: string): string {
  try {
    const url = new URL(fullEndpoint);
    // Remove the OTLP path suffix to get the base URL
    // Handle both old path (/meter/v2/ai/otlp) and new path (/meter/v2/otlp)
    const path = url.pathname;
    if (path.includes("/meter/v2/otlp") || path.includes("/meter/v2/ai/otlp")) {
      url.pathname = "";
    }
    return url.origin;
  } catch {
    return fullEndpoint;
  }
}

/**
 * Parses OTEL_RESOURCE_ATTRIBUTES value into key-value pairs.
 * Format: "key1=value1,key2=value2"
 */
function parseOtelResourceAttributes(value: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!value || typeof value !== "string") return result;

  const pairs = value.split(",");
  for (const pair of pairs) {
    const trimmed = pair.trim();
    if (!trimmed) continue;

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = trimmed.substring(0, equalsIndex).trim();
    let attrValue = trimmed.substring(equalsIndex + 1).trim();

    try {
      attrValue = decodeURIComponent(attrValue);
    } catch {
      // If decoding fails, use raw value
    }

    if (key) result[key] = attrValue;
  }
  return result;
}

/**
 * Loads the Revenium configuration from the .env file.
 * Returns null if the file doesn't exist.
 */
export async function loadConfig(): Promise<ReveniumConfig | null> {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const content = await readFile(configPath, "utf-8");
    const env = parseEnvContent(content);

    const fullEndpoint = env[ENV_VARS.OTLP_ENDPOINT] || "";
    const headers = env[ENV_VARS.OTLP_HEADERS] || "";
    const apiKey = extractApiKeyFromHeaders(headers);

    if (!apiKey) {
      return null;
    }

    // Parse cost multiplier override if present
    const costMultiplierStr = env[ENV_VARS.COST_MULTIPLIER];
    const costMultiplierOverride = costMultiplierStr
      ? parseFloat(costMultiplierStr)
      : undefined;

    // Parse OTEL_RESOURCE_ATTRIBUTES for org/product (primary source)
    const resourceAttrsStr = env["OTEL_RESOURCE_ATTRIBUTES"] || "";
    const resourceAttrs = parseOtelResourceAttributes(resourceAttrsStr);

    // Support both .name (preferred) and .id (legacy), with fallback to standalone vars
    const organizationId =
      resourceAttrs["organization.name"] ||
      resourceAttrs["organization.id"] ||
      env[ENV_VARS.ORGANIZATION_ID];

    const productId =
      resourceAttrs["product.name"] ||
      resourceAttrs["product.id"] ||
      env[ENV_VARS.PRODUCT_ID];

    return {
      apiKey,
      endpoint: extractBaseEndpoint(fullEndpoint),
      email: env[ENV_VARS.SUBSCRIBER_EMAIL],
      subscriptionTier: env[ENV_VARS.SUBSCRIPTION] as
        | SubscriptionTier
        | undefined,
      costMultiplierOverride:
        costMultiplierOverride !== undefined && !isNaN(costMultiplierOverride)
          ? costMultiplierOverride
          : undefined,
      organizationId,
      productId,
    };
  } catch {
    return null;
  }
}

/**
 * Checks if the environment variables are currently loaded in the shell.
 */
export function isEnvLoaded(): boolean {
  return (
    process.env[ENV_VARS.TELEMETRY_ENABLED] === "1" &&
    !!process.env[ENV_VARS.OTLP_ENDPOINT]
  );
}

/**
 * Gets the full OTLP endpoint URL from a base URL.
 */
export function getFullOtlpEndpoint(baseUrl: string): string {
  // Remove trailing slash if present
  const cleanUrl = baseUrl.replace(/\/$/, "");
  return `${cleanUrl}${OTLP_PATH}`;
}
