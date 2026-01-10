# Examples

This directory contains example usage patterns for @revenium/claude-code-metering.

## Prerequisites

- Node.js 18+
- Revenium API key (obtain from [app.revenium.ai](https://app.revenium.ai))
- Claude Code CLI installed

## Running Examples

All examples use the CLI commands. No TypeScript compilation needed.

```bash
# Interactive setup
revenium-metering setup

# Check current status
revenium-metering status

# Send test metric
revenium-metering test --verbose
```

## Available Examples

| Example | Command | Description |
|---------|---------|-------------|
| Interactive Setup | `revenium-metering setup` | Full wizard with prompts |
| Non-Interactive | `revenium-metering setup --api-key hak_... --tier pro` | CI/CD friendly |
| Status Check | `revenium-metering status` | View configuration |
| Test Metric | `revenium-metering test --verbose` | Verify integration |

## Setup Scenarios

### Personal Developer Setup (Pro Tier)

```bash
revenium-metering setup \
  --api-key hak_your_api_key \
  --email developer@company.com \
  --tier pro
```

### Team Setup (Team Premium)

```bash
revenium-metering setup \
  --api-key hak_team_key \
  --email team@company.com \
  --tier team_premium
```

### Enterprise Setup

```bash
revenium-metering setup \
  --api-key hak_enterprise_key \
  --email admin@enterprise.com \
  --tier enterprise
```

### Development/Testing (Local Endpoint)

```bash
revenium-metering setup \
  --api-key hak_dev_key \
  --endpoint http://localhost:8082 \
  --tier api
```

## Verification Steps

After running setup:

1. **Check configuration exists:**
   ```bash
   cat ~/.claude/revenium.env
   ```

2. **Verify environment is loaded:**
   ```bash
   source ~/.claude/revenium.env
   echo $OTEL_METRICS_EXPORTER  # Should output: otlp
   ```

3. **Run status check:**
   ```bash
   revenium-metering status
   ```

4. **Send test metric:**
   ```bash
   revenium-metering test --verbose
   ```

## Custom Cost Multiplier

After running setup, you can override the cost multiplier:

```bash
# Edit ~/.claude/revenium.env
export OTEL_RESOURCE_ATTRIBUTES="cost_multiplier=0.12"
```

Then reload:
```bash
source ~/.claude/revenium.env
```

## Troubleshooting

If examples fail, see the main [README.md](../README.md#troubleshooting) for common issues.
