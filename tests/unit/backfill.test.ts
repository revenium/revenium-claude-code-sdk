import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sleep,
  sendBatchWithRetry,
  backfillCommand,
  findJsonlFiles,
} from "../../src/cli/commands/backfill.js";
import * as clientModule from "../../src/core/api/client.js";
import * as loaderModule from "../../src/core/config/loader.js";
import type { OTLPLogsPayload } from "../../src/types/index.js";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

vi.mock("node:fs/promises");
vi.mock("node:fs");
vi.mock("node:readline");
vi.mock("../../src/core/config/loader.js");
vi.mock("../../src/core/api/client.js");
vi.mock("ora", () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    text: "",
  })),
}));

describe("sleep", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should resolve after specified delay", async () => {
    const promise = sleep(1000);

    // Fast-forward time
    vi.advanceTimersByTime(1000);

    await expect(promise).resolves.toBeUndefined();
  });

  it("should respect different delay values", async () => {
    const promise500 = sleep(500);
    const promise2000 = sleep(2000);

    vi.advanceTimersByTime(500);
    await expect(promise500).resolves.toBeUndefined();

    vi.advanceTimersByTime(1500);
    await expect(promise2000).resolves.toBeUndefined();
  });
});

describe("sendBatchWithRetry", () => {
  const mockEndpoint = "https://api.revenium.ai";
  const mockApiKey = "hak_test123";
  const mockPayload: OTLPLogsPayload = {
    resourceLogs: [
      {
        resource: { attributes: [] },
        scopeLogs: [
          {
            scope: { name: "test", version: "1.0" },
            logRecords: [],
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should succeed on first attempt", async () => {
    const sendOtlpLogsSpy = vi
      .spyOn(clientModule, "sendOtlpLogs")
      .mockResolvedValue({ processedEvents: 1 });

    const result = await sendBatchWithRetry(
      mockEndpoint,
      mockApiKey,
      mockPayload,
      3,
      false,
    );

    expect(result).toEqual({ success: true, attempts: 1 });
    expect(sendOtlpLogsSpy).toHaveBeenCalledTimes(1);
  });

  it("should succeed after retry", async () => {
    const sendOtlpLogsSpy = vi
      .spyOn(clientModule, "sendOtlpLogs")
      .mockRejectedValueOnce(new Error("Network error"))
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({ processedEvents: 1 });

    const promise = sendBatchWithRetry(
      mockEndpoint,
      mockApiKey,
      mockPayload,
      3,
      false,
    );

    // Fast-forward through backoff delays: 1000ms, 2000ms
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;

    expect(result).toEqual({ success: true, attempts: 3 });
    expect(sendOtlpLogsSpy).toHaveBeenCalledTimes(3);
  });

  it("should fail permanently after max retries", async () => {
    const sendOtlpLogsSpy = vi
      .spyOn(clientModule, "sendOtlpLogs")
      .mockRejectedValue(new Error("Permanent failure"));

    const promise = sendBatchWithRetry(
      mockEndpoint,
      mockApiKey,
      mockPayload,
      3,
      false,
    );

    // Fast-forward through all backoff delays: 1000ms, 2000ms
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;

    expect(result).toEqual({
      success: false,
      attempts: 3,
      error: "Permanent failure",
    });
    expect(sendOtlpLogsSpy).toHaveBeenCalledTimes(3);
  });

  it("should apply exponential backoff timing", async () => {
    const sendOtlpLogsSpy = vi
      .spyOn(clientModule, "sendOtlpLogs")
      .mockRejectedValue(new Error("Network error"));

    const promise = sendBatchWithRetry(
      mockEndpoint,
      mockApiKey,
      mockPayload,
      3,
      false,
    );

    // Verify backoff delays: 1000ms (2^0), 2000ms (2^1)
    await vi.advanceTimersByTimeAsync(999);
    expect(sendOtlpLogsSpy).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await vi.advanceTimersByTimeAsync(1999);
    expect(sendOtlpLogsSpy).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1);
    expect(sendOtlpLogsSpy).toHaveBeenCalledTimes(3);

    await promise;
  });

  it("should not retry on 401 Unauthorized", async () => {
    const sendOtlpLogsSpy = vi
      .spyOn(clientModule, "sendOtlpLogs")
      .mockRejectedValue(
        new Error("OTLP request failed: 401 Unauthorized - Invalid API key"),
      );

    const result = await sendBatchWithRetry(
      mockEndpoint,
      mockApiKey,
      mockPayload,
      3,
      false,
    );

    expect(result).toEqual({
      success: false,
      attempts: 1,
      error: "OTLP request failed: 401 Unauthorized - Invalid API key",
    });
    expect(sendOtlpLogsSpy).toHaveBeenCalledTimes(1);
  });

  it("should not retry on 403 Forbidden", async () => {
    const sendOtlpLogsSpy = vi
      .spyOn(clientModule, "sendOtlpLogs")
      .mockRejectedValue(
        new Error("OTLP request failed: 403 Forbidden - Access denied"),
      );

    const result = await sendBatchWithRetry(
      mockEndpoint,
      mockApiKey,
      mockPayload,
      3,
      false,
    );

    expect(result).toEqual({
      success: false,
      attempts: 1,
      error: "OTLP request failed: 403 Forbidden - Access denied",
    });
    expect(sendOtlpLogsSpy).toHaveBeenCalledTimes(1);
  });

  it("should not retry on 400 Bad Request", async () => {
    const sendOtlpLogsSpy = vi
      .spyOn(clientModule, "sendOtlpLogs")
      .mockRejectedValue(
        new Error("OTLP request failed: 400 Bad Request - Invalid payload"),
      );

    const result = await sendBatchWithRetry(
      mockEndpoint,
      mockApiKey,
      mockPayload,
      3,
      false,
    );

    expect(result).toEqual({
      success: false,
      attempts: 1,
      error: "OTLP request failed: 400 Bad Request - Invalid payload",
    });
    expect(sendOtlpLogsSpy).toHaveBeenCalledTimes(1);
  });

  it("should retry on 429 Too Many Requests", async () => {
    const sendOtlpLogsSpy = vi
      .spyOn(clientModule, "sendOtlpLogs")
      .mockRejectedValueOnce(
        new Error("OTLP request failed: 429 Too Many Requests - Rate limit"),
      )
      .mockResolvedValueOnce({ processedEvents: 1 });

    const promise = sendBatchWithRetry(
      mockEndpoint,
      mockApiKey,
      mockPayload,
      3,
      false,
    );

    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;

    expect(result).toEqual({ success: true, attempts: 2 });
    expect(sendOtlpLogsSpy).toHaveBeenCalledTimes(2);
  });

  it("should retry on 500 Internal Server Error", async () => {
    const sendOtlpLogsSpy = vi
      .spyOn(clientModule, "sendOtlpLogs")
      .mockRejectedValueOnce(
        new Error("OTLP request failed: 500 Internal Server Error"),
      )
      .mockResolvedValueOnce({ processedEvents: 1 });

    const promise = sendBatchWithRetry(
      mockEndpoint,
      mockApiKey,
      mockPayload,
      3,
      false,
    );

    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;

    expect(result).toEqual({ success: true, attempts: 2 });
    expect(sendOtlpLogsSpy).toHaveBeenCalledTimes(2);
  });
});

describe("backfillCommand", () => {
  let mockExit: any;
  let mockConsoleLog: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExit = vi.spyOn(process, "exit").mockImplementation((code?: number) => {
      throw new Error(`process.exit called with ${code}`);
    });
    mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should exit if config is not found", async () => {
    vi.mocked(loaderModule.loadConfig).mockResolvedValue(null);

    await expect(backfillCommand({})).rejects.toThrow(
      "process.exit called with 1",
    );

    expect(loaderModule.loadConfig).toHaveBeenCalled();
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("Configuration not found"),
    );
  });

  it("should exit if since date is invalid", async () => {
    vi.mocked(loaderModule.loadConfig).mockResolvedValue({
      apiKey: "hak_test123",
      endpoint: "https://api.revenium.ai",
    });

    await expect(backfillCommand({ since: "invalid" })).rejects.toThrow(
      "process.exit called with 1",
    );

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("Invalid --since value"),
    );
  });
});
