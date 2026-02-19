import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createTestPayload,
  generateTestSessionId,
  sendOtlpLogs,
  checkEndpointHealth,
} from "../../src/core/api/client.js";

global.fetch = vi.fn();

describe("generateTestSessionId", () => {
  it("should generate unique session IDs", () => {
    const id1 = generateTestSessionId();
    const id2 = generateTestSessionId();
    expect(id1).not.toBe(id2);
  });

  it("should start with test- prefix", () => {
    const id = generateTestSessionId();
    expect(id.startsWith("test-")).toBe(true);
  });
});

describe("createTestPayload", () => {
  it("should create valid OTLP payload structure", () => {
    const sessionId = "test-session-123";
    const payload = createTestPayload(sessionId);

    expect(payload.resourceLogs).toHaveLength(1);
    expect(payload.resourceLogs[0].scopeLogs).toHaveLength(1);
    expect(payload.resourceLogs[0].scopeLogs[0].logRecords).toHaveLength(1);
  });

  it("should include correct session ID in payload", () => {
    const sessionId = "test-session-456";
    const payload = createTestPayload(sessionId);

    const attrs = payload.resourceLogs[0].scopeLogs[0].logRecords[0].attributes;
    const sessionAttr = attrs.find((a) => a.key === "session.id");
    expect(sessionAttr?.value.stringValue).toBe(sessionId);
  });

  it("should include claude_code.api_request body", () => {
    const payload = createTestPayload("test");
    const body = payload.resourceLogs[0].scopeLogs[0].logRecords[0].body;
    expect(body.stringValue).toBe("claude_code.api_request");
  });

  it("should include all required attributes", () => {
    const payload = createTestPayload("test");
    const attrs = payload.resourceLogs[0].scopeLogs[0].logRecords[0].attributes;
    const attrKeys = attrs.map((a) => a.key);

    expect(attrKeys).toContain("session.id");
    expect(attrKeys).toContain("model");
    expect(attrKeys).toContain("input_tokens");
    expect(attrKeys).toContain("output_tokens");
    expect(attrKeys).toContain("cost_usd");
    expect(attrKeys).toContain("duration_ms");
  });
});

describe("sendOtlpLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should send POST request to correct endpoint", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ processedEvents: 1 }),
    };
    vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

    const payload = createTestPayload("test-session");
    await sendOtlpLogs("https://api.revenium.ai", "hak_test123", payload);

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.revenium.ai/meter/v2/otlp/v1/logs",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "x-api-key": "hak_test123",
        }),
      }),
    );
  });

  it("should throw error on non-ok response", async () => {
    const mockResponse = {
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: vi.fn().mockResolvedValue("Invalid API key"),
    };
    vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

    const payload = createTestPayload("test-session");

    await expect(
      sendOtlpLogs("https://api.revenium.ai", "hak_invalid", payload),
    ).rejects.toThrow("OTLP request failed: 401 Unauthorized");
  });

  it("should throw error on network failure", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

    const payload = createTestPayload("test-session");

    await expect(
      sendOtlpLogs("https://api.revenium.ai", "hak_test123", payload),
    ).rejects.toThrow("Network error");
  });
});

describe("checkEndpointHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return healthy status on 200 response", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ processedEvents: 1 }),
    };
    vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

    const result = await checkEndpointHealth(
      "https://api.revenium.ai",
      "hak_test123",
    );

    expect(result.healthy).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.message).toContain("Endpoint healthy");
  });

  it("should return unhealthy status on 401 response", async () => {
    const mockResponse = {
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: vi.fn().mockResolvedValue("Invalid API key"),
    };
    vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

    const result = await checkEndpointHealth(
      "https://api.revenium.ai",
      "hak_invalid",
    );

    expect(result.healthy).toBe(false);
    expect(result.statusCode).toBe(401);
    expect(result.message).toContain("401");
  });

  it("should return unhealthy status on network error", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("Network timeout"));

    const result = await checkEndpointHealth(
      "https://api.revenium.ai",
      "hak_test123",
    );

    expect(result.healthy).toBe(false);
    expect(result.message).toContain("Network timeout");
  });

  it("should measure latency", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ id: "test-123" }),
    };
    vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

    const result = await checkEndpointHealth(
      "https://api.revenium.ai",
      "hak_test123",
    );

    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
