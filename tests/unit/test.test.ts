import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { testCommand } from "../../src/cli/commands/test.js";
import * as loader from "../../src/core/config/loader.js";
import * as client from "../../src/core/api/client.js";

vi.mock("../../src/core/config/loader.js");
vi.mock("../../src/core/api/client.js");
vi.mock("chalk", () => ({
  default: {
    bold: (str: string) => str,
    green: {
      bold: (str: string) => str,
    },
    red: (str: string) => str,
    yellow: (str: string) => str,
    dim: (str: string) => str,
  },
}));
vi.mock("ora", () => ({
  default: () => ({
    start: () => ({
      succeed: vi.fn(),
      fail: vi.fn(),
    }),
  }),
}));

describe("testCommand", () => {
  const mockExit = vi
    .spyOn(process, "exit")
    .mockImplementation((code?: number) => {
      throw new Error(`process.exit unexpectedly called with "${code}"`);
    });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should exit with error when config does not exist", async () => {
    vi.mocked(loader.configExists).mockReturnValue(false);

    await expect(testCommand()).rejects.toThrow(
      'process.exit unexpectedly called with "1"',
    );
  });

  it("should exit with error when config cannot be loaded", async () => {
    vi.mocked(loader.configExists).mockReturnValue(true);
    vi.mocked(loader.loadConfig).mockResolvedValue(null);

    await expect(testCommand()).rejects.toThrow(
      'process.exit unexpectedly called with "1"',
    );
  });

  it("should send test metric successfully", async () => {
    vi.mocked(loader.configExists).mockReturnValue(true);
    vi.mocked(loader.loadConfig).mockResolvedValue({
      apiKey: "hak_test123",
      endpoint: "https://api.revenium.ai",
      email: "test@example.com",
    });
    vi.mocked(client.generateTestSessionId).mockReturnValue("test-session-123");
    vi.mocked(client.createTestPayload).mockReturnValue({
      resourceLogs: [],
    });
    vi.mocked(client.sendOtlpLogs).mockResolvedValue({
      id: "metric-123",
      resourceType: "claude-code-metering",
      processedEvents: 1,
      created: "2024-01-01T00:00:00Z",
    });

    await testCommand();

    expect(client.generateTestSessionId).toHaveBeenCalled();
    expect(client.createTestPayload).toHaveBeenCalledWith(
      "test-session-123",
      expect.objectContaining({
        email: "test@example.com",
      }),
    );
    expect(client.sendOtlpLogs).toHaveBeenCalledWith(
      "https://api.revenium.ai",
      "hak_test123",
      expect.any(Object),
    );
  });

  it("should include organizationId and productId in payload", async () => {
    vi.mocked(loader.configExists).mockReturnValue(true);
    vi.mocked(loader.loadConfig).mockResolvedValue({
      apiKey: "hak_test123",
      endpoint: "https://api.revenium.ai",
      organizationId: "org-123",
      productId: "prod-456",
    });
    vi.mocked(client.generateTestSessionId).mockReturnValue("test-session-123");
    vi.mocked(client.createTestPayload).mockReturnValue({
      resourceLogs: [],
    });
    vi.mocked(client.sendOtlpLogs).mockResolvedValue({
      id: "metric-123",
      resourceType: "claude-code-metering",
      processedEvents: 1,
      created: "2024-01-01T00:00:00Z",
    });

    await testCommand();

    expect(client.createTestPayload).toHaveBeenCalledWith(
      "test-session-123",
      expect.objectContaining({
        organizationId: "org-123",
        productId: "prod-456",
      }),
    );
  });

  it("should handle verbose option", async () => {
    vi.mocked(loader.configExists).mockReturnValue(true);
    vi.mocked(loader.loadConfig).mockResolvedValue({
      apiKey: "hak_test123",
      endpoint: "https://api.revenium.ai",
    });
    vi.mocked(client.generateTestSessionId).mockReturnValue("test-session-123");
    vi.mocked(client.createTestPayload).mockReturnValue({
      resourceLogs: [],
    });
    vi.mocked(client.sendOtlpLogs).mockResolvedValue({
      id: "metric-123",
      resourceType: "claude-code-metering",
      processedEvents: 1,
      created: "2024-01-01T00:00:00Z",
    });

    await testCommand({ verbose: true });

    expect(client.sendOtlpLogs).toHaveBeenCalled();
  });

  it("should exit with error when sendOtlpLogs fails", async () => {
    vi.mocked(loader.configExists).mockReturnValue(true);
    vi.mocked(loader.loadConfig).mockResolvedValue({
      apiKey: "hak_test123",
      endpoint: "https://api.revenium.ai",
    });
    vi.mocked(client.generateTestSessionId).mockReturnValue("test-session-123");
    vi.mocked(client.createTestPayload).mockReturnValue({
      resourceLogs: [],
    });
    vi.mocked(client.sendOtlpLogs).mockRejectedValue(
      new Error("Network error"),
    );

    await expect(testCommand()).rejects.toThrow(
      'process.exit unexpectedly called with "1"',
    );
  });
});

