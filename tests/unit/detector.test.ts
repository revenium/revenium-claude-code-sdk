import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  validateConfigPath,
  getSourceCommand,
  detectShell,
  getProfilePath,
} from "../../src/core/shell/detector.js";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

vi.mock("node:fs");
vi.mock("node:os");

describe("validateConfigPath", () => {
  it("should accept valid path with alphanumeric and safe characters", () => {
    expect(() =>
      validateConfigPath("/home/user/.claude/revenium.env"),
    ).not.toThrow();
    expect(() => validateConfigPath("~/.claude/revenium.env")).not.toThrow();
    expect(() => validateConfigPath("/opt/config-file_v1.0.env")).not.toThrow();
  });

  it("should reject path with semicolon", () => {
    expect(() => validateConfigPath("/path;rm -rf /")).toThrow(
      /Invalid config path/,
    );
  });

  it("should reject path with backticks", () => {
    expect(() => validateConfigPath("/path/`whoami`/file")).toThrow(
      /Invalid config path/,
    );
  });

  it("should reject path with dollar sign", () => {
    expect(() => validateConfigPath("/path/$(whoami)/file")).toThrow(
      /Invalid config path/,
    );
  });

  it("should reject path with pipe", () => {
    expect(() => validateConfigPath("/path/file | cat")).toThrow(
      /Invalid config path/,
    );
  });

  it("should reject path with ampersand", () => {
    expect(() => validateConfigPath("/path/file & echo")).toThrow(
      /Invalid config path/,
    );
  });

  it("should reject path with newline", () => {
    expect(() => validateConfigPath("/path/file\nrm -rf /")).toThrow(
      /Invalid config path/,
    );
  });

  it("should accept path with spaces", () => {
    expect(() => validateConfigPath("/path with spaces/file")).not.toThrow();
    expect(() =>
      validateConfigPath("/Users/John Doe/.claude/revenium.env"),
    ).not.toThrow();
  });

  it("should accept path with tilde", () => {
    expect(() => validateConfigPath("~/config.env")).not.toThrow();
  });

  it("should accept path with dots", () => {
    expect(() =>
      validateConfigPath("/home/user/.config/file.env"),
    ).not.toThrow();
  });

  it("should accept path with hyphens and underscores", () => {
    expect(() =>
      validateConfigPath("/opt/my-app_config/file-v1_0.env"),
    ).not.toThrow();
  });
});

describe("getSourceCommand", () => {
  const validPath = "/home/user/.claude/revenium.env";

  it("should generate valid bash source command", () => {
    const command = getSourceCommand("bash", validPath);
    expect(command).toContain('if [ -f "');
    expect(command).toContain(validPath);
    expect(command).toContain('source "');
    expect(command).toContain("# Source Revenium Claude Code metering config");
  });

  it("should generate valid zsh source command", () => {
    const command = getSourceCommand("zsh", validPath);
    expect(command).toContain('if [ -f "');
    expect(command).toContain(validPath);
    expect(command).toContain('source "');
  });

  it("should generate valid fish source command", () => {
    const command = getSourceCommand("fish", validPath);
    expect(command).toContain('if test -f "');
    expect(command).toContain(validPath);
    expect(command).toContain("export (cat");
    expect(command).toContain("# Source Revenium Claude Code metering config");
  });

  it("should properly quote path in bash command", () => {
    const command = getSourceCommand("bash", validPath);
    expect(command).toMatch(/"[^"]+"/);
  });

  it("should properly quote path in fish command", () => {
    const command = getSourceCommand("fish", validPath);
    expect(command).toMatch(/"[^"]+"/);
  });

  it("should throw error for invalid path with semicolon", () => {
    expect(() => getSourceCommand("bash", "/path;rm -rf /")).toThrow(
      /Invalid config path/,
    );
  });

  it("should throw error for invalid path with backticks", () => {
    expect(() => getSourceCommand("fish", "/path/`whoami`")).toThrow(
      /Invalid config path/,
    );
  });

  it("should throw error for invalid path with dollar sign", () => {
    expect(() => getSourceCommand("zsh", "/path/$(cmd)")).toThrow(
      /Invalid config path/,
    );
  });

  it("should handle unknown shell type with bash syntax", () => {
    const command = getSourceCommand("unknown", validPath);
    expect(command).toContain('if [ -f "');
    expect(command).toContain('source "');
  });
});

describe("detectShell", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    vi.mocked(homedir).mockReturnValue("/home/user");
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("should detect zsh from SHELL environment variable", () => {
    process.env.SHELL = "/bin/zsh";
    const shell = detectShell();
    expect(shell).toBe("zsh");
  });

  it("should detect bash from SHELL environment variable", () => {
    process.env.SHELL = "/bin/bash";
    const shell = detectShell();
    expect(shell).toBe("bash");
  });

  it("should detect fish from SHELL environment variable", () => {
    process.env.SHELL = "/usr/bin/fish";
    const shell = detectShell();
    expect(shell).toBe("fish");
  });

  it("should fallback to detecting zsh from .zshrc file", () => {
    process.env.SHELL = "";
    vi.mocked(existsSync).mockImplementation(
      (path) => path === "/home/user/.zshrc",
    );
    const shell = detectShell();
    expect(shell).toBe("zsh");
  });

  it("should fallback to detecting fish from config.fish file", () => {
    process.env.SHELL = "";
    vi.mocked(existsSync).mockImplementation(
      (path) => path === "/home/user/.config/fish/config.fish",
    );
    const shell = detectShell();
    expect(shell).toBe("fish");
  });

  it("should fallback to detecting bash from .bashrc file", () => {
    process.env.SHELL = "";
    vi.mocked(existsSync).mockImplementation(
      (path) => path === "/home/user/.bashrc",
    );
    const shell = detectShell();
    expect(shell).toBe("bash");
  });

  it("should return unknown when no shell is detected", () => {
    process.env.SHELL = "";
    vi.mocked(existsSync).mockReturnValue(false);
    const shell = detectShell();
    expect(shell).toBe("unknown");
  });
});

describe("getProfilePath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(homedir).mockReturnValue("/home/user");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return .zshrc path for zsh", () => {
    const path = getProfilePath("zsh");
    expect(path).toBe("/home/user/.zshrc");
  });

  it("should return .bashrc path for bash when it exists", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const path = getProfilePath("bash");
    expect(path).toBe("/home/user/.bashrc");
  });

  it("should return .bash_profile path for bash when .bashrc does not exist", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const path = getProfilePath("bash");
    expect(path).toBe("/home/user/.bash_profile");
  });

  it("should return config.fish path for fish", () => {
    const path = getProfilePath("fish");
    expect(path).toBe("/home/user/.config/fish/config.fish");
  });

  it("should return null for unknown shell", () => {
    const path = getProfilePath("unknown");
    expect(path).toBeNull();
  });
});
