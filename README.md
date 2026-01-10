# @revenium/claude-code-metering

[![npm version](https://img.shields.io/npm/v/@revenium/claude-code-metering.svg)](https://www.npmjs.com/package/@revenium/claude-code-metering)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Documentation](https://img.shields.io/badge/docs-revenium.io-blue)](https://docs.revenium.io)
[![Website](https://img.shields.io/badge/website-revenium.ai-blue)](https://www.revenium.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**CLI tool for automatic Revenium usage tracking with Claude Code**

A professional-grade CLI tool that configures Claude Code to export OpenTelemetry (OTLP) telemetry data to Revenium's metering infrastructure. Enables usage tracking, cost attribution, and subscription optimization for Claude Code API calls.

## Features

- **Zero-Code Integration** - Simple CLI setup, no code changes required
- **Automatic Tracking** - Captures all Claude Code API calls automatically via OTLP
- **Cost Attribution** - Track AI spend per developer, team, or project
- **Subscription Tiers** - Apply subscription discounts (Pro, Max, Enterprise) to cost calculations
- **Shell Integration** - Automatic shell profile configuration (Bash, Zsh, Fish)
- **Non-Interactive Mode** - CI/CD friendly with command-line options

## Prerequisites

**Before starting, you'll need:**

1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **Claude Code CLI** - [Installation guide](https://docs.anthropic.com/en/docs/claude-code)
3. **Revenium API Key** - Obtain from [app.revenium.ai](https://app.revenium.ai):
   - Sign up or log in
   - Navigate to **Settings → API Keys**
   - Create a new API key (starts with `hak_`)

---

## Getting Started

### 1. Install the Package

```bash
npm install -g @revenium/claude-code-metering
```

Or use npx (no install required):

```bash
npx @revenium/claude-code-metering setup
```

### 2. Run the Setup Wizard

```bash
revenium-metering setup
```

The wizard will prompt you for:
- **API Key**: Your Revenium API key (`hak_...`)
- **Email**: For usage attribution (optional)
- **Subscription Tier**: Your Claude Code subscription

### 3. Restart Your Terminal

The setup automatically updates your shell profile. Either:
- Open a new terminal, OR
- Run: `source ~/.claude/revenium.env`

### 4. Use Claude Code Normally

That's it! Telemetry will be sent to Revenium automatically when you use Claude Code.

---

## What Gets Tracked

The tool configures Claude Code to export the following via OpenTelemetry:

### **Usage Metrics**

- **Session ID** - Unique identifier for each Claude Code session
- **Model Information** - Model used (claude-opus-4-5, claude-sonnet-4, etc.)
- **Token Counts** - Input tokens, output tokens, cache read/creation tokens
- **Request Timing** - Request timestamps

### **Cost Attribution**

- **Subscription Tier** - Applied cost multiplier based on your plan
- **Email** - For per-developer attribution
- **Organization/Product IDs** - Optional business context

---

## API Overview

### Commands

| Command | Description |
|---------|-------------|
| `revenium-metering setup` | Interactive configuration wizard |
| `revenium-metering status` | Check current configuration and connectivity |
| `revenium-metering test` | Send test metric to verify integration |

### Setup Options

```bash
revenium-metering setup [options]

Options:
  -k, --api-key <key>     Revenium API key (hak_...)
  -e, --email <email>     Email for usage attribution
  -t, --tier <tier>       Subscription tier
  --endpoint <url>        Revenium API endpoint (default: https://api.revenium.ai)
  --skip-shell-update     Skip automatic shell profile update
```

**Non-interactive mode (CI/CD):**

```bash
revenium-metering setup \
  --api-key hak_your_key_here \
  --email developer@company.com \
  --tier pro
```

---

## Configuration

### Environment Variables

The setup creates `~/.claude/revenium.env` with:

| Variable | Description |
|----------|-------------|
| `CLAUDE_CODE_ENABLE_TELEMETRY` | Enables Claude Code telemetry export (`1`) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Revenium OTLP endpoint URL |
| `OTEL_EXPORTER_OTLP_HEADERS` | Authentication header with API key |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | OTLP protocol (`http/json`) |
| `OTEL_METRICS_EXPORTER` | Set to `otlp` to enable metrics export |
| `OTEL_RESOURCE_ATTRIBUTES` | Cost multiplier based on subscription tier |

### Subscription Tiers

| Tier | Monthly Cost | Cost Multiplier | Effective Discount |
|------|-------------|-----------------|-------------------|
| Pro | $20/mo | 0.16 | 84% |
| Max 5x | $100/mo | 0.16 | 84% |
| Max 20x | $200/mo | 0.08 | 92% |
| Team Premium | $150/seat | 0.24 | 76% |
| Enterprise | Custom | 0.05 | 95% |
| API (no subscription) | Pay-per-token | 1.0 | 0% |

### Optional: Organization & Product IDs

For business context tracking, you can set additional environment variables:

```bash
export REVENIUM_ORGANIZATION_ID=your-org-id
export REVENIUM_PRODUCT_ID=your-product-id
```

---

## Examples

**For complete examples and usage patterns, see [`examples/README.md`](https://github.com/revenium/revenium-claude-code-sdk/blob/HEAD/examples/README.md).**

### Quick Examples

```bash
# Interactive setup
revenium-metering setup

# Non-interactive (CI/CD)
revenium-metering setup --api-key hak_key --tier pro

# Check status
revenium-metering status

# Test the integration
revenium-metering test --verbose
```

---

## Troubleshooting

### Telemetry not appearing in Revenium

1. **Check configuration:**
   ```bash
   revenium-metering status
   ```

2. **Verify environment variables are loaded:**
   ```bash
   echo $OTEL_METRICS_EXPORTER  # Should output: otlp
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

Run setup with manual instructions:
```bash
revenium-metering setup --skip-shell-update
```

Then manually add to your shell profile:

**Bash/Zsh:**
```bash
[ -f ~/.claude/revenium.env ] && source ~/.claude/revenium.env
```

**Fish:**
```fish
if test -f ~/.claude/revenium.env
    source ~/.claude/revenium.env
end
```

### Debug Mode

Enable detailed logging:
```bash
REVENIUM_DEBUG=true revenium-metering status
```

---

## Documentation

For detailed documentation, visit [docs.revenium.io](https://docs.revenium.io)

## Contributing

See [CONTRIBUTING.md](https://github.com/revenium/revenium-claude-code-sdk/blob/HEAD/CONTRIBUTING.md)

## Code of Conduct

See [CODE_OF_CONDUCT.md](https://github.com/revenium/revenium-claude-code-sdk/blob/HEAD/CODE_OF_CONDUCT.md)

## Security

See [SECURITY.md](https://github.com/revenium/revenium-claude-code-sdk/blob/HEAD/SECURITY.md)

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/revenium/revenium-claude-code-sdk/blob/HEAD/LICENSE) file for details.

## Support

For issues, feature requests, or contributions:

- **Website**: [www.revenium.ai](https://www.revenium.ai)
- **GitHub Repository**: [revenium/revenium-claude-code-sdk](https://github.com/revenium/revenium-claude-code-sdk)
- **Issues**: [Report bugs or request features](https://github.com/revenium/revenium-claude-code-sdk/issues)
- **Documentation**: [docs.revenium.io](https://docs.revenium.io)
- **Email**: support@revenium.io

---

**Built by Revenium**
