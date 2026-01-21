"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtlpLogs = sendOtlpLogs;
exports.createTestPayload = createTestPayload;
exports.generateTestSessionId = generateTestSessionId;
exports.checkEndpointHealth = checkEndpointHealth;
const loader_js_1 = require("../config/loader.js");
/**
 * Sends an OTLP logs payload to the Revenium endpoint.
 */
async function sendOtlpLogs(baseEndpoint, apiKey, payload) {
    const fullEndpoint = (0, loader_js_1.getFullOtlpEndpoint)(baseEndpoint);
    const url = `${fullEndpoint}/v1/logs`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const errorText = await response.text();
        const safeErrorText = errorText.length > 200 ? errorText.substring(0, 200) + "..." : errorText;
        throw new Error(`OTLP request failed: ${response.status} ${response.statusText} - ${safeErrorText}`);
    }
    return response.json();
}
/**
 * Creates a minimal test OTLP logs payload.
 */
function createTestPayload(sessionId, options) {
    const now = Date.now() * 1_000_000; // Convert to nanoseconds
    // Build log record attributes
    // Note: organization.id and product.id go here because ClaudeCodeMapper reads from log record attrs
    const logAttributes = [
        { key: "session.id", value: { stringValue: sessionId } },
        { key: "model", value: { stringValue: "cli-connectivity-test" } },
        { key: "input_tokens", value: { stringValue: "0" } },
        { key: "output_tokens", value: { stringValue: "0" } },
        { key: "cache_read_tokens", value: { stringValue: "0" } },
        { key: "cache_creation_tokens", value: { stringValue: "0" } },
        { key: "cost_usd", value: { stringValue: "0.0" } },
        { key: "duration_ms", value: { stringValue: "0" } },
    ];
    // Add optional subscriber/attribution attributes at log record level
    // (backend ClaudeCodeMapper reads these from log record attrs, not resource attrs)
    if (options?.email) {
        logAttributes.push({
            key: "user.email",
            value: { stringValue: options.email },
        });
    }
    if (options?.organizationId) {
        logAttributes.push({
            key: "organization.id",
            value: { stringValue: options.organizationId },
        });
    }
    if (options?.productId) {
        logAttributes.push({
            key: "product.id",
            value: { stringValue: options.productId },
        });
    }
    // Build resource attributes (only service.name needed here)
    const resourceAttributes = [{ key: "service.name", value: { stringValue: "claude-code" } }];
    return {
        resourceLogs: [
            {
                resource: {
                    attributes: resourceAttributes,
                },
                scopeLogs: [
                    {
                        scope: {
                            name: "claude_code",
                            version: "0.1.0",
                        },
                        logRecords: [
                            {
                                timeUnixNano: now.toString(),
                                body: { stringValue: "claude_code.api_request" },
                                attributes: logAttributes,
                            },
                        ],
                    },
                ],
            },
        ],
    };
}
/**
 * Generates a unique session ID for test payloads.
 */
function generateTestSessionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `test-${timestamp}-${random}`;
}
/**
 * Performs a health check by sending a minimal test payload to the endpoint.
 */
async function checkEndpointHealth(baseEndpoint, apiKey, options) {
    const startTime = Date.now();
    try {
        const sessionId = generateTestSessionId();
        const payload = createTestPayload(sessionId, options);
        const response = await sendOtlpLogs(baseEndpoint, apiKey, payload);
        const latencyMs = Date.now() - startTime;
        return {
            healthy: true,
            statusCode: 200,
            message: `Endpoint healthy. Processed ${response.processedEvents} event(s).`,
            latencyMs,
        };
    }
    catch (error) {
        const latencyMs = Date.now() - startTime;
        const message = error instanceof Error ? error.message : "Unknown error";
        // Try to extract status code from error message
        const statusMatch = message.match(/(\d{3})/);
        const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : undefined;
        return {
            healthy: false,
            statusCode,
            message,
            latencyMs,
        };
    }
}
//# sourceMappingURL=client.js.map