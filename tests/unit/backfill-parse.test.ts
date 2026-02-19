import { describe, it, expect } from "vitest";
import {
  parseJsonlLine,
  calculateStatistics,
} from "../../src/cli/commands/backfill.js";

describe("parseJsonlLine", () => {
  const sinceDate = new Date("2024-01-01T00:00:00Z");

  it("should return empty object for empty line", () => {
    const result = parseJsonlLine("", null);
    expect(result).toEqual({});
  });

  it("should return empty object for whitespace-only line", () => {
    const result = parseJsonlLine("   ", null);
    expect(result).toEqual({});
  });

  it("should return parseError for invalid JSON", () => {
    const result = parseJsonlLine("invalid json", null);
    expect(result).toEqual({ parseError: true });
  });

  it("should return empty object for non-assistant type", () => {
    const line = JSON.stringify({ type: "user", message: { usage: {} } });
    const result = parseJsonlLine(line, null);
    expect(result).toEqual({});
  });

  it("should return empty object for missing usage", () => {
    const line = JSON.stringify({ type: "assistant", message: {} });
    const result = parseJsonlLine(line, null);
    expect(result).toEqual({});
  });

  it("should return missingFields for missing timestamp", () => {
    const line = JSON.stringify({
      type: "assistant",
      sessionId: "session-123",
      message: { model: "claude-3", usage: { input_tokens: 10 } },
    });
    const result = parseJsonlLine(line, null);
    expect(result).toEqual({ missingFields: true });
  });

  it("should return missingFields for missing sessionId", () => {
    const line = JSON.stringify({
      type: "assistant",
      timestamp: "2024-01-15T10:00:00Z",
      message: { model: "claude-3", usage: { input_tokens: 10 } },
    });
    const result = parseJsonlLine(line, null);
    expect(result).toEqual({ missingFields: true });
  });

  it("should return missingFields for missing model", () => {
    const line = JSON.stringify({
      type: "assistant",
      sessionId: "session-123",
      timestamp: "2024-01-15T10:00:00Z",
      message: { usage: { input_tokens: 10 } },
    });
    const result = parseJsonlLine(line, null);
    expect(result).toEqual({ missingFields: true });
  });

  it("should return empty object for invalid timestamp", () => {
    const line = JSON.stringify({
      type: "assistant",
      sessionId: "session-123",
      timestamp: "invalid-date",
      message: { model: "claude-3", usage: { input_tokens: 10 } },
    });
    const result = parseJsonlLine(line, null);
    expect(result).toEqual({});
  });

  it("should return empty object for date before sinceDate", () => {
    const line = JSON.stringify({
      type: "assistant",
      sessionId: "session-123",
      timestamp: "2023-12-31T23:59:59Z",
      message: { model: "claude-3", usage: { input_tokens: 10 } },
    });
    const result = parseJsonlLine(line, sinceDate);
    expect(result).toEqual({});
  });

  it("should return empty object for zero tokens", () => {
    const line = JSON.stringify({
      type: "assistant",
      sessionId: "session-123",
      timestamp: "2024-01-15T10:00:00Z",
      message: {
        model: "claude-3",
        usage: {
          input_tokens: 0,
          output_tokens: 0,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0,
        },
      },
    });
    const result = parseJsonlLine(line, null);
    expect(result).toEqual({});
  });

  it("should parse valid record with all token types", () => {
    const line = JSON.stringify({
      type: "assistant",
      sessionId: "session-123",
      timestamp: "2024-01-15T10:00:00Z",
      message: {
        model: "claude-3",
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          cache_read_input_tokens: 20,
          cache_creation_input_tokens: 10,
        },
      },
    });
    const result = parseJsonlLine(line, null);
    expect(result).toEqual({
      record: {
        sessionId: "session-123",
        timestamp: "2024-01-15T10:00:00Z",
        model: "claude-3",
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 20,
        cacheCreationTokens: 10,
      },
    });
  });

  it("should parse valid record with missing optional token types", () => {
    const line = JSON.stringify({
      type: "assistant",
      sessionId: "session-123",
      timestamp: "2024-01-15T10:00:00Z",
      message: {
        model: "claude-3",
        usage: {
          input_tokens: 100,
          output_tokens: 50,
        },
      },
    });
    const result = parseJsonlLine(line, null);
    expect(result).toEqual({
      record: {
        sessionId: "session-123",
        timestamp: "2024-01-15T10:00:00Z",
        model: "claude-3",
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
      },
    });
  });
});

describe("calculateStatistics", () => {
  it("should handle empty array", () => {
    const stats = calculateStatistics([]);

    expect(stats).toEqual({
      totalRecords: 0,
      oldestTimestamp: "",
      newestTimestamp: "",
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCacheReadTokens: 0,
      totalCacheCreationTokens: 0,
    });
  });

  it("should calculate statistics for single record", () => {
    const records = [
      {
        sessionId: "session-1",
        timestamp: "2024-01-15T10:00:00Z",
        model: "claude-3",
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 20,
        cacheCreationTokens: 10,
      },
    ];

    const stats = calculateStatistics(records);

    expect(stats).toEqual({
      totalRecords: 1,
      oldestTimestamp: "2024-01-15T10:00:00Z",
      newestTimestamp: "2024-01-15T10:00:00Z",
      totalInputTokens: 100,
      totalOutputTokens: 50,
      totalCacheReadTokens: 20,
      totalCacheCreationTokens: 10,
    });
  });

  it("should calculate statistics for multiple records", () => {
    const records = [
      {
        sessionId: "session-1",
        timestamp: "2024-01-15T10:00:00Z",
        model: "claude-3",
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 20,
        cacheCreationTokens: 10,
      },
      {
        sessionId: "session-2",
        timestamp: "2024-01-16T12:00:00Z",
        model: "claude-3",
        inputTokens: 200,
        outputTokens: 100,
        cacheReadTokens: 40,
        cacheCreationTokens: 20,
      },
      {
        sessionId: "session-3",
        timestamp: "2024-01-14T08:00:00Z",
        model: "claude-3",
        inputTokens: 50,
        outputTokens: 25,
        cacheReadTokens: 10,
        cacheCreationTokens: 5,
      },
    ];

    const stats = calculateStatistics(records);

    expect(stats).toEqual({
      totalRecords: 3,
      oldestTimestamp: "2024-01-14T08:00:00Z",
      newestTimestamp: "2024-01-16T12:00:00Z",
      totalInputTokens: 350,
      totalOutputTokens: 175,
      totalCacheReadTokens: 70,
      totalCacheCreationTokens: 35,
    });
  });

  it("should handle records with zero tokens", () => {
    const records = [
      {
        sessionId: "session-1",
        timestamp: "2024-01-15T10:00:00Z",
        model: "claude-3",
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
      },
    ];

    const stats = calculateStatistics(records);

    expect(stats).toEqual({
      totalRecords: 1,
      oldestTimestamp: "2024-01-15T10:00:00Z",
      newestTimestamp: "2024-01-15T10:00:00Z",
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCacheReadTokens: 0,
      totalCacheCreationTokens: 0,
    });
  });
});
