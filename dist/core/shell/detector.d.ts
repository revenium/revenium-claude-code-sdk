import type { ShellType } from "../../types/index.js";
/**
 * Detects the current shell type based on environment variables.
 */
export declare function detectShell(): ShellType;
/**
 * Gets the profile file path for a given shell type.
 */
export declare function getProfilePath(shellType: ShellType): string | null;
/**
 * Validates that a config path contains only safe characters.
 * Throws an error if the path contains potentially dangerous characters.
 * Allows spaces since paths are properly quoted in shell commands.
 */
export declare function validateConfigPath(path: string): void;
/**
 * Generates the source command for a given shell type.
 * Validates the config path before generating the command.
 */
export declare function getSourceCommand(shellType: ShellType, configPath: string): string;
//# sourceMappingURL=detector.d.ts.map