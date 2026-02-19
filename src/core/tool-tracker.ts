import type {
  ToolMetadata,
  ToolEventPayload,
  ToolCallReport,
} from "../types/tool-metering.js";
import type { OTLPLogsPayload } from "../types/index.js";
import { getToolContext } from "./tool-context.js";
import { sendOtlpLogs } from "./api/client.js";
import { loadConfig } from "./config/loader.js";

const MIDDLEWARE_SOURCE = "revenium-claude-code-sdk";

function isPromise<T>(value: unknown): value is Promise<T> {
  return value !== null && typeof value === "object" && typeof (value as Promise<T>).then === "function";
}

function extractOutputFields(result: unknown, fields: string[]): Record<string, unknown> {
  if (typeof result !== "object" || result === null) {
    return {};
  }

  const extracted: Record<string, unknown> = {};
  for (const field of fields) {
    if (field in result) {
      extracted[field] = (result as Record<string, unknown>)[field];
    }
  }
  return extracted;
}

function buildToolEventPayload(
  toolId: string,
  durationMs: number,
  success: boolean,
  errorMessage?: string,
  metadata?: ToolMetadata,
): ToolEventPayload {
  const context = getToolContext();
  const now = Date.now();
  return {
    toolId,
    sessionId: context?.sessionId ?? "unknown",
    startTime: now - durationMs,
    endTime: now,
    durationMs,
    success,
    errorMessage,
    metadata,
    userId: context?.userId,
    organizationName: context?.organizationName,
    productName: context?.productName,
  };
}

function createToolOtlpPayload(event: ToolEventPayload): OTLPLogsPayload {
  const logAttributes: Array<{ key: string; value: { stringValue?: string; intValue?: number; boolValue?: boolean } }> = [
    { key: "tool.id", value: { stringValue: event.toolId } },
    { key: "session.id", value: { stringValue: event.sessionId } },
    { key: "duration_ms", value: { intValue: event.durationMs } },
    { key: "success", value: { boolValue: event.success } },
    { key: "middleware.source", value: { stringValue: MIDDLEWARE_SOURCE } },
  ];

  if (event.errorMessage) {
    logAttributes.push({ key: "error.message", value: { stringValue: event.errorMessage } });
  }

  if (event.userId) {
    logAttributes.push({ key: "user.id", value: { stringValue: event.userId } });
  }

  if (event.organizationName) {
    logAttributes.push({ key: "organization.name", value: { stringValue: event.organizationName } });
  }

  if (event.productName) {
    logAttributes.push({ key: "product.name", value: { stringValue: event.productName } });
  }

  if (event.metadata?.description) {
    logAttributes.push({ key: "tool.description", value: { stringValue: event.metadata.description } });
  }

  if (event.metadata?.category) {
    logAttributes.push({ key: "tool.category", value: { stringValue: event.metadata.category } });
  }

  if (event.metadata?.version) {
    logAttributes.push({ key: "tool.version", value: { stringValue: event.metadata.version } });
  }

  if (event.metadata?.tags && event.metadata.tags.length > 0) {
    logAttributes.push({ key: "tool.tags", value: { stringValue: event.metadata.tags.join(",") } });
  }

  return {
    resourceLogs: [
      {
        resource: {
          attributes: [
            { key: "service.name", value: { stringValue: "claude-code" } },
            { key: "middleware.source", value: { stringValue: MIDDLEWARE_SOURCE } },
          ],
        },
        scopeLogs: [
          {
            scope: {
              name: "tool_metering",
              version: "0.1.0",
            },
            logRecords: [
              {
                timeUnixNano: (event.endTime * 1_000_000).toString(),
                body: { stringValue: "tool.call" },
                attributes: logAttributes,
              },
            ],
          },
        ],
      },
    ],
  };
}

async function sendToolEvent(event: ToolEventPayload): Promise<void> {
  const context = getToolContext();
  const config = await loadConfig();

  const endpoint = context?.endpoint ?? config?.endpoint;
  const apiKey = context?.apiKey ?? config?.apiKey;

  if (!endpoint || !apiKey) {
    return;
  }

  const payload = createToolOtlpPayload(event);
  await sendOtlpLogs(endpoint, apiKey, payload);
}

function dispatchToolEvent(event: ToolEventPayload): void {
  sendToolEvent(event).catch(() => {});
}

export function meterTool<T>(
  toolId: string,
  fn: () => T | Promise<T>,
  metadata?: ToolMetadata,
): Promise<T> {
  const startTime = performance.now();

  const handleSuccess = (result: T): T => {
    const durationMs = Math.round(performance.now() - startTime);

    let finalMetadata = metadata;
    if (metadata?.outputFields && metadata.outputFields.length > 0) {
      const extracted = extractOutputFields(result, metadata.outputFields);
      finalMetadata = {
        ...metadata,
        usageMetadata: {
          ...metadata.usageMetadata,
          ...extracted,
        },
      };
    }

    const event = buildToolEventPayload(toolId, durationMs, true, undefined, finalMetadata);
    dispatchToolEvent(event);
    return result;
  };

  const handleError = (error: unknown): never => {
    const durationMs = Math.round(performance.now() - startTime);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const event = buildToolEventPayload(toolId, durationMs, false, errorMessage, metadata);
    dispatchToolEvent(event);
    throw error;
  };

  try {
    const result = fn();

    if (isPromise<T>(result)) {
      return result.then(handleSuccess, handleError);
    }

    return Promise.resolve(handleSuccess(result));
  } catch (error) {
    return Promise.reject(handleError(error));
  }
}

export function reportToolCall(
  toolId: string,
  report: ToolCallReport,
): void {
  const event = buildToolEventPayload(
    toolId,
    report.durationMs,
    report.success,
    report.errorMessage,
    report.metadata,
  );
  dispatchToolEvent(event);
}
