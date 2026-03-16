import type {
  OTLPLogsPayload,
  OTLPResponse,
  HealthCheckResult,
} from "../../types/index.js";
import { getFullOtlpEndpoint } from "../config/loader.js";

/**
 * Sends an OTLP logs payload to the Revenium endpoint.
 */
export async function sendOtlpLogs(
  baseEndpoint: string,
  apiKey: string,
  payload: OTLPLogsPayload,
): Promise<OTLPResponse> {
  const fullEndpoint = getFullOtlpEndpoint(baseEndpoint);
  const url = `${fullEndpoint}/v1/logs`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(payload),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));

  if (!response.ok) {
    const errorText = await response.text();
    const safeErrorText =
      errorText.length > 200 ? errorText.substring(0, 200) + "..." : errorText;
    throw new Error(
      `OTLP request failed: ${response.status} ${response.statusText} - ${safeErrorText}`,
    );
  }

  return response.json() as Promise<OTLPResponse>;
}

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
export function createTestPayload(
  sessionId: string,
  options?: TestPayloadOptions,
): OTLPLogsPayload {
  const now = Date.now() * 1_000_000; // Convert to nanoseconds

  // Build log record attributes.
  // Note: user.email is read from log record attrs by ClaudeCodeMapper.
  // organization.name and product.name are read from resource attrs only
  // (the backend intentionally ignores them in log record attrs to avoid
  // Claude Code's auto-generated UUIDs polluting the org table).
  const logAttributes: Array<{ key: string; value: { stringValue: string } }> =
    [
      { key: "session.id", value: { stringValue: sessionId } },
      { key: "model", value: { stringValue: "cli-connectivity-test" } },
      { key: "input_tokens", value: { stringValue: "0" } },
      { key: "output_tokens", value: { stringValue: "0" } },
      { key: "cache_read_tokens", value: { stringValue: "0" } },
      { key: "cache_creation_tokens", value: { stringValue: "0" } },
      { key: "cost_usd", value: { stringValue: "0.0" } },
      { key: "duration_ms", value: { stringValue: "0" } },
    ];

  // Add subscriber email to log record attrs — backend ClaudeCodeMapper reads user.email from here.
  // Falls back to REVENIUM_SUBSCRIBER_EMAIL env var if not provided in options.
  const emailValue = options?.email ?? process.env['REVENIUM_SUBSCRIBER_EMAIL'];
  if (emailValue) {
    logAttributes.push({
      key: "user.email",
      value: { stringValue: emailValue },
    });
  }

  // Build resource attributes — service.name is required for mapper detection.
  // organization.name and product.name must be here (not in log record attrs) because
  // the backend ClaudeCodeMapper reads them from resource attrs only.
  const resourceAttributes: Array<{
    key: string;
    value: { stringValue: string };
  }> = [{ key: "service.name", value: { stringValue: "claude-code" } }];

  // Support both new (organizationName) and old (organizationId) field names with fallback
  const organizationValue =
    options?.organizationName || options?.organizationId;
  if (organizationValue) {
    resourceAttributes.push({
      key: "organization.name",
      value: { stringValue: organizationValue },
    });
  }

  // Support both new (productName) and old (productId) field names with fallback
  const productValue = options?.productName || options?.productId;
  if (productValue) {
    resourceAttributes.push({
      key: "product.name",
      value: { stringValue: productValue },
    });
  }

  // Parse OTEL_RESOURCE_ATTRIBUTES from environment and include in resource attrs.
  // This ensures subscription_tier and any other resource attributes configured by the user
  // appear in test metrics. Values are URL-decoded to reverse writer.ts URL-encoding (,=").
  const existingKeys = new Set(resourceAttributes.map((a) => a.key));
  const otelResourceAttrsEnv = process.env['OTEL_RESOURCE_ATTRIBUTES'];
  if (otelResourceAttrsEnv) {
    for (const pair of otelResourceAttrsEnv.split(',')) {
      const eqIdx = pair.indexOf('=');
      if (eqIdx > 0) {
        const key = pair.substring(0, eqIdx).trim();
        let value = pair.substring(eqIdx + 1).trim();
        try { value = decodeURIComponent(value); } catch { /* use raw value on decode failure */ }
        if (key && !existingKeys.has(key) && key !== 'user.email') {
          resourceAttributes.push({ key, value: { stringValue: value } });
          existingKeys.add(key);
        }
      }
    }
  }

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
export function generateTestSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `test-${timestamp}-${random}`;
}

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
export async function verifyApiKey(
  baseEndpoint: string,
  apiKey: string,
): Promise<boolean> {
  try {
    // Enforce HTTPS to prevent API key exfiltration to an attacker-controlled host
    const parsedBase = new URL(baseEndpoint);
    if (parsedBase.protocol !== 'https:') {
      return false;
    }
    const url = parsedBase.origin + '/v2/sdk/resolve-key';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Performs a health check by sending a minimal test payload to the endpoint.
 */
export async function checkEndpointHealth(
  baseEndpoint: string,
  apiKey: string,
  options?: TestPayloadOptions,
): Promise<HealthCheckResult> {
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
  } catch (error) {
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
