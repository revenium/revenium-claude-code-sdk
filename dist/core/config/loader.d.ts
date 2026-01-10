import type { ReveniumConfig } from '../../types/index.js';
/**
 * Gets the path to the Revenium configuration file.
 */
export declare function getConfigPath(): string;
/**
 * Checks if the configuration file exists.
 */
export declare function configExists(): boolean;
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
 * Migration status for config file updates.
 */
export interface MigrationStatus {
    needsMigration: boolean;
    issues: string[];
}
/**
 * Checks if the config file needs migration from old format.
 * Detects: OTEL_LOGS_EXPORTER (should be OTEL_METRICS_EXPORTER)
 */
export declare function checkMigrationStatus(): Promise<MigrationStatus>;
/**
 * Gets the full OTLP endpoint URL from a base URL.
 */
export declare function getFullOtlpEndpoint(baseUrl: string): string;
//# sourceMappingURL=loader.d.ts.map