import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("inquirer");
vi.mock("../../src/core/config/writer.js");
vi.mock("../../src/core/api/client.js");
vi.mock("../../src/core/shell/profile-updater.js");
vi.mock("../../src/core/shell/detector.js");
vi.mock("ora", () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    text: "",
  })),
}));

import { setupCommand } from "../../src/cli/commands/setup.js";
import inquirer from "inquirer";
import * as writer from "../../src/core/config/writer.js";
import * as client from "../../src/core/api/client.js";
import * as profileUpdater from "../../src/core/shell/profile-updater.js";
import * as detector from "../../src/core/shell/detector.js";

describe("setupCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation((() => {}) as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Input Validation", () => {
    it("should accept valid API key format", async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        apiKey: "hak_test_valid_key_123",
        email: "test@example.com",
        tier: "pro",
        endpoint: "https://api.revenium.ai",
      });

      vi.mocked(client.checkEndpointHealth).mockResolvedValue({
        healthy: true,
        statusCode: 200,
        message: "Endpoint healthy",
        latencyMs: 100,
      });

      vi.mocked(writer.writeConfig).mockResolvedValue(
        "/home/user/.claude/revenium.env",
      );

      vi.mocked(profileUpdater.updateShellProfile).mockResolvedValue({
        success: true,
        shellType: "bash",
        profilePath: "/home/user/.bashrc",
        message: "Profile updated",
      });

      await setupCommand({});

      expect(inquirer.prompt).toHaveBeenCalled();
      expect(process.exit).not.toHaveBeenCalled();
    });

    it("should accept valid email format", async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        apiKey: "hak_test_key",
        email: "user@domain.com",
        tier: "pro",
        endpoint: "https://api.revenium.ai",
      });

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
        shellType: "zsh",
        message: "Updated",
      });

      await setupCommand({});

      expect(process.exit).not.toHaveBeenCalled();
    });

    it("should accept valid subscription tier", async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        apiKey: "hak_test",
        tier: "enterprise",
        endpoint: "https://api.revenium.ai",
      });

      vi.mocked(client.checkEndpointHealth).mockResolvedValue({
        healthy: true,
        statusCode: 200,
        message: "OK",
        latencyMs: 75,
      });

      vi.mocked(writer.writeConfig).mockResolvedValue(
        "/home/user/.claude/revenium.env",
      );

      vi.mocked(profileUpdater.updateShellProfile).mockResolvedValue({
        success: true,
        shellType: "fish",
        message: "Updated",
      });

      await setupCommand({});

      expect(process.exit).not.toHaveBeenCalled();
    });

    it("should accept HTTPS endpoint", async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        apiKey: "hak_test",
        endpoint: "https://custom.revenium.ai",
      });

      vi.mocked(client.checkEndpointHealth).mockResolvedValue({
        healthy: true,
        statusCode: 200,
        message: "OK",
        latencyMs: 60,
      });

      vi.mocked(writer.writeConfig).mockResolvedValue(
        "/home/user/.claude/revenium.env",
      );

      vi.mocked(profileUpdater.updateShellProfile).mockResolvedValue({
        success: true,
        shellType: "bash",
        message: "Updated",
      });

      await setupCommand({});

      expect(process.exit).not.toHaveBeenCalled();
    });
  });

  describe("Health Check", () => {
    it("should exit on unhealthy endpoint", async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        apiKey: "hak_test",
        endpoint: "https://api.revenium.ai",
      });

      vi.mocked(client.checkEndpointHealth).mockResolvedValue({
        healthy: false,
        statusCode: 401,
        message: "Unauthorized",
        latencyMs: 50,
      });

      await setupCommand({});

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should exit on network error during health check", async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        apiKey: "hak_test",
        endpoint: "https://api.revenium.ai",
      });

      vi.mocked(client.checkEndpointHealth).mockRejectedValue(
        new Error("Network error"),
      );

      await setupCommand({});

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should succeed on healthy endpoint with low latency", async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        apiKey: "hak_test",
        endpoint: "https://api.revenium.ai",
      });

      vi.mocked(client.checkEndpointHealth).mockResolvedValue({
        healthy: true,
        statusCode: 200,
        message: "OK",
        latencyMs: 25,
      });

      vi.mocked(writer.writeConfig).mockResolvedValue(
        "/home/user/.claude/revenium.env",
      );

      vi.mocked(profileUpdater.updateShellProfile).mockResolvedValue({
        success: true,
        shellType: "bash",
        message: "Updated",
      });

      await setupCommand({});

      expect(process.exit).not.toHaveBeenCalled();
    });
  });

  describe("Configuration Writing", () => {
    it("should write config file with correct content", async () => {
      vi.mocked(writer.writeConfig).mockResolvedValue(
        "/home/user/.claude/revenium.env",
      );

      vi.mocked(inquirer.prompt).mockResolvedValue({
        apiKey: "hak_test_key",
        email: "user@example.com",
        tier: "pro",
        endpoint: "https://api.revenium.ai",
      });

      vi.mocked(client.checkEndpointHealth).mockResolvedValue({
        healthy: true,
        statusCode: 200,
        message: "OK",
        latencyMs: 50,
      });

      vi.mocked(profileUpdater.updateShellProfile).mockResolvedValue({
        success: true,
        shellType: "bash",
        message: "Updated",
      });

      await setupCommand({});

      expect(writer.writeConfig).toHaveBeenCalledWith({
        apiKey: "hak_test_key",
        email: "user@example.com",
        subscriptionTier: "pro",
        endpoint: "https://api.revenium.ai",
      });
    });

    it("should exit on config write failure", async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        apiKey: "hak_test",
        endpoint: "https://api.revenium.ai",
      });

      vi.mocked(client.checkEndpointHealth).mockResolvedValue({
        healthy: true,
        statusCode: 200,
        message: "OK",
        latencyMs: 50,
      });

      vi.mocked(writer.writeConfig).mockRejectedValue(
        new Error("Permission denied"),
      );

      await setupCommand({});

      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("Shell Profile Update", () => {
    it("should update shell profile on success", async () => {
      const updateShellSpy = vi
        .spyOn(profileUpdater, "updateShellProfile")
        .mockResolvedValue({
          success: true,
          shellType: "bash",
          profilePath: "/home/user/.bashrc",
          message: "Added configuration to /home/user/.bashrc",
        });

      vi.mocked(inquirer.prompt).mockResolvedValue({
        apiKey: "hak_test",
        endpoint: "https://api.revenium.ai",
      });

      vi.mocked(client.checkEndpointHealth).mockResolvedValue({
        healthy: true,
        statusCode: 200,
        message: "OK",
        latencyMs: 50,
      });

      vi.mocked(writer.writeConfig).mockResolvedValue(
        "/home/user/.claude/revenium.env",
      );

      await setupCommand({});

      expect(updateShellSpy).toHaveBeenCalled();
    });

    it("should show manual instructions on shell update failure", async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        apiKey: "hak_test",
        endpoint: "https://api.revenium.ai",
      });

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
        success: false,
        shellType: "unknown",
        message: "Could not detect shell",
      });

      vi.mocked(detector.detectShell).mockReturnValue("unknown");

      const getManualSpy = vi
        .spyOn(profileUpdater, "getManualInstructions")
        .mockReturnValue("Manual instructions here");

      await setupCommand({});

      expect(getManualSpy).toHaveBeenCalledWith("unknown");
    });

    it("should skip shell update when skipShellUpdate is true", async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        apiKey: "hak_test",
        endpoint: "https://api.revenium.ai",
      });

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

  describe("CLI Options", () => {
    it("should use provided API key from options", async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        endpoint: "https://api.revenium.ai",
      });

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
        message: "Updated",
      });

      await setupCommand({ apiKey: "hak_from_cli" });

      expect(writer.writeConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: "hak_from_cli",
        }),
      );
    });

    it("should use provided email from options", async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        apiKey: "hak_test",
        endpoint: "https://api.revenium.ai",
      });

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
        message: "Updated",
      });

      await setupCommand({ email: "cli@example.com" });

      expect(writer.writeConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "cli@example.com",
        }),
      );
    });

    it("should use provided tier from options", async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        apiKey: "hak_test",
        endpoint: "https://api.revenium.ai",
      });

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
        message: "Updated",
      });

      await setupCommand({ tier: "enterprise" });

      expect(writer.writeConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionTier: "enterprise",
        }),
      );
    });

    it("should use provided endpoint from options", async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        apiKey: "hak_test",
      });

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
        message: "Updated",
      });

      await setupCommand({ endpoint: "https://custom.revenium.ai" });

      expect(writer.writeConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: "https://custom.revenium.ai",
        }),
      );
    });

    it("should handle shell profile update failure", async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        apiKey: "hak_test123",
        email: "test@example.com",
        tier: "pro",
        endpoint: "https://api.revenium.ai",
      });

      vi.mocked(client.checkEndpointHealth).mockResolvedValue({
        healthy: true,
        statusCode: 200,
        message: "Endpoint healthy",
        latencyMs: 100,
      });

      vi.mocked(writer.writeConfig).mockResolvedValue();

      vi.mocked(profileUpdater.updateShellProfile).mockResolvedValue({
        success: false,
        message: "Failed to update shell profile",
      });

      vi.mocked(detector.detectShell).mockReturnValue("bash");

      await setupCommand({});

      expect(profileUpdater.updateShellProfile).toHaveBeenCalled();
      expect(detector.detectShell).toHaveBeenCalled();
    });

    it("should handle endpoint with /meter path", async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        apiKey: "hak_test123",
        email: "test@example.com",
        tier: "pro",
        endpoint: "https://api.revenium.ai/meter/v1",
      });

      vi.mocked(client.checkEndpointHealth).mockResolvedValue({
        healthy: true,
        statusCode: 200,
        message: "Endpoint healthy",
        latencyMs: 100,
      });

      vi.mocked(writer.writeConfig).mockResolvedValue();

      vi.mocked(profileUpdater.updateShellProfile).mockResolvedValue({
        success: true,
        message: "Shell profile updated",
      });

      await setupCommand({});

      expect(writer.writeConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: "https://api.revenium.ai",
        }),
      );
    });
  });
});
