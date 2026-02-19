import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { updateShellProfile, getManualInstructions } from "../../src/core/shell/profile-updater.js";
import * as detector from "../../src/core/shell/detector.js";
import * as writer from "../../src/core/config/writer.js";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

vi.mock("../../src/core/shell/detector.js");
vi.mock("../../src/core/config/writer.js");
vi.mock("node:fs/promises");
vi.mock("node:fs");

describe("profile-updater", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("updateShellProfile", () => {
    it("should return error for unknown shell", async () => {
      vi.mocked(detector.detectShell).mockReturnValue("unknown");

      const result = await updateShellProfile();

      expect(result).toEqual({
        success: false,
        shellType: "unknown",
        message: "Could not detect shell type. Please manually add the source command to your shell profile.",
      });
    });

    it("should return error when profile path cannot be determined", async () => {
      vi.mocked(detector.detectShell).mockReturnValue("bash");
      vi.mocked(detector.getProfilePath).mockReturnValue(null);

      const result = await updateShellProfile();

      expect(result).toEqual({
        success: false,
        shellType: "bash",
        message: "Could not determine profile path for bash.",
      });
    });

    it("should add new configuration to profile", async () => {
      vi.mocked(detector.detectShell).mockReturnValue("bash");
      vi.mocked(detector.getProfilePath).mockReturnValue("/home/user/.bashrc");
      vi.mocked(writer.getConfigFilePath).mockReturnValue("/home/user/.claude/revenium.env");
      vi.mocked(detector.getSourceCommand).mockReturnValue('source "/home/user/.claude/revenium.env"');
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue("# existing content\n");

      const result = await updateShellProfile();

      expect(result).toEqual({
        success: true,
        shellType: "bash",
        profilePath: "/home/user/.bashrc",
        message: "Added configuration to /home/user/.bashrc",
      });

      expect(writeFile).toHaveBeenCalledWith(
        "/home/user/.bashrc",
        expect.stringContaining("# >>> revenium-claude-code-metering >>>"),
        "utf-8"
      );
    });

    it("should update existing configuration (idempotent)", async () => {
      vi.mocked(detector.detectShell).mockReturnValue("zsh");
      vi.mocked(detector.getProfilePath).mockReturnValue("/home/user/.zshrc");
      vi.mocked(writer.getConfigFilePath).mockReturnValue("/home/user/.claude/revenium.env");
      vi.mocked(detector.getSourceCommand).mockReturnValue('source "/home/user/.claude/revenium.env"');
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(
        "# existing content\n# >>> revenium-claude-code-metering >>>\nold config\n# <<< revenium-claude-code-metering <<<\n"
      );

      const result = await updateShellProfile();

      expect(result).toEqual({
        success: true,
        shellType: "zsh",
        profilePath: "/home/user/.zshrc",
        message: "Updated existing configuration in /home/user/.zshrc",
      });

      expect(writeFile).toHaveBeenCalledWith(
        "/home/user/.zshrc",
        expect.stringContaining("# >>> revenium-claude-code-metering >>>"),
        "utf-8"
      );
    });

    it("should create profile if it does not exist", async () => {
      vi.mocked(detector.detectShell).mockReturnValue("fish");
      vi.mocked(detector.getProfilePath).mockReturnValue("/home/user/.config/fish/config.fish");
      vi.mocked(writer.getConfigFilePath).mockReturnValue("/home/user/.claude/revenium.env");
      vi.mocked(detector.getSourceCommand).mockReturnValue('export (cat "/home/user/.claude/revenium.env" | grep -v "^#" | xargs -L 1)');
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await updateShellProfile();

      expect(result).toEqual({
        success: true,
        shellType: "fish",
        profilePath: "/home/user/.config/fish/config.fish",
        message: "Added configuration to /home/user/.config/fish/config.fish",
      });

      expect(writeFile).toHaveBeenCalledWith(
        "/home/user/.config/fish/config.fish",
        expect.stringContaining("# >>> revenium-claude-code-metering >>>"),
        "utf-8"
      );
    });
  });

  describe("getManualInstructions", () => {
    it("should return instructions for bash", () => {
      vi.mocked(writer.getConfigFilePath).mockReturnValue("/home/user/.claude/revenium.env");
      vi.mocked(detector.getSourceCommand).mockReturnValue('source "/home/user/.claude/revenium.env"');
      vi.mocked(detector.getProfilePath).mockReturnValue("/home/user/.bashrc");

      const instructions = getManualInstructions("bash");

      expect(instructions).toContain("/home/user/.bashrc");
      expect(instructions).toContain('source "/home/user/.claude/revenium.env"');
    });

    it("should return instructions for zsh", () => {
      vi.mocked(writer.getConfigFilePath).mockReturnValue("/home/user/.claude/revenium.env");
      vi.mocked(detector.getSourceCommand).mockReturnValue('source "/home/user/.claude/revenium.env"');
      vi.mocked(detector.getProfilePath).mockReturnValue("/home/user/.zshrc");

      const instructions = getManualInstructions("zsh");

      expect(instructions).toContain("/home/user/.zshrc");
      expect(instructions).toContain('source "/home/user/.claude/revenium.env"');
    });
  });
});

