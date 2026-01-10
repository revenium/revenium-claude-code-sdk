interface SetupOptions {
    apiKey?: string;
    email?: string;
    tier?: string;
    endpoint?: string;
    skipShellUpdate?: boolean;
}
/**
 * Interactive setup wizard for Revenium Claude Code metering.
 */
export declare function setupCommand(options?: SetupOptions): Promise<void>;
export {};
//# sourceMappingURL=setup.d.ts.map