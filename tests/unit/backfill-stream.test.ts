import { describe, it, expect, vi, beforeEach } from "vitest";
import { Readable } from "node:stream";
import * as fs from "node:fs";
import * as readline from "node:readline";
import { streamJsonlRecords } from "../../src/cli/commands/backfill.js";

vi.mock("node:fs");
vi.mock("node:readline");

const mockCreateReadStream = vi.mocked(fs.createReadStream);
const mockCreateInterface = vi.mocked(readline.createInterface);

describe("streamJsonlRecords", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupStreamTest(lines: string[]) {
    const mockStream = Readable.from(lines);
    Object.assign(mockStream, { destroy: vi.fn() });
    mockCreateReadStream.mockReturnValue(mockStream as any);

    const mockRl = {
      [Symbol.asyncIterator]: async function* () {
        for (const line of lines) {
          yield line;
        }
      },
      close: vi.fn(),
    };

    mockCreateInterface.mockReturnValue(mockRl as any);

    return { mockStream, mockRl };
  }

  it("should parse valid JSONL records", async () => {
    const lines = [
      JSON.stringify({
        type: "assistant",
        sessionId: "session-1",
        timestamp: "2024-01-15T10:00:00Z",
        message: {
          model: "claude-3",
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
        },
      }),
    ];

    setupStreamTest(lines);

    const results = [];
    for await (const result of streamJsonlRecords("/fake/path.jsonl", null)) {
      results.push(result);
    }

    expect(results).toHaveLength(1);
    expect(results[0]).toHaveProperty("record");
    expect(results[0].record).toMatchObject({
      sessionId: "session-1",
      model: "claude-3",
      inputTokens: 100,
      outputTokens: 50,
    });
  });

  it("should handle parse errors", async () => {
    const lines = ["invalid json", "{ incomplete"];

    setupStreamTest(lines);

    const results = [];
    for await (const result of streamJsonlRecords("/fake/path.jsonl", null)) {
      results.push(result);
    }

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ parseError: true });
    expect(results[1]).toEqual({ parseError: true });
  });

  it("should skip empty lines", async () => {
    const lines = [
      "",
      "   ",
      JSON.stringify({
        type: "assistant",
        sessionId: "session-1",
        timestamp: "2024-01-15T10:00:00Z",
        message: {
          model: "claude-3",
          usage: { input_tokens: 100, output_tokens: 50 },
        },
      }),
    ];

    setupStreamTest(lines);

    const results = [];
    for await (const result of streamJsonlRecords("/fake/path.jsonl", null)) {
      results.push(result);
    }

    expect(results).toHaveLength(1);
    expect(results[0]).toHaveProperty("record");
  });

  it("should filter by sinceDate", async () => {
    const lines = [
      JSON.stringify({
        type: "assistant",
        sessionId: "session-1",
        timestamp: "2023-12-31T23:59:59Z",
        message: {
          model: "claude-3",
          usage: { input_tokens: 100, output_tokens: 50 },
        },
      }),
      JSON.stringify({
        type: "assistant",
        sessionId: "session-2",
        timestamp: "2024-01-15T10:00:00Z",
        message: {
          model: "claude-3",
          usage: { input_tokens: 100, output_tokens: 50 },
        },
      }),
    ];

    setupStreamTest(lines);

    const sinceDate = new Date("2024-01-01T00:00:00Z");
    const results = [];
    for await (const result of streamJsonlRecords(
      "/fake/path.jsonl",
      sinceDate,
    )) {
      results.push(result);
    }

    expect(results).toHaveLength(1);
    expect(results[0].record?.sessionId).toBe("session-2");
  });
});
