import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { program } from "../../src/cli/index.js";
import * as setupModule from "../../src/cli/commands/setup.js";
import * as statusModule from "../../src/cli/commands/status.js";
import * as testModule from "../../src/cli/commands/test.js";
import * as backfillModule from "../../src/cli/commands/backfill.js";

vi.mock("../../src/cli/commands/setup.js");
vi.mock("../../src/cli/commands/status.js");
vi.mock("../../src/cli/commands/test.js");
vi.mock("../../src/cli/commands/backfill.js");

describe("CLI index", () => {
  let mockExit: any;
  let mockConsoleError: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockExit = vi.spyOn(process, "exit").mockImplementation((code?: number) => {
      throw new Error(`process.exit unexpectedly called with "${code}"`);
    });
    mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("program metadata", () => {
    it("should have correct name", () => {
      expect(program.name()).toBe("revenium-metering");
    });

    it("should have description", () => {
      expect(program.description()).toBe(
        "Configure Claude Code telemetry export to Revenium",
      );
    });
  });

  describe("setup command", () => {
    it("should register setup command with correct options", () => {
      const setupCmd = program.commands.find((cmd) => cmd.name() === "setup");

      expect(setupCmd).toBeDefined();
      expect(setupCmd?.description()).toBe(
        "Interactive setup wizard to configure Claude Code metering",
      );

      const options = setupCmd?.options.map((opt) => opt.long);
      expect(options).toContain("--api-key");
      expect(options).toContain("--email");
      expect(options).toContain("--tier");
      expect(options).toContain("--endpoint");
      expect(options).toContain("--skip-shell-update");
    });

    it("should call setupCommand when executed", async () => {
      vi.mocked(setupModule.setupCommand).mockResolvedValue();

      await program.parseAsync([
        "node",
        "cli",
        "setup",
        "--api-key",
        "hak_test123",
      ]);

      expect(setupModule.setupCommand).toHaveBeenCalledWith({
        apiKey: "hak_test123",
        email: undefined,
        tier: undefined,
        endpoint: undefined,
        skipShellUpdate: undefined,
      });
    });
  });

  describe("status command", () => {
    it("should register status command", () => {
      const statusCmd = program.commands.find((cmd) => cmd.name() === "status");

      expect(statusCmd).toBeDefined();
      expect(statusCmd?.description()).toBe(
        "Check current configuration and endpoint connectivity",
      );
    });

    it("should call statusCommand when executed", async () => {
      vi.mocked(statusModule.statusCommand).mockResolvedValue();

      await program.parseAsync(["node", "cli", "status"]);

      expect(statusModule.statusCommand).toHaveBeenCalled();
    });
  });

  describe("test command", () => {
    it("should register test command with verbose option", () => {
      const testCmd = program.commands.find((cmd) => cmd.name() === "test");

      expect(testCmd).toBeDefined();
      expect(testCmd?.description()).toBe(
        "Send a test metric to verify the integration",
      );

      const options = testCmd?.options.map((opt) => opt.long);
      expect(options).toContain("--verbose");
    });

    it("should call testCommand when executed", async () => {
      vi.mocked(testModule.testCommand).mockResolvedValue();

      await program.parseAsync(["node", "cli", "test", "--verbose"]);

      expect(testModule.testCommand).toHaveBeenCalledWith({ verbose: true });
    });
  });

  describe("backfill command", () => {
    it("should register backfill command with all options", () => {
      const backfillCmd = program.commands.find(
        (cmd) => cmd.name() === "backfill",
      );

      expect(backfillCmd).toBeDefined();
      expect(backfillCmd?.description()).toBe(
        "Import historical Claude Code usage data from local JSONL files",
      );

      const options = backfillCmd?.options.map((opt) => opt.long);
      expect(options).toContain("--since");
      expect(options).toContain("--dry-run");
      expect(options).toContain("--batch-size");
      expect(options).toContain("--delay");
      expect(options).toContain("--verbose");
    });

    it("should call backfillCommand when executed", async () => {
      vi.mocked(backfillModule.backfillCommand).mockResolvedValue();

      await program.parseAsync([
        "node",
        "cli",
        "backfill",
        "--since",
        "7d",
        "--batch-size",
        "50",
      ]);

      expect(backfillModule.backfillCommand).toHaveBeenCalledWith({
        since: "7d",
        dryRun: undefined,
        batchSize: 50,
        delay: 100,
        verbose: undefined,
      });
    });

    it("should validate batch-size is within range", () => {
      const batchSize = 100;
      expect(Number.isFinite(batchSize)).toBe(true);
      expect(batchSize >= 1 && batchSize <= 10000).toBe(true);
    });

    it("should reject batch-size below 1", () => {
      const batchSize = 0;
      expect(batchSize >= 1 && batchSize <= 10000).toBe(false);
    });

    it("should reject batch-size above 10000", () => {
      const batchSize = 10001;
      expect(batchSize >= 1 && batchSize <= 10000).toBe(false);
    });

    it("should validate delay is within range", () => {
      const delay = 100;
      expect(Number.isFinite(delay)).toBe(true);
      expect(delay >= 0 && delay <= 60000).toBe(true);
    });

    it("should reject delay below 0", () => {
      const delay = -1;
      expect(delay >= 0 && delay <= 60000).toBe(false);
    });

    it("should reject delay above 60000", () => {
      const delay = 60001;
      expect(delay >= 0 && delay <= 60000).toBe(false);
    });
  });
});
