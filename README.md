# @revenium/claude-code-metering

[![CI](https://github.com/revenium/revenium-claude-code-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/revenium/revenium-claude-code-sdk/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-92.77%25-brightgreen)](https://github.com/revenium/revenium-claude-code-sdk)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

A CLI tool to configure Claude Code telemetry export to Revenium for AI usage metering and cost tracking.

## Overview

This package configures Claude Code CLI to export OpenTelemetry (OTLP) telemetry data to Revenium's metering infrastructure. This enables:

- **Usage Tracking**: Monitor Claude Code API calls, token counts, and model usage
- **Cost Attribution**: Track AI spend per developer, team, or project
- **Subscription Optimization**: Subscription tier is sent to Revenium for automatic cost adjustment

## Installation

```bash
npm install -g @revenium/claude-code-metering
```

Or with npx (no install required):

```bash
npx @revenium/claude-code-metering setup
```

## Quick Start

### 1. Run the Setup Wizard

```bash
revenium-metering setup
```

The wizard will prompt you for:

- **API Key**: Your Revenium API key (`hak_...`)
- **Email**: For usage attribution (optional)
- **Subscription Tier**: Your Claude Code subscription (Pro, Max, Team, Enterprise, or API)

### 2. Restart Your Terminal

The setup automatically updates your shell profile. Either:

- Open a new terminal, OR
- Run: `source ~/.claude/revenium.env`

### 3. Use Claude Code Normally

That's it! Telemetry will be sent to Revenium automatically when you use Claude Code.

> **Using an IDE?** If you use Claude Code through VS Code, Cursor, Windsurf, or JetBrains IDEs, see [IDE Configuration](#ide-configuration) for additional setup steps.

## Commands

### `revenium-metering setup`

Interactive setup wizard to configure Claude Code metering.

```bash
revenium-metering setup [options]

Options:
  -k, --api-key <key>       Revenium API key (hak_...)
  -e, --email <email>       Email for usage attribution
  -t, --tier <tier>         Subscription tier (pro, max_5x, max_20x, team_premium, enterprise, api)
  -o, --organization <name> Organization name for cost attribution
  -p, --product <name>      Product name for cost attribution
  --endpoint <url>          Revenium API endpoint URL (default: https://api.revenium.ai)
  --skip-shell-update       Skip automatic shell profile update
```

**Non-interactive mode:**

```bash
revenium-metering setup \
  --api-key hak_your_key_here \
  --email developer@company.com \
  --tier pro

# With organization and product attribution:
revenium-metering setup \
  --api-key hak_your_key_here \
  --email developer@company.com \
  --tier pro \
  --organization my-team \
  --product backend-api
```

### `revenium-metering status`

Check current configuration and endpoint connectivity.

```bash
revenium-metering status
```

Outputs:

- Current configuration settings
- Endpoint health check
- Authentication status

### `revenium-metering test`

Send a test metric to verify the integration is working.

```bash
revenium-metering test [options]

Options:
  -v, --verbose    Show detailed payload information
```

### `revenium-metering backfill`

Import historical Claude Code usage data from local JSONL files stored in `~/.claude/projects/`. This is useful for sending past usage to Revenium when you first set up metering.

```bash
revenium-metering backfill [options]

Options:
  --since <date>      Only backfill records after this date
  --dry-run           Show what would be sent without actually sending
  --batch-size <n>    Records per API batch (default: 100)
  -v, --verbose       Show detailed progress and sample payloads
```

**Date formats for `--since`:**

- Relative: `7d` (7 days), `2w` (2 weeks), `1m` (1 month), `1y` (1 year)
- ISO format: `2024-01-15` or `2024-01-15T00:00:00Z`

**Examples:**

```bash
# Preview what would be sent (recommended first step)
revenium-metering backfill --dry-run

# Backfill only the last 30 days
revenium-metering backfill --since 30d

# Backfill since a specific date with verbose output
revenium-metering backfill --since 2024-12-01 --verbose

# Full backfill of all historical data
revenium-metering backfill
```

**What it does:**

1. Scans `~/.claude/projects/` for JSONL session files
2. Extracts usage records (model, tokens, timestamps) from assistant messages
3. Batches records and sends them to Revenium's OTLP endpoint
4. Uses your configured subscription tier for cost attribution

## Configuration

The setup wizard creates `~/.claude/revenium.env` with the following environment variables:

| Variable                       | Description                                                                        |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| `CLAUDE_CODE_ENABLE_TELEMETRY` | Enables Claude Code telemetry export (set to `1`)                                  |
| `OTEL_EXPORTER_OTLP_ENDPOINT`  | Revenium OTLP endpoint URL                                                         |
| `OTEL_EXPORTER_OTLP_HEADERS`   | Authentication header with API key                                                 |
| `OTEL_EXPORTER_OTLP_PROTOCOL`  | OTLP protocol (`http/json`)                                                        |
| `OTEL_LOGS_EXPORTER`           | **Required** - Set to `otlp` to enable log export                                  |
| `OTEL_RESOURCE_ATTRIBUTES`     | Comma-separated key=value pairs (CLAUDE_CODE_SUBSCRIPTION_TIER, user.email, organization.name, product.name) |

### Subscription Tiers

| Tier                  | Monthly Cost  | Tier Key         |
| --------------------- | ------------- | ---------------- |
| Pro                   | $20/mo        | `pro`            |
| Max 5x                | $100/mo       | `max_5x`         |
| Max 20x               | $200/mo       | `max_20x`        |
| Team Premium          | $125/seat     | `team_premium`   |
| Enterprise            | Custom        | `enterprise`     |
| API (no subscription) | Pay-per-token | `api`            |

The subscription tier is sent as an OTEL resource attribute (`CLAUDE_CODE_SUBSCRIPTION_TIER`). The Revenium backend uses this to apply the appropriate cost adjustments automatically — no client-side multiplier configuration is needed.

### Organization & Product Attribution

You can attribute Claude Code costs to specific organizations (customers/teams) and products (projects). This is useful for:

- **Consulting firms**: Track AI costs per client project
- **Internal teams**: Separate costs by product (mobile-app, backend-api, etc.)
- **Cost centers**: Attribute AI spend to business units

#### Option 1: Use CLI Flags (Recommended)

```bash
revenium-metering setup \
  --api-key hak_your_key \
  --tier max_20x \
  --organization engineering \
  --product backend-api
```

#### Option 2: Edit OTEL_RESOURCE_ATTRIBUTES Directly

Add `organization.name` and/or `product.name` to the `OTEL_RESOURCE_ATTRIBUTES` line in `~/.claude/revenium.env`:

```bash
# Before:
export OTEL_RESOURCE_ATTRIBUTES="CLAUDE_CODE_SUBSCRIPTION_TIER=max_20x,user.email=dev@company.com"

# After:
export OTEL_RESOURCE_ATTRIBUTES="organization.name=engineering,product.name=backend-api,CLAUDE_CODE_SUBSCRIPTION_TIER=max_20x,user.email=dev@company.com"
```

Then reload: `source ~/.claude/revenium.env`

> **Important**: The backend **only** reads `organization.name` and `product.name` from `OTEL_RESOURCE_ATTRIBUTES`. Do not set them as standalone environment variables - they will not be sent to Revenium.

## How It Works

1. **Claude Code CLI** exports OTLP telemetry when configured with the proper environment variables
2. **This package** generates the configuration file (`~/.claude/revenium.env`) with the correct settings
3. **Revenium's OTLP endpoint** (`/meter/v2/ai/otlp/v1/logs`) receives and translates the telemetry
4. **Revenium** processes the data for cost tracking, attribution, and analytics

### Telemetry Data

Claude Code exports the following data points:

- Session ID
- Model used (claude-opus-4-5, claude-sonnet-4, etc.)
- Input token count
- Output token count
- Cache read/creation tokens
- Request timestamps

## Tool Metering

Track execution of custom tools and external API calls with automatic timing, error handling, and metadata collection.

### Quick Example

```typescript
import { meterTool, setToolContext } from "@revenium/claude-code-metering";

// Set context once (propagates to all tool calls)
setToolContext({
  sessionId: "session-123",
  userId: "user-456"
});

// Wrap tool execution
const result = await meterTool("weather-api", async () => {
  return await fetch("https://api.example.com/weather");
}, {
  description: "Fetch weather forecast",
  category: "external-api",
  outputFields: ["temperature", "humidity"]
});
// Automatically extracts temperature & humidity from result
```

### Functions

**meterTool(toolId, fn, metadata?)**
- Wraps a function with automatic metering
- Captures duration, success/failure, and errors
- Returns function result unchanged

**reportToolCall(toolId, report)**
- Manually report a tool call that was already executed
- Useful when wrapping isn't possible

**Context Management**
- `setToolContext(ctx)` - Set context for all subsequent tool calls
- `getToolContext()` - Get current context
- `clearToolContext()` - Clear context
- `runWithToolContext(ctx, fn)` - Run function with scoped context

### Metadata Options

| Field | Description |
|-------|-------------|
| `description` | Human-readable tool description |
| `category` | Tool category (e.g., "external-api", "database") |
| `version` | Tool version identifier |
| `tags` | Array of tags for classification |
| `outputFields` | Array of field names to auto-extract from result |
| `usageMetadata` | Custom metrics (e.g., tokens, results count) |

## Manual Configuration

If automatic shell profile update fails, add this line to your shell profile:

**Bash** (`~/.bashrc` or `~/.bash_profile`):

```bash
[ -f ~/.claude/revenium.env ] && source ~/.claude/revenium.env
```

**Zsh** (`~/.zshrc`):

```zsh
[ -f ~/.claude/revenium.env ] && source ~/.claude/revenium.env
```

**Fish** (`~/.config/fish/config.fish`):

```fish
if test -f ~/.claude/revenium.env
    source ~/.claude/revenium.env
end
```

## IDE Configuration

If you use Claude Code through an IDE's integrated terminal, the shell profile configuration from `revenium-metering setup` should work automatically - just restart your IDE.

If telemetry isn't working, configure the environment variables directly in your IDE:

### VS Code, Cursor, Windsurf (and other VS Code-based editors)

Add to your `settings.json` (use `terminal.integrated.env.windows` or `.linux` as needed):

```json
{
  "terminal.integrated.env.osx": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
    "OTEL_LOGS_EXPORTER": "otlp",
    "OTEL_EXPORTER_OTLP_ENDPOINT": "https://api.revenium.ai/meter/v2/otlp",
    "OTEL_EXPORTER_OTLP_HEADERS": "x-api-key=hak_YOUR_API_KEY_HERE",
    "OTEL_EXPORTER_OTLP_PROTOCOL": "http/json",
    "OTEL_RESOURCE_ATTRIBUTES": "organization.name=my-org,product.name=my-product,CLAUDE_CODE_SUBSCRIPTION_TIER=max_20x,user.email=dev@company.com"
  }
}
```

> **Note**: Include `organization.name` and `product.name` in `OTEL_RESOURCE_ATTRIBUTES` if you want cost attribution. Replace the subscription tier and email with your actual values. See [Organization & Product Attribution](#organization--product-attribution).

**Tip:** Run `revenium-metering setup` first, then copy the values from `~/.claude/revenium.env`.

### JetBrains IDEs

Go to **Settings** > **Tools** > **Terminal** > **Environment variables** and add the same variables in semicolon-separated format.

### Other IDEs

Configure these environment variables in your IDE's terminal settings:

| Variable                       | Value                                                                   |
| ------------------------------ | ----------------------------------------------------------------------- |
| `CLAUDE_CODE_ENABLE_TELEMETRY` | `1`                                                                     |
| `OTEL_LOGS_EXPORTER`           | `otlp`                                                                  |
| `OTEL_EXPORTER_OTLP_ENDPOINT`  | `https://api.revenium.ai/meter/v2/otlp`                                 |
| `OTEL_EXPORTER_OTLP_HEADERS`   | `x-api-key=hak_YOUR_API_KEY`                                            |
| `OTEL_EXPORTER_OTLP_PROTOCOL`  | `http/json`                                                             |
| `OTEL_RESOURCE_ATTRIBUTES`     | `organization.name=my-org,product.name=my-product,CLAUDE_CODE_SUBSCRIPTION_TIER=max_20x,user.email=dev@company.com` |

See [Subscription Tiers](#subscription-tiers) for tier keys and [Organization & Product Attribution](#organization--product-attribution) for attribution options.

## Troubleshooting

### Telemetry not appearing in Revenium

1. **Check configuration:**

   ```bash
   revenium-metering status
   ```

2. **Verify environment variables are loaded:**

   ```bash
   echo $OTEL_LOGS_EXPORTER  # Should output: otlp
   echo $CLAUDE_CODE_ENABLE_TELEMETRY  # Should output: 1
   ```

3. **Send a test metric:**

   ```bash
   revenium-metering test --verbose
   ```

4. **Restart your terminal** - environment variables only load in new sessions

### "API key validation failed"

- Verify your API key starts with `hak_`
- Check that the API key is active in your Revenium dashboard
- Ensure network connectivity to `api.revenium.ai`

### Shell profile not updated

Run the setup with manual instructions:

```bash
revenium-metering setup --skip-shell-update
```

Then manually add the source line to your shell profile.

## Local Development Testing

For testing against local Revenium infrastructure:

```bash
revenium-metering setup \
  --api-key hak_your_test_key \
  --endpoint http://localhost:8082 \
  --tier pro
```

Note: The local metering service must be running on port 8082 with Kafka connectivity.

## Requirements

- Node.js >= 20.0.0
- Claude Code CLI installed
- Revenium API key (obtain from app.revenium.ai)

## Development

### Running Tests

```bash
npm test
npm test -- --coverage
```

### CI/CD

This project uses GitHub Actions for continuous integration. The CI pipeline runs on every push and pull request to `main`:

**Test Matrix:**

- Node.js 20.x (LTS)
- Linting with ESLint
- TypeScript compilation
- Unit and integration tests with coverage

**Coverage Requirements:**

The CI enforces minimum coverage thresholds via Vitest:

- `backfill.ts`: >80%
- `setup.ts`: >80%
- `detector.ts`: >80%
- `profile-updater.ts`: >80%

The CI will fail if:

- Linting errors are found
- TypeScript compilation fails
- Any test fails
- Coverage thresholds are not met

## License

MIT

## Support

- Issues: https://github.com/revenium/revenium-claude-code-sdk/issues
- Documentation: https://docs.revenium.ai
- Dashboard: https://app.revenium.ai
