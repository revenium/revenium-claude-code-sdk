import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { statusCommand } from "../../src/cli/commands/status.js";
import * as loader from "../../src/core/config/loader.js";
import * as client from "../../src/core/api/client.js";
import * as detector from "../../src/core/shell/detector.js";

vi.mock("../../src/core/config/loader.js");
vi.mock("../../src/core/api/client.js");
vi.mock("../../src/core/shell/detector.js");
vi.mock("chalk", () => ({
  default: {
    bold: (str: string) => str,
    green: (str: string) => str,
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

describe("statusCommand", () => {
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

  it("should exit with error when config file does not exist", async () => {
    vi.mocked(loader.configExists).mockReturnValue(false);
    vi.mocked(loader.getConfigPath).mockReturnValue(
      "/home/user/.claude/revenium.env",
    );

    await expect(statusCommand()).rejects.toThrow(
      'process.exit unexpectedly called with "1"',
    );
  });

  it("should exit with error when config cannot be parsed", async () => {
    vi.mocked(loader.configExists).mockReturnValue(true);
    vi.mocked(loader.getConfigPath).mockReturnValue(
      "/home/user/.claude/revenium.env",
    );
    vi.mocked(loader.loadConfig).mockResolvedValue(null);

    await expect(statusCommand()).rejects.toThrow(
      'process.exit unexpectedly called with "1"',
    );
  });

  it("should display config when file exists and is valid", async () => {
    vi.mocked(loader.configExists).mockReturnValue(true);
    vi.mocked(loader.getConfigPath).mockReturnValue(
      "/home/user/.claude/revenium.env",
    );
    vi.mocked(loader.loadConfig).mockResolvedValue({
      apiKey: "hak_test123",
      endpoint: "https://api.revenium.ai",
      email: "test@example.com",
      subscriptionTier: "pro",
    });
    vi.mocked(loader.isEnvLoaded).mockReturnValue(true);
    vi.mocked(detector.detectShell).mockReturnValue("bash");
    vi.mocked(detector.getProfilePath).mockReturnValue("/home/user/.bashrc");
    vi.mocked(client.checkEndpointHealth).mockResolvedValue({
      healthy: true,
      statusCode: 200,
      message: "OK",
      latencyMs: 100,
    });

    await statusCommand();

    expect(loader.loadConfig).toHaveBeenCalled();
    expect(client.checkEndpointHealth).toHaveBeenCalled();
  });

  it("should call checkEndpointHealth with correct parameters", async () => {
    vi.mocked(loader.configExists).mockReturnValue(true);
    vi.mocked(loader.getConfigPath).mockReturnValue(
      "/home/user/.claude/revenium.env",
    );
    vi.mocked(loader.loadConfig).mockResolvedValue({
      apiKey: "hak_test123",
      endpoint: "https://api.revenium.ai",
      organizationId: "org-123",
      productId: "prod-456",
    });
    vi.mocked(loader.isEnvLoaded).mockReturnValue(true);
    vi.mocked(detector.detectShell).mockReturnValue("bash");
    vi.mocked(detector.getProfilePath).mockReturnValue("/home/user/.bashrc");
    vi.mocked(client.checkEndpointHealth).mockResolvedValue({
      healthy: true,
      statusCode: 200,
      message: "OK",
      latencyMs: 100,
    });

    await statusCommand();

    expect(client.checkEndpointHealth).toHaveBeenCalledWith(
      "https://api.revenium.ai",
      "hak_test123",
      expect.objectContaining({
        organizationName: "org-123",
        productName: "prod-456",
      }),
    );
  });

  it("should handle unhealthy endpoint", async () => {
    vi.mocked(loader.configExists).mockReturnValue(true);
    vi.mocked(loader.getConfigPath).mockReturnValue(
      "/home/user/.claude/revenium.env",
    );
    vi.mocked(loader.loadConfig).mockResolvedValue({
      apiKey: "hak_test123",
      endpoint: "https://api.revenium.ai",
    });
    vi.mocked(loader.isEnvLoaded).mockReturnValue(false);
    vi.mocked(detector.detectShell).mockReturnValue("zsh");
    vi.mocked(detector.getProfilePath).mockReturnValue("/home/user/.zshrc");
    vi.mocked(client.checkEndpointHealth).mockResolvedValue({
      healthy: false,
      statusCode: 500,
      message: "Internal Server Error",
      latencyMs: 200,
    });

    await statusCommand();

    expect(client.checkEndpointHealth).toHaveBeenCalled();
  });
});
