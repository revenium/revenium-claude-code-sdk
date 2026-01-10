import type { ShellType, ShellUpdateResult } from '../../types/index.js';
/**
 * Updates the shell profile to source the Revenium configuration file.
 * Returns details about the update operation.
 */
export declare function updateShellProfile(): Promise<ShellUpdateResult>;
/**
 * Gets instructions for manual shell profile configuration.
 */
export declare function getManualInstructions(shellType: ShellType): string;
//# sourceMappingURL=profile-updater.d.ts.map