import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  writeConfig,
  getConfigFilePath,
} from "../../src/core/config/writer.js";
import { writeFile, mkdir, chmod } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

vi.mock("node:fs/promises");
vi.mock("node:os");

describe("writer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(homedir).mockReturnValue("/home/user");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("writeConfig", () => {
    it("should create directory if it does not exist", async () => {
      const config = {
        apiKey: "hak_test123",
        endpoint: "https://api.revenium.ai",
      };

      await writeConfig(config);

      expect(mkdir).toHaveBeenCalledWith("/home/user/.claude", {
        recursive: true,
      });
    });

    it("should write config file with correct content", async () => {
      const config = {
        apiKey: "hak_test123",
        endpoint: "https://api.revenium.ai",
      };

      await writeConfig(config);

      expect(writeFile).toHaveBeenCalledWith(
        "/home/user/.claude/revenium.env",
        expect.stringContaining("export CLAUDE_CODE_ENABLE_TELEMETRY=1"),
        { encoding: "utf-8" },
      );
      expect(writeFile).toHaveBeenCalledWith(
        "/home/user/.claude/revenium.env",
        expect.stringContaining("export OTEL_EXPORTER_OTLP_ENDPOINT="),
        { encoding: "utf-8" },
      );
      expect(writeFile).toHaveBeenCalledWith(
        "/home/user/.claude/revenium.env",
        expect.stringContaining("x-api-key=hak_test123"),
        { encoding: "utf-8" },
      );
    });

    it("should set file permissions to 0600", async () => {
      const config = {
        apiKey: "hak_test123",
        endpoint: "https://api.revenium.ai",
      };

      await writeConfig(config);

      expect(chmod).toHaveBeenCalledWith(
        "/home/user/.claude/revenium.env",
        0o600,
      );
    });

    it("should include email when provided", async () => {
      const config = {
        apiKey: "hak_test123",
        endpoint: "https://api.revenium.ai",
        email: "test@example.com",
      };

      await writeConfig(config);

      expect(writeFile).toHaveBeenCalledWith(
        "/home/user/.claude/revenium.env",
        expect.stringContaining("export REVENIUM_SUBSCRIBER_EMAIL="),
        { encoding: "utf-8" },
      );
      expect(writeFile).toHaveBeenCalledWith(
        "/home/user/.claude/revenium.env",
        expect.stringContaining("test@example.com"),
        { encoding: "utf-8" },
      );
    });

    it("should include subscription tier and cost multiplier when provided", async () => {
      const config = {
        apiKey: "hak_test123",
        endpoint: "https://api.revenium.ai",
        subscriptionTier: "pro" as const,
      };

      await writeConfig(config);

      expect(writeFile).toHaveBeenCalledWith(
        "/home/user/.claude/revenium.env",
        expect.stringContaining("export CLAUDE_CODE_SUBSCRIPTION="),
        { encoding: "utf-8" },
      );
      expect(writeFile).toHaveBeenCalledWith(
        "/home/user/.claude/revenium.env",
        expect.stringContaining("cost_multiplier="),
        { encoding: "utf-8" },
      );
    });

    it("should escape special characters in API key", async () => {
      const config = {
        apiKey: 'hak_test"$`\\special',
        endpoint: "https://api.revenium.ai",
      };

      await writeConfig(config);

      const writeFileCall = vi.mocked(writeFile).mock.calls[0];
      const content = writeFileCall[1] as string;

      expect(content).toContain('\\"');
      expect(content).toContain("\\$");
      expect(content).toContain("\\`");
      expect(content).toContain("\\\\");
    });

    it("should return the config file path", async () => {
      const config = {
        apiKey: "hak_test123",
        endpoint: "https://api.revenium.ai",
      };

      const path = await writeConfig(config);

      expect(path).toBe("/home/user/.claude/revenium.env");
    });

    it("should include organizationId and productId in OTEL_RESOURCE_ATTRIBUTES", async () => {
      const config = {
        apiKey: "hak_test123",
        endpoint: "https://api.revenium.ai",
        subscriptionTier: "pro" as const,
        organizationId: "org-123",
        productId: "prod-456",
      };

      await writeConfig(config);

      expect(writeFile).toHaveBeenCalledWith(
        "/home/user/.claude/revenium.env",
        expect.stringContaining("organization.name=org-123"),
        { encoding: "utf-8" },
      );
      expect(writeFile).toHaveBeenCalledWith(
        "/home/user/.claude/revenium.env",
        expect.stringContaining("product.name=prod-456"),
        { encoding: "utf-8" },
      );
    });
  });

  describe("getConfigFilePath", () => {
    it("should return correct config file path", () => {
      const path = getConfigFilePath();
      expect(path).toBe("/home/user/.claude/revenium.env");
    });
  });
});
