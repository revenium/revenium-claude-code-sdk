import type { ReveniumConfig } from "../../types/index.js";
/**
 * Writes the Revenium configuration to ~/.claude/revenium.env.
 * Creates the directory if it doesn't exist and sets file permissions to 600.
 */
export declare function writeConfig(config: ReveniumConfig): Promise<string>;
/**
 * Gets the path where the config file would be written.
 */
export declare function getConfigFilePath(): string;
//# sourceMappingURL=writer.d.ts.map