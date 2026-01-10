import type { ShellType } from '../../types/index.js';
/**
 * Detects the current shell type based on environment variables.
 */
export declare function detectShell(): ShellType;
/**
 * Gets the profile file path for a given shell type.
 */
export declare function getProfilePath(shellType: ShellType): string | null;
/**
 * Generates the source command for a given shell type.
 */
export declare function getSourceCommand(shellType: ShellType, configPath: string): string;
//# sourceMappingURL=detector.d.ts.map