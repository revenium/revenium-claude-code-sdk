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
    /** Alias for organizationName — accepted for backward compatibility */
    organizationId?: string;
    /** Optional product name to attribute costs to */
    productName?: string;
    /** Alias for productName — accepted for backward compatibility */
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
 * Verifies an API key is accepted by the Revenium backend by calling the resolve-key endpoint.
 * Returns true if the key is accepted (200 OK), false otherwise.
 * Network errors and non-200 responses all return false.
 *
 * This function is exported as a lightweight SDK utility for programmatic callers that need
 * to check key validity without sending a test OTLP event. The CLI setup wizard uses
 * {@link checkEndpointHealth} instead, which validates end-to-end connectivity.
 *
 * @param baseEndpoint The base Revenium endpoint (e.g. "https://api.revenium.io")
 * @param apiKey The Revenium API key (format: hak_<tenant>_<secret>)
 * @returns true if the key is valid, false otherwise
 */
export declare function verifyApiKey(baseEndpoint: string, apiKey: string): Promise<boolean>;
/**
 * Performs a health check by sending a minimal test payload to the endpoint.
 */
export declare function checkEndpointHealth(baseEndpoint: string, apiKey: string, options?: TestPayloadOptions): Promise<HealthCheckResult>;
//# sourceMappingURL=client.d.ts.map