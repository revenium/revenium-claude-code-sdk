import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  backfillCommand,
  type BackfillDependencies,
} from "../../src/cli/commands/backfill.js";

vi.mock("ora", () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    text: "",
  })),
}));

describe("backfillCommand flow", () => {
  let mockDeps: BackfillDependencies;
  let mockExit: ReturnType<typeof vi.spyOn>;
  let mockConsoleLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExit = vi.spyOn(process, "exit").mockImplementation((code?: number) => {
      throw new Error(`process.exit(${code})`);
    });
    mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

    mockDeps = {
      loadConfig: vi.fn(),
      findJsonlFiles: vi.fn(),
      streamJsonlRecords: vi.fn(),
      sendBatchWithRetry: vi.fn(),
      homedir: vi.fn().mockReturnValue("/mock/home"),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should exit if no JSONL files found", async () => {
    mockDeps.loadConfig = vi.fn().mockResolvedValue({
      apiKey: "hak_test",
      endpoint: "https://api.test.com",
    });
    mockDeps.findJsonlFiles = vi
      .fn()
      .mockResolvedValue({ files: [], errors: [] });

    await expect(backfillCommand({}, mockDeps)).rejects.toThrow(
      "process.exit(1)",
    );
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("Searched in:"),
    );
  });

  it("should show discovery errors with verbose flag", async () => {
    mockDeps.loadConfig = vi.fn().mockResolvedValue({
      apiKey: "hak_test",
      endpoint: "https://api.test.com",
    });
    mockDeps.findJsonlFiles = vi.fn().mockResolvedValue({
      files: ["/mock/file.jsonl"],
      errors: ["Error reading directory"],
    });
    mockDeps.streamJsonlRecords = vi
      .fn()
      .mockImplementation(async function* () {
        yield {
          record: {
            sessionId: "s1",
            timestamp: "2024-01-15T10:00:00Z",
            model: "claude-3",
            inputTokens: 100,
            outputTokens: 50,
            cacheReadTokens: 0,
            cacheCreationTokens: 0,
          },
        };
      });
    mockDeps.sendBatchWithRetry = vi
      .fn()
      .mockResolvedValue({ success: true, attempts: 1 });

    await backfillCommand({ verbose: true }, mockDeps);

    expect(mockDeps.findJsonlFiles).toHaveBeenCalled();
  });

  it("should handle parse errors during file processing", async () => {
    mockDeps.loadConfig = vi.fn().mockResolvedValue({
      apiKey: "hak_test",
      endpoint: "https://api.test.com",
    });
    mockDeps.findJsonlFiles = vi.fn().mockResolvedValue({
      files: ["/mock/file.jsonl"],
      errors: [],
    });
    mockDeps.streamJsonlRecords = vi
      .fn()
      .mockImplementation(async function* () {
        yield { parseError: true };
        yield {
          record: {
            sessionId: "s1",
            timestamp: "2024-01-15T10:00:00Z",
            model: "claude-3",
            inputTokens: 100,
            outputTokens: 50,
            cacheReadTokens: 0,
            cacheCreationTokens: 0,
          },
        };
      });
    mockDeps.sendBatchWithRetry = vi
      .fn()
      .mockResolvedValue({ success: true, attempts: 1 });

    await backfillCommand({}, mockDeps);

    expect(mockDeps.sendBatchWithRetry).toHaveBeenCalledTimes(1);
  });

  it("should handle missing fields during file processing", async () => {
    mockDeps.loadConfig = vi.fn().mockResolvedValue({
      apiKey: "hak_test",
      endpoint: "https://api.test.com",
    });
    mockDeps.findJsonlFiles = vi.fn().mockResolvedValue({
      files: ["/mock/file.jsonl"],
      errors: [],
    });
    mockDeps.streamJsonlRecords = vi
      .fn()
      .mockImplementation(async function* () {
        yield { missingFields: true };
        yield {
          record: {
            sessionId: "s1",
            timestamp: "2024-01-15T10:00:00Z",
            model: "claude-3",
            inputTokens: 100,
            outputTokens: 50,
            cacheReadTokens: 0,
            cacheCreationTokens: 0,
          },
        };
      });
    mockDeps.sendBatchWithRetry = vi
      .fn()
      .mockResolvedValue({ success: true, attempts: 1 });

    await backfillCommand({}, mockDeps);

    expect(mockDeps.sendBatchWithRetry).toHaveBeenCalledTimes(1);
  });

  it("should handle file read error during stream", async () => {
    mockDeps.loadConfig = vi.fn().mockResolvedValue({
      apiKey: "hak_test",
      endpoint: "https://api.test.com",
    });
    mockDeps.findJsonlFiles = vi.fn().mockResolvedValue({
      files: ["/mock/file.jsonl", "/mock/file2.jsonl"],
      errors: [],
    });
    mockDeps.streamJsonlRecords = vi.fn().mockImplementation(async function* (
      file: string,
    ) {
      if (file === "/mock/file.jsonl") {
        throw new Error("ENOENT: no such file or directory");
      }
      yield {
        record: {
          sessionId: "s1",
          timestamp: "2024-01-15T10:00:00Z",
          model: "claude-3",
          inputTokens: 100,
          outputTokens: 50,
          cacheReadTokens: 0,
          cacheCreationTokens: 0,
        },
      };
    });
    mockDeps.sendBatchWithRetry = vi
      .fn()
      .mockResolvedValue({ success: true, attempts: 1 });

    await backfillCommand({ verbose: true }, mockDeps);

    expect(mockDeps.sendBatchWithRetry).toHaveBeenCalledTimes(1);
  });

  it("should return early if no records found after processing", async () => {
    mockDeps.loadConfig = vi.fn().mockResolvedValue({
      apiKey: "hak_test",
      endpoint: "https://api.test.com",
    });
    mockDeps.findJsonlFiles = vi.fn().mockResolvedValue({
      files: ["/mock/file.jsonl"],
      errors: [],
    });
    mockDeps.streamJsonlRecords = vi
      .fn()
      .mockImplementation(async function* () {
        return;
      });

    await backfillCommand({}, mockDeps);

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("No usage records found"),
    );
    expect(mockDeps.sendBatchWithRetry).not.toHaveBeenCalled();
  });

  it("should complete dry-run without sending data", async () => {
    mockDeps.loadConfig = vi.fn().mockResolvedValue({
      apiKey: "hak_test",
      endpoint: "https://api.test.com",
      subscriptionTier: "pro",
    });
    mockDeps.findJsonlFiles = vi.fn().mockResolvedValue({
      files: ["/mock/file.jsonl"],
      errors: [],
    });
    mockDeps.streamJsonlRecords = vi
      .fn()
      .mockImplementation(async function* () {
        yield {
          record: {
            sessionId: "s1",
            timestamp: "2024-01-15T10:00:00Z",
            model: "claude-3",
            inputTokens: 100,
            outputTokens: 50,
            cacheReadTokens: 0,
            cacheCreationTokens: 0,
          },
        };
      });

    await backfillCommand({ dryRun: true }, mockDeps);

    expect(mockDeps.sendBatchWithRetry).not.toHaveBeenCalled();
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("Dry run complete"),
    );
  });

  it("should send single batch successfully", async () => {
    mockDeps.loadConfig = vi.fn().mockResolvedValue({
      apiKey: "hak_test",
      endpoint: "https://api.test.com",
      subscriptionTier: "pro",
    });
    mockDeps.findJsonlFiles = vi.fn().mockResolvedValue({
      files: ["/mock/file.jsonl"],
      errors: [],
    });
    mockDeps.streamJsonlRecords = vi
      .fn()
      .mockImplementation(async function* () {
        yield {
          record: {
            sessionId: "s1",
            timestamp: "2024-01-15T10:00:00Z",
            model: "claude-3",
            inputTokens: 100,
            outputTokens: 50,
            cacheReadTokens: 0,
            cacheCreationTokens: 0,
          },
        };
      });
    mockDeps.sendBatchWithRetry = vi
      .fn()
      .mockResolvedValue({ success: true, attempts: 1 });

    await backfillCommand({ batchSize: 100 }, mockDeps);

    expect(mockDeps.sendBatchWithRetry).toHaveBeenCalledTimes(1);
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("Backfill complete"),
    );
  });

  it("should send multiple batches with delay", async () => {
    mockDeps.loadConfig = vi.fn().mockResolvedValue({
      apiKey: "hak_test",
      endpoint: "https://api.test.com",
      subscriptionTier: "pro",
    });
    mockDeps.findJsonlFiles = vi.fn().mockResolvedValue({
      files: ["/mock/file.jsonl"],
      errors: [],
    });
    mockDeps.streamJsonlRecords = vi
      .fn()
      .mockImplementation(async function* () {
        for (let i = 0; i < 150; i++) {
          yield {
            record: {
              sessionId: `s${i}`,
              timestamp: "2024-01-15T10:00:00Z",
              model: "claude-3",
              inputTokens: 100,
              outputTokens: 50,
              cacheReadTokens: 0,
              cacheCreationTokens: 0,
            },
          };
        }
      });
    mockDeps.sendBatchWithRetry = vi
      .fn()
      .mockResolvedValue({ success: true, attempts: 1 });

    await backfillCommand({ batchSize: 100, delay: 50 }, mockDeps);

    expect(mockDeps.sendBatchWithRetry).toHaveBeenCalledTimes(2);
  });

  it("should handle batch failure and show warning", async () => {
    mockDeps.loadConfig = vi.fn().mockResolvedValue({
      apiKey: "hak_test",
      endpoint: "https://api.test.com",
      subscriptionTier: "pro",
    });
    mockDeps.findJsonlFiles = vi.fn().mockResolvedValue({
      files: ["/mock/file.jsonl"],
      errors: [],
    });
    mockDeps.streamJsonlRecords = vi
      .fn()
      .mockImplementation(async function* () {
        yield {
          record: {
            sessionId: "s1",
            timestamp: "2024-01-15T10:00:00Z",
            model: "claude-3",
            inputTokens: 100,
            outputTokens: 50,
            cacheReadTokens: 0,
            cacheCreationTokens: 0,
          },
        };
      });
    mockDeps.sendBatchWithRetry = vi
      .fn()
      .mockResolvedValue({
        success: false,
        attempts: 3,
        error: "Network error",
      });

    await backfillCommand({}, mockDeps);

    expect(mockDeps.sendBatchWithRetry).toHaveBeenCalledTimes(1);
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining("Permanently Failed Batches"),
    );
  });
});
