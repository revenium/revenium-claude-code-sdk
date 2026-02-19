import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setupCommand } from "../../src/cli/commands/setup.js";
import { backfillCommand } from "../../src/cli/commands/backfill.js";
import * as loader from "../../src/core/config/loader.js";
import * as writer from "../../src/core/config/writer.js";
import * as client from "../../src/core/api/client.js";
import * as profileUpdater from "../../src/core/shell/profile-updater.js";
import * as detector from "../../src/core/shell/detector.js";
import inquirer from "inquirer";
import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";

vi.mock("inquirer");
vi.mock("../../src/core/config/loader.js");
vi.mock("../../src/core/config/writer.js");
vi.mock("../../src/core/api/client.js");
vi.mock("../../src/core/shell/profile-updater.js");
vi.mock("../../src/core/shell/detector.js");
vi.mock("node:fs/promises");
vi.mock("node:fs");
vi.mock("ora", () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    text: "",
  })),
}));

describe("CLI Commands Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation((() => {}) as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("setup command end-to-end", () => {
    it("should complete full setup flow successfully", async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        apiKey: "hak_test123",
        endpoint: "https://api.revenium.ai",
        email: "test@example.com",
        tier: "pro",
      } as any);

      vi.mocked(client.checkEndpointHealth).mockResolvedValue({
        healthy: true,
        statusCode: 200,
        message: "OK",
        latencyMs: 50,
      });

      vi.mocked(writer.writeConfig).mockResolvedValue(
        "/home/user/.claude/revenium.env",
      );

      vi.mocked(profileUpdater.updateShellProfile).mockResolvedValue({
        success: true,
        shellType: "bash",
        profilePath: "/home/user/.bashrc",
        message: "Added configuration to /home/user/.bashrc",
      });

      await setupCommand({});

      expect(inquirer.prompt).toHaveBeenCalled();
      expect(client.checkEndpointHealth).toHaveBeenCalledWith(
        "https://api.revenium.ai",
        "hak_test123",
      );
      expect(writer.writeConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: "hak_test123",
          endpoint: "https://api.revenium.ai",
          email: "test@example.com",
          subscriptionTier: "pro",
        }),
      );
      expect(profileUpdater.updateShellProfile).toHaveBeenCalled();
    });

    it("should handle health check failure gracefully", async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        apiKey: "hak_invalid",
        endpoint: "https://api.revenium.ai",
      } as any);

      vi.mocked(client.checkEndpointHealth).mockResolvedValue({
        healthy: false,
        statusCode: 401,
        message: "Unauthorized",
        latencyMs: 100,
      });

      await setupCommand({});

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should skip shell update when option is set", async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        apiKey: "hak_test123",
        endpoint: "https://api.revenium.ai",
      } as any);

      vi.mocked(client.checkEndpointHealth).mockResolvedValue({
        healthy: true,
        statusCode: 200,
        message: "OK",
        latencyMs: 50,
      });

      vi.mocked(writer.writeConfig).mockResolvedValue(
        "/home/user/.claude/revenium.env",
      );

      await setupCommand({ skipShellUpdate: true });

      expect(profileUpdater.updateShellProfile).not.toHaveBeenCalled();
    });
  });

  describe("backfill command end-to-end", () => {
    it("should exit when config is not found", async () => {
      vi.mocked(loader.loadConfig).mockResolvedValue(null);
      vi.mocked(process.exit).mockImplementation((() => {
        throw new Error("process.exit called");
      }) as any);

      await expect(backfillCommand({})).rejects.toThrow("process.exit called");

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Configuration not found"),
      );
    });

    it("should handle dry-run mode", async () => {
      vi.mocked(loader.loadConfig).mockResolvedValue({
        apiKey: "hak_test123",
        endpoint: "https://api.revenium.ai",
        subscriptionTier: "pro",
      });

      vi.mocked(readdir).mockResolvedValue([] as any);
      vi.mocked(existsSync).mockReturnValue(false);

      await backfillCommand({ dryRun: true });

      expect(client.sendOtlpLogs).not.toHaveBeenCalled();
    });
  });
});
