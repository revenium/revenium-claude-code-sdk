import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getFullOtlpEndpoint,
  parseEnvContent,
  getConfigPath,
  configExists,
  loadConfig,
  isEnvLoaded,
} from "../../src/core/config/loader.js";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

vi.mock("node:fs/promises");
vi.mock("node:fs");
vi.mock("node:os");

describe("getFullOtlpEndpoint", () => {
  it("should append OTLP path to base URL", () => {
    const result = getFullOtlpEndpoint("https://api.revenium.ai");
    expect(result).toBe("https://api.revenium.ai/meter/v2/otlp");
  });

  it("should handle base URL with trailing slash", () => {
    const result = getFullOtlpEndpoint("https://api.revenium.ai/");
    expect(result).toBe("https://api.revenium.ai/meter/v2/otlp");
  });

  it("should handle localhost", () => {
    const result = getFullOtlpEndpoint("http://localhost:8080");
    expect(result).toBe("http://localhost:8080/meter/v2/otlp");
  });
});

describe("parseEnvContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(homedir).mockReturnValue("/home/user");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should parse cost multiplier override of 0", () => {
    const content = `
export CLAUDE_CODE_COST_MULTIPLIER="0"
export OTEL_EXPORTER_OTLP_ENDPOINT="https://api.revenium.ai/meter/v2/otlp"
export OTEL_EXPORTER_OTLP_HEADERS="x-api-key=hak_test123"
    `.trim();

    const result = parseEnvContent(content);
    expect(result.CLAUDE_CODE_COST_MULTIPLIER).toBe("0");
  });

  it("should parse cost multiplier override of 0.5", () => {
    const content = `
export CLAUDE_CODE_COST_MULTIPLIER="0.5"
    `.trim();

    const result = parseEnvContent(content);
    expect(result.CLAUDE_CODE_COST_MULTIPLIER).toBe("0.5");
  });

  it("should handle unescaped values", () => {
    const content = `
export TEST_VALUE="hello\\"world"
    `.trim();

    const result = parseEnvContent(content);
    expect(result.TEST_VALUE).toBe('hello"world');
  });

  it("should skip comments and empty lines", () => {
    const content = "# Comment\nKEY1=value1\n\n# Another comment\nKEY2=value2";
    const result = parseEnvContent(content);

    expect(result).toEqual({
      KEY1: "value1",
      KEY2: "value2",
    });
  });

  it("should handle lines without export prefix", () => {
    const content = "KEY1=value1\nKEY2=value2";
    const result = parseEnvContent(content);

    expect(result).toEqual({
      KEY1: "value1",
      KEY2: "value2",
    });
  });
});

describe("getConfigPath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(homedir).mockReturnValue("/home/user");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return correct config path", () => {
    const path = getConfigPath();
    expect(path).toBe("/home/user/.claude/revenium.env");
  });
});

describe("configExists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(homedir).mockReturnValue("/home/user");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return true when config file exists", () => {
    vi.mocked(existsSync).mockReturnValue(true);

    const exists = configExists();
    expect(exists).toBe(true);
  });

  it("should return false when config file does not exist", () => {
    vi.mocked(existsSync).mockReturnValue(false);

    const exists = configExists();
    expect(exists).toBe(false);
  });
});

describe("loadConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(homedir).mockReturnValue("/home/user");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return null when config file does not exist", async () => {
    vi.mocked(existsSync).mockReturnValue(false);

    const config = await loadConfig();
    expect(config).toBeNull();
  });

  it("should parse config from file", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFile).mockResolvedValue(
      'export OTEL_EXPORTER_OTLP_ENDPOINT="https://api.revenium.ai/meter/v2/otlp"\n' +
        'export OTEL_EXPORTER_OTLP_HEADERS="x-api-key=hak_test123"\n' +
        'export REVENIUM_SUBSCRIBER_EMAIL="test@example.com"\n' +
        'export CLAUDE_CODE_SUBSCRIPTION="pro"',
    );

    const config = await loadConfig();

    expect(config).toEqual({
      apiKey: "hak_test123",
      endpoint: "https://api.revenium.ai",
      email: "test@example.com",
      subscriptionTier: "pro",
      costMultiplierOverride: undefined,
      organizationName: undefined,
      organizationId: undefined,
      productName: undefined,
      productId: undefined,
    });
  });

  it("should return null when API key is missing", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFile).mockResolvedValue(
      'export OTEL_EXPORTER_OTLP_ENDPOINT="https://api.revenium.ai/meter/v2/otlp"\n',
    );

    const config = await loadConfig();
    expect(config).toBeNull();
  });

  it("should parse cost multiplier override", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFile).mockResolvedValue(
      'export OTEL_EXPORTER_OTLP_ENDPOINT="https://api.revenium.ai/meter/v2/otlp"\n' +
        'export OTEL_EXPORTER_OTLP_HEADERS="x-api-key=hak_test123"\n' +
        'export CLAUDE_CODE_COST_MULTIPLIER="0.5"',
    );

    const config = await loadConfig();

    expect(config?.costMultiplierOverride).toBe(0.5);
  });

  it("should parse organizationName and productName from standalone env vars", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFile).mockResolvedValue(
      'export OTEL_EXPORTER_OTLP_ENDPOINT="https://api.revenium.ai/meter/v2/otlp"\n' +
        'export OTEL_EXPORTER_OTLP_HEADERS="x-api-key=hak_test123"\n' +
        'export REVENIUM_ORGANIZATION_ID="org-123"\n' +
        'export REVENIUM_PRODUCT_ID="prod-456"',
    );

    const config = await loadConfig();

    expect(config?.organizationName).toBe("org-123");
    expect(config?.organizationId).toBe("org-123");
    expect(config?.productName).toBe("prod-456");
    expect(config?.productId).toBe("prod-456");
  });

  it("should parse organizationName and productName from OTEL_RESOURCE_ATTRIBUTES", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFile).mockResolvedValue(
      'export OTEL_EXPORTER_OTLP_ENDPOINT="https://api.revenium.ai/meter/v2/otlp"\n' +
        'export OTEL_EXPORTER_OTLP_HEADERS="x-api-key=hak_test123"\n' +
        'export OTEL_RESOURCE_ATTRIBUTES="cost_multiplier=0.08,organization.name=org-456,product.name=prod-789"',
    );

    const config = await loadConfig();

    expect(config?.organizationName).toBe("org-456");
    expect(config?.organizationId).toBe("org-456");
    expect(config?.productName).toBe("prod-789");
    expect(config?.productId).toBe("prod-789");
  });
});

describe("isEnvLoaded", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("should return true when env vars are loaded", () => {
    process.env.CLAUDE_CODE_ENABLE_TELEMETRY = "1";
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT =
      "https://api.revenium.ai/meter/v2/otlp";

    const loaded = isEnvLoaded();
    expect(loaded).toBe(true);
  });

  it("should return false when telemetry is not enabled", () => {
    process.env.CLAUDE_CODE_ENABLE_TELEMETRY = "0";
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT =
      "https://api.revenium.ai/meter/v2/otlp";

    const loaded = isEnvLoaded();
    expect(loaded).toBe(false);
  });

  it("should return false when endpoint is missing", () => {
    process.env.CLAUDE_CODE_ENABLE_TELEMETRY = "1";
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

    const loaded = isEnvLoaded();
    expect(loaded).toBe(false);
  });
});
