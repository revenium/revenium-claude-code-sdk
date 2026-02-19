import { describe, it, expect } from "vitest";
import {
  validateApiKey,
  validateEmail,
  validateSubscriptionTier,
  validateConfig,
  validateEndpointUrl,
} from "../../src/core/config/validator.js";

describe("validateApiKey", () => {
  it("should accept valid API key format", () => {
    const result = validateApiKey("hak_tenant_abc123xyz");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject empty API key", () => {
    const result = validateApiKey("");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("API key is required");
  });

  it("should reject API key without hak_ prefix", () => {
    const result = validateApiKey("invalid_key_123");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("hak_"))).toBe(true);
  });

  it("should reject API key with wrong format", () => {
    const result = validateApiKey("hak_short");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("format"))).toBe(true);
  });

  it("should reject very short API keys", () => {
    const result = validateApiKey("hak_x_y");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("short"))).toBe(true);
  });
});

describe("validateEmail", () => {
  it("should accept valid email", () => {
    const result = validateEmail("user@example.com");
    expect(result.valid).toBe(true);
  });

  it("should accept empty email (optional)", () => {
    const result = validateEmail("");
    expect(result.valid).toBe(true);
  });

  it("should reject invalid email format", () => {
    const result = validateEmail("invalid-email");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Invalid email format");
  });

  it("should reject email without domain", () => {
    const result = validateEmail("user@");
    expect(result.valid).toBe(false);
  });
});

describe("validateSubscriptionTier", () => {
  it("should accept valid tiers", () => {
    const tiers = [
      "pro",
      "max_5x",
      "max_20x",
      "team_premium",
      "enterprise",
      "api",
    ];
    for (const tier of tiers) {
      const result = validateSubscriptionTier(tier);
      expect(result.valid).toBe(true);
    }
  });

  it("should accept empty tier (optional)", () => {
    const result = validateSubscriptionTier("");
    expect(result.valid).toBe(true);
  });

  it("should reject invalid tier", () => {
    const result = validateSubscriptionTier("invalid");
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.includes("Invalid subscription tier"))
    ).toBe(true);
  });
});

describe("validateConfig", () => {
  it("should accept valid complete config", () => {
    const result = validateConfig({
      apiKey: "hak_tenant_abc123xyz",
      endpoint: "https://api.revenium.ai",
      email: "user@example.com",
      subscriptionTier: "pro",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should accept valid minimal config", () => {
    const result = validateConfig({
      apiKey: "hak_tenant_abc123xyz",
      endpoint: "https://api.revenium.ai",
    });
    expect(result.valid).toBe(true);
  });

  it("should reject invalid endpoint URL", () => {
    const result = validateConfig({
      apiKey: "hak_tenant_abc123xyz",
      endpoint: "not-a-url",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Invalid endpoint URL"))).toBe(
      true
    );
  });

  it("should reject missing endpoint", () => {
    const result = validateConfig({
      apiKey: "hak_tenant_abc123xyz",
      endpoint: "",
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.includes("Endpoint URL is required"))
    ).toBe(true);
  });

  it("should reject HTTP endpoint", () => {
    const result = validateConfig({
      apiKey: "hak_tenant_abc123xyz",
      endpoint: "http://api.example.com",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("HTTPS is required"))).toBe(
      true
    );
  });
});

describe("validateEndpointUrl", () => {
  it("should accept HTTPS endpoint", () => {
    const result = validateEndpointUrl("https://api.revenium.ai");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject HTTP endpoint", () => {
    const result = validateEndpointUrl("http://api.example.com");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("HTTPS is required"))).toBe(
      true
    );
  });

  it("should reject FTP endpoint", () => {
    const result = validateEndpointUrl("ftp://api.example.com");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("HTTPS is required"))).toBe(
      true
    );
  });

  it("should reject WebSocket endpoint", () => {
    const result = validateEndpointUrl("ws://api.example.com");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("HTTPS is required"))).toBe(
      true
    );
  });

  it("should reject file:// endpoint", () => {
    const result = validateEndpointUrl("file:///etc/passwd");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("HTTPS is required"))).toBe(
      true
    );
  });

  it("should reject empty endpoint", () => {
    const result = validateEndpointUrl("");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Endpoint URL is required");
  });

  it("should reject invalid URL format", () => {
    const result = validateEndpointUrl("not-a-valid-url");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Invalid endpoint URL"))).toBe(
      true
    );
  });

  it("should accept HTTPS with port", () => {
    const result = validateEndpointUrl("https://api.example.com:8443");
    expect(result.valid).toBe(true);
  });

  it("should accept HTTPS with path", () => {
    const result = validateEndpointUrl("https://api.example.com/v1/endpoint");
    expect(result.valid).toBe(true);
  });
});
