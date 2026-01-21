import type { ReveniumConfig } from "../../types/index.js";
/**
 * Gets the path to the Revenium configuration file.
 */
export declare function getConfigPath(): string;
/**
 * Checks if the configuration file exists.
 */
export declare function configExists(): boolean;
/**
 * Parses an .env file content into key-value pairs.
 */
export declare function parseEnvContent(content: string): Record<string, string>;
/**
 * Loads the Revenium configuration from the .env file.
 * Returns null if the file doesn't exist.
 */
export declare function loadConfig(): Promise<ReveniumConfig | null>;
/**
 * Checks if the environment variables are currently loaded in the shell.
 */
export declare function isEnvLoaded(): boolean;
/**
 * Gets the full OTLP endpoint URL from a base URL.
 */
export declare function getFullOtlpEndpoint(baseUrl: string): string;
//# sourceMappingURL=loader.d.ts.map