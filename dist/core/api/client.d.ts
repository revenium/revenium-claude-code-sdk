import type { OTLPMetricsPayload, OTLPResponse, HealthCheckResult } from '../../types/index.js';
/**
 * Sends an OTLP metrics payload to the Revenium endpoint.
 * Posts to /meter/v2/otel/v1/metrics with OTEL Metrics format.
 */
export declare function sendOtlpMetrics(baseEndpoint: string, apiKey: string, payload: OTLPMetricsPayload): Promise<OTLPResponse>;
/**
 * Options for creating a test payload.
 */
export interface TestPayloadOptions {
    /** Optional organization ID to attribute costs to */
    organizationId?: string;
    /** Optional product ID to attribute costs to */
    productId?: string;
}
/**
 * Creates a minimal test OTEL metrics payload.
 */
export declare function createTestPayload(sessionId: string, options?: TestPayloadOptions): OTLPMetricsPayload;
/**
 * Generates a unique session ID for test payloads.
 */
export declare function generateTestSessionId(): string;
/**
 * Performs a health check by sending a minimal test payload to the endpoint.
 */
export declare function checkEndpointHealth(baseEndpoint: string, apiKey: string, options?: TestPayloadOptions): Promise<HealthCheckResult>;
//# sourceMappingURL=client.d.ts.map