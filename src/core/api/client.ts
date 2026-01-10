import type { OTLPMetricsPayload, OTLPResponse, HealthCheckResult } from '../../types/index.js';
import { getFullOtlpEndpoint } from '../config/loader.js';

/**
 * Sends an OTLP metrics payload to the Revenium endpoint.
 * Posts to /meter/v2/otel/v1/metrics with OTEL Metrics format.
 */
export async function sendOtlpMetrics(
  baseEndpoint: string,
  apiKey: string,
  payload: OTLPMetricsPayload
): Promise<OTLPResponse> {
  const fullEndpoint = getFullOtlpEndpoint(baseEndpoint);
  const url = `${fullEndpoint}/v1/metrics`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OTLP request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json() as Promise<OTLPResponse>;
}

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
export function createTestPayload(sessionId: string, options?: TestPayloadOptions): OTLPMetricsPayload {
  const now = Date.now() * 1_000_000; // Convert to nanoseconds

  // Common attributes for all metrics
  const commonAttributes: Array<{ key: string; value: { stringValue: string } }> = [
    { key: 'ai.transaction_id', value: { stringValue: sessionId } },
    { key: 'ai.model', value: { stringValue: 'cli-connectivity-test' } },
    { key: 'ai.provider', value: { stringValue: 'anthropic' } },
  ];

  // Add optional organization ID
  if (options?.organizationId) {
    commonAttributes.push({ key: 'organization.id', value: { stringValue: options.organizationId } });
  }

  // Add optional product ID
  if (options?.productId) {
    commonAttributes.push({ key: 'product.id', value: { stringValue: options.productId } });
  }

  // Build resource attributes
  const resourceAttributes: Array<{ key: string; value: { stringValue: string } }> = [
    { key: 'service.name', value: { stringValue: 'claude-code' } },
  ];

  return {
    resourceMetrics: [
      {
        resource: {
          attributes: resourceAttributes,
        },
        scopeMetrics: [
          {
            metrics: [
              {
                name: 'ai.tokens.input',
                sum: {
                  dataPoints: [{
                    attributes: commonAttributes,
                    timeUnixNano: now.toString(),
                    asInt: 0,
                  }],
                },
              },
              {
                name: 'ai.tokens.output',
                sum: {
                  dataPoints: [{
                    attributes: commonAttributes,
                    timeUnixNano: now.toString(),
                    asInt: 0,
                  }],
                },
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
export function generateTestSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `test-${timestamp}-${random}`;
}

/**
 * Performs a health check by sending a minimal test payload to the endpoint.
 */
export async function checkEndpointHealth(
  baseEndpoint: string,
  apiKey: string,
  options?: TestPayloadOptions
): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const sessionId = generateTestSessionId();
    const payload = createTestPayload(sessionId, options);
    const response = await sendOtlpMetrics(baseEndpoint, apiKey, payload);

    const latencyMs = Date.now() - startTime;

    return {
      healthy: true,
      statusCode: 200,
      message: `Endpoint healthy. Processed ${response.processedMetrics} metric(s).`,
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown error';

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
