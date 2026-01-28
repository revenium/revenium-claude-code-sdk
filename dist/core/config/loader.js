"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfigPath = getConfigPath;
exports.configExists = configExists;
exports.parseEnvContent = parseEnvContent;
exports.loadConfig = loadConfig;
exports.isEnvLoaded = isEnvLoaded;
exports.getFullOtlpEndpoint = getFullOtlpEndpoint;
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const promises_1 = require("node:fs/promises");
const node_fs_1 = require("node:fs");
const constants_js_1 = require("../../utils/constants.js");
/**
 * Gets the path to the Revenium configuration file.
 */
function getConfigPath() {
    return (0, node_path_1.join)((0, node_os_1.homedir)(), constants_js_1.CLAUDE_CONFIG_DIR, constants_js_1.REVENIUM_ENV_FILE);
}
/**
 * Checks if the configuration file exists.
 */
function configExists() {
    return (0, node_fs_1.existsSync)(getConfigPath());
}
/**
 * Parses an .env file content into key-value pairs.
 */
function parseEnvContent(content) {
    const result = {};
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
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
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
function extractApiKeyFromHeaders(headers) {
    const match = headers.match(/x-api-key=\s*(hak_[^\s"]+)/);
    return match?.[1];
}
/**
 * Extracts the base endpoint from the full OTLP endpoint URL.
 * Example: "https://api.revenium.ai/meter/v2/otlp" -> "https://api.revenium.ai"
 */
function extractBaseEndpoint(fullEndpoint) {
    try {
        const url = new URL(fullEndpoint);
        // Remove the OTLP path suffix to get the base URL
        // Handle both old path (/meter/v2/ai/otlp) and new path (/meter/v2/otlp)
        const path = url.pathname;
        if (path.includes("/meter/v2/otlp") || path.includes("/meter/v2/ai/otlp")) {
            url.pathname = "";
        }
        return url.origin;
    }
    catch {
        return fullEndpoint;
    }
}
/**
 * Parses OTEL_RESOURCE_ATTRIBUTES value into key-value pairs.
 * Format: "key1=value1,key2=value2"
 */
function parseOtelResourceAttributes(value) {
    const result = {};
    if (!value || typeof value !== "string")
        return result;
    const pairs = value.split(",");
    for (const pair of pairs) {
        const trimmed = pair.trim();
        if (!trimmed)
            continue;
        const equalsIndex = trimmed.indexOf("=");
        if (equalsIndex === -1)
            continue;
        const key = trimmed.substring(0, equalsIndex).trim();
        let attrValue = trimmed.substring(equalsIndex + 1).trim();
        try {
            attrValue = decodeURIComponent(attrValue);
        }
        catch {
            // If decoding fails, use raw value
        }
        if (key)
            result[key] = attrValue;
    }
    return result;
}
/**
 * Loads the Revenium configuration from the .env file.
 * Returns null if the file doesn't exist.
 */
async function loadConfig() {
    const configPath = getConfigPath();
    if (!(0, node_fs_1.existsSync)(configPath)) {
        return null;
    }
    try {
        const content = await (0, promises_1.readFile)(configPath, "utf-8");
        const env = parseEnvContent(content);
        const fullEndpoint = env[constants_js_1.ENV_VARS.OTLP_ENDPOINT] || "";
        const headers = env[constants_js_1.ENV_VARS.OTLP_HEADERS] || "";
        const apiKey = extractApiKeyFromHeaders(headers);
        if (!apiKey) {
            return null;
        }
        // Parse cost multiplier override if present
        const costMultiplierStr = env[constants_js_1.ENV_VARS.COST_MULTIPLIER];
        const costMultiplierOverride = costMultiplierStr
            ? parseFloat(costMultiplierStr)
            : undefined;
        // Parse OTEL_RESOURCE_ATTRIBUTES for org/product (primary source)
        const resourceAttrsStr = env["OTEL_RESOURCE_ATTRIBUTES"] || "";
        const resourceAttrs = parseOtelResourceAttributes(resourceAttrsStr);
        // Support both .name (preferred) and .id (legacy), with fallback to standalone vars
        // Priority: organizationName > organizationId > organization.name > organization.id > env var
        const organizationName = resourceAttrs["organization.name"] ||
            resourceAttrs["organization.id"] ||
            env[constants_js_1.ENV_VARS.ORGANIZATION_ID];
        const productName = resourceAttrs["product.name"] ||
            resourceAttrs["product.id"] ||
            env[constants_js_1.ENV_VARS.PRODUCT_ID];
        return {
            apiKey,
            endpoint: extractBaseEndpoint(fullEndpoint),
            email: env[constants_js_1.ENV_VARS.SUBSCRIBER_EMAIL],
            subscriptionTier: env[constants_js_1.ENV_VARS.SUBSCRIPTION],
            costMultiplierOverride: costMultiplierOverride !== undefined && !isNaN(costMultiplierOverride)
                ? costMultiplierOverride
                : undefined,
            organizationName,
            organizationId: organizationName, // Keep for backward compatibility
            productName,
            productId: productName, // Keep for backward compatibility
        };
    }
    catch {
        return null;
    }
}
/**
 * Checks if the environment variables are currently loaded in the shell.
 */
function isEnvLoaded() {
    return (process.env[constants_js_1.ENV_VARS.TELEMETRY_ENABLED] === "1" &&
        !!process.env[constants_js_1.ENV_VARS.OTLP_ENDPOINT]);
}
/**
 * Gets the full OTLP endpoint URL from a base URL.
 */
function getFullOtlpEndpoint(baseUrl) {
    // Remove trailing slash if present
    const cleanUrl = baseUrl.replace(/\/$/, "");
    return `${cleanUrl}${constants_js_1.OTLP_PATH}`;
}
//# sourceMappingURL=loader.js.map