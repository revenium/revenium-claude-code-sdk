import type { OTLPLogsPayload, OTLPResponse, HealthCheckResult } from "../../types/index.js";
/**
 * Sends an OTLP logs payload to the Revenium endpoint.
 */
export declare function sendOtlpLogs(baseEndpoint: string, apiKey: string, payload: OTLPLogsPayload): Promise<OTLPResponse>;
/**
 * Options for creating a test payload.
 */
export interface TestPayloadOptions {
    /** Optional subscriber email for attribution */
    email?: string;
    /** Optional organization name to attribute costs to */
    organizationName?: string;
    /**
     * @deprecated Use organizationName instead. This field will be removed in a future version.
     */
    organizationId?: string;
    /** Optional product name to attribute costs to */
    productName?: string;
    /**
     * @deprecated Use productName instead. This field will be removed in a future version.
     */
    productId?: string;
}
/**
 * Creates a minimal test OTLP logs payload.
 */
export declare function createTestPayload(sessionId: string, options?: TestPayloadOptions): OTLPLogsPayload;
/**
 * Generates a unique session ID for test payloads.
 */
export declare function generateTestSessionId(): string;
/**
 * Performs a health check by sending a minimal test payload to the endpoint.
 */
export declare function checkEndpointHealth(baseEndpoint: string, apiKey: string, options?: TestPayloadOptions): Promise<HealthCheckResult>;
//# sourceMappingURL=client.d.ts.map