import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readdir } from "node:fs/promises";
import {
  parseRelativeDate,
  parseSinceDate,
  toUnixNano,
  sanitizeErrorMessage,
  isRetryableError,
  findJsonlFiles,
  createOtlpPayload,
} from "../../src/cli/commands/backfill.js";

vi.mock("node:fs/promises");

describe("parseRelativeDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should parse days correctly", () => {
    const result = parseRelativeDate("7d");
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe("2024-01-08T12:00:00.000Z");
  });

  it("should parse weeks correctly", () => {
    const result = parseRelativeDate("2w");
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe("2024-01-01T12:00:00.000Z");
  });

  it("should parse months correctly", () => {
    const result = parseRelativeDate("1m");
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe("2023-12-15T12:00:00.000Z");
  });

  it("should parse uppercase M for months", () => {
    const result = parseRelativeDate("3M");
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe("2023-10-15T12:00:00.000Z");
  });

  it("should parse years correctly", () => {
    const result = parseRelativeDate("1y");
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe("2023-01-15T12:00:00.000Z");
  });

  it("should return null for invalid format", () => {
    expect(parseRelativeDate("invalid")).toBeNull();
    expect(parseRelativeDate("7")).toBeNull();
    expect(parseRelativeDate("d7")).toBeNull();
    expect(parseRelativeDate("")).toBeNull();
  });
});

describe("parseSinceDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should parse relative date format", () => {
    const result = parseSinceDate("7d");
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe("2024-01-08T12:00:00.000Z");
  });

  it("should parse ISO date format", () => {
    const result = parseSinceDate("2024-01-01T00:00:00Z");
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe("2024-01-01T00:00:00.000Z");
  });

  it("should return null for invalid date", () => {
    expect(parseSinceDate("invalid-date")).toBeNull();
  });
});

describe("toUnixNano", () => {
  it("should convert valid timestamp to nanoseconds", () => {
    const result = toUnixNano("2024-01-01T00:00:00.000Z");
    expect(result).toBe("1704067200000000000");
  });

  it("should return null for invalid timestamp", () => {
    expect(toUnixNano("invalid")).toBeNull();
  });

  it("should handle milliseconds precision", () => {
    const result = toUnixNano("2024-01-01T00:00:00.123Z");
    expect(result).toBe("1704067200123000000");
  });
});

describe("sanitizeErrorMessage", () => {
  it("should truncate long error messages", () => {
    const longMessage = "a".repeat(600);
    const result = sanitizeErrorMessage(longMessage);
    expect(result.length).toBe(503);
    expect(result.endsWith("...")).toBe(true);
  });

  it("should not truncate short error messages", () => {
    const shortMessage = "Short error";
    const result = sanitizeErrorMessage(shortMessage);
    expect(result).toBe(shortMessage);
  });

  it("should handle exactly 500 characters", () => {
    const message = "a".repeat(500);
    const result = sanitizeErrorMessage(message);
    expect(result).toBe(message);
  });
});

describe("isRetryableError", () => {
  it("should return true for 429 status code", () => {
    expect(isRetryableError("OTLP request failed: 429 Too Many Requests")).toBe(
      true,
    );
  });

  it("should return false for 4xx status codes except 429", () => {
    expect(isRetryableError("OTLP request failed: 400 Bad Request")).toBe(
      false,
    );
    expect(isRetryableError("OTLP request failed: 401 Unauthorized")).toBe(
      false,
    );
    expect(isRetryableError("OTLP request failed: 403 Forbidden")).toBe(false);
    expect(isRetryableError("OTLP request failed: 404 Not Found")).toBe(false);
  });

  it("should return true for 5xx status codes", () => {
    expect(
      isRetryableError("OTLP request failed: 500 Internal Server Error"),
    ).toBe(true);
    expect(isRetryableError("OTLP request failed: 502 Bad Gateway")).toBe(true);
    expect(
      isRetryableError("OTLP request failed: 503 Service Unavailable"),
    ).toBe(true);
  });

  it("should return true for errors without status code", () => {
    expect(isRetryableError("Network error")).toBe(true);
    expect(isRetryableError("Connection timeout")).toBe(true);
  });
});

describe("findJsonlFiles", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should find jsonl files in directory", async () => {
    vi.mocked(readdir).mockResolvedValue([
      { name: "file1.jsonl", isFile: () => true, isDirectory: () => false },
      { name: "file2.jsonl", isFile: () => true, isDirectory: () => false },
      { name: "file3.txt", isFile: () => true, isDirectory: () => false },
    ] as any);

    const result = await findJsonlFiles("/test/dir");

    expect(result.files).toHaveLength(2);
    expect(result.files).toContain("/test/dir/file1.jsonl");
    expect(result.files).toContain("/test/dir/file2.jsonl");
    expect(result.errors).toHaveLength(0);
  });

  it("should recursively search subdirectories", async () => {
    vi.mocked(readdir)
      .mockResolvedValueOnce([
        { name: "file1.jsonl", isFile: () => true, isDirectory: () => false },
        { name: "subdir", isFile: () => false, isDirectory: () => true },
      ] as any)
      .mockResolvedValueOnce([
        { name: "file2.jsonl", isFile: () => true, isDirectory: () => false },
      ] as any);

    const result = await findJsonlFiles("/test/dir");

    expect(result.files).toHaveLength(2);
    expect(result.files).toContain("/test/dir/file1.jsonl");
    expect(result.files).toContain("/test/dir/subdir/file2.jsonl");
  });

  it("should collect errors when directory read fails", async () => {
    vi.mocked(readdir).mockRejectedValue(new Error("Permission denied"));

    const result = await findJsonlFiles("/test/dir");

    expect(result.files).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Permission denied");
  });

  it("should skip non-jsonl files", async () => {
    vi.mocked(readdir).mockResolvedValue([
      { name: "file1.json", isFile: () => true, isDirectory: () => false },
      { name: "file2.txt", isFile: () => true, isDirectory: () => false },
      { name: "file3.log", isFile: () => true, isDirectory: () => false },
    ] as any);

    const result = await findJsonlFiles("/test/dir");

    expect(result.files).toHaveLength(0);
  });
});

describe("createOtlpPayload", () => {
  it("should create payload with required fields", () => {
    const records = [
      {
        sessionId: "session-123",
        timestamp: "2024-01-01T00:00:00.000Z",
        model: "claude-3-5-sonnet-20241022",
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
      },
    ];

    const payload = createOtlpPayload(records, { costMultiplier: 1.0 });

    expect(payload.resourceLogs).toHaveLength(1);
    expect(payload.resourceLogs[0].scopeLogs).toHaveLength(1);
    expect(payload.resourceLogs[0].scopeLogs[0].logRecords).toHaveLength(1);

    const logRecord = payload.resourceLogs[0].scopeLogs[0].logRecords[0];
    const attrs = logRecord.attributes;

    expect(attrs.find((a) => a.key === "session.id")?.value.stringValue).toBe(
      "session-123",
    );
    expect(attrs.find((a) => a.key === "model")?.value.stringValue).toBe(
      "claude-3-5-sonnet-20241022",
    );
    expect(attrs.find((a) => a.key === "input_tokens")?.value.intValue).toBe(
      100,
    );
    expect(attrs.find((a) => a.key === "output_tokens")?.value.intValue).toBe(
      50,
    );
  });

  it("should include optional email field", () => {
    const records = [
      {
        sessionId: "session-123",
        timestamp: "2024-01-01T00:00:00.000Z",
        model: "claude-3-5-sonnet-20241022",
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
      },
    ];

    const payload = createOtlpPayload(records, {
      costMultiplier: 1.0,
      email: "test@example.com",
    });

    const logRecord = payload.resourceLogs[0].scopeLogs[0].logRecords[0];
    const attrs = logRecord.attributes;

    expect(attrs.find((a) => a.key === "user.email")?.value.stringValue).toBe(
      "test@example.com",
    );
  });

  it("should include optional organizationName and productName", () => {
    const records = [
      {
        sessionId: "session-123",
        timestamp: "2024-01-01T00:00:00.000Z",
        model: "claude-3-5-sonnet-20241022",
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
      },
    ];

    const payload = createOtlpPayload(records, {
      costMultiplier: 1.0,
      organizationName: "org-123",
      productName: "prod-456",
    });

    const logRecord = payload.resourceLogs[0].scopeLogs[0].logRecords[0];
    const attrs = logRecord.attributes;

    expect(
      attrs.find((a) => a.key === "organization.name")?.value.stringValue,
    ).toBe("org-123");
    expect(attrs.find((a) => a.key === "product.name")?.value.stringValue).toBe(
      "prod-456",
    );
  });

  it("should support deprecated organizationId and productId fields", () => {
    const records = [
      {
        sessionId: "session-123",
        timestamp: "2024-01-01T00:00:00.000Z",
        model: "claude-3-5-sonnet-20241022",
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
      },
    ];

    const payload = createOtlpPayload(records, {
      costMultiplier: 1.0,
      organizationId: "org-legacy",
      productId: "prod-legacy",
    });

    const logRecord = payload.resourceLogs[0].scopeLogs[0].logRecords[0];
    const attrs = logRecord.attributes;

    expect(
      attrs.find((a) => a.key === "organization.name")?.value.stringValue,
    ).toBe("org-legacy");
    expect(attrs.find((a) => a.key === "product.name")?.value.stringValue).toBe(
      "prod-legacy",
    );
  });

  it("should filter out records with invalid timestamps", () => {
    const records = [
      {
        sessionId: "session-123",
        timestamp: "2024-01-01T00:00:00.000Z",
        model: "claude-3-5-sonnet-20241022",
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
      },
      {
        sessionId: "session-456",
        timestamp: "invalid-timestamp",
        model: "claude-3-5-sonnet-20241022",
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
      },
    ];

    const payload = createOtlpPayload(records, { costMultiplier: 1.0 });

    expect(payload.resourceLogs[0].scopeLogs[0].logRecords).toHaveLength(1);
  });

  it("should handle multiple records", () => {
    const records = [
      {
        sessionId: "session-1",
        timestamp: "2024-01-01T00:00:00.000Z",
        model: "claude-3-5-sonnet-20241022",
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
      },
      {
        sessionId: "session-2",
        timestamp: "2024-01-01T01:00:00.000Z",
        model: "claude-3-5-sonnet-20241022",
        inputTokens: 200,
        outputTokens: 100,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
      },
    ];

    const payload = createOtlpPayload(records, { costMultiplier: 1.0 });

    expect(payload.resourceLogs[0].scopeLogs[0].logRecords).toHaveLength(2);
  });
});
