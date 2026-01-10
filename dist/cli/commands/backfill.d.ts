export interface BackfillOptions {
    since?: string;
    dryRun?: boolean;
    batchSize?: number;
    verbose?: boolean;
}
/**
 * Backfill command - imports historical Claude Code usage data.
 */
export declare function backfillCommand(options?: BackfillOptions): Promise<void>;
//# sourceMappingURL=backfill.d.ts.map