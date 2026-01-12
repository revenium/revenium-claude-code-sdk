# E2E Dashboard Validation Guide

**Purpose:** Verify telemetry flows from Claude Code through the SDK to the Revenium dashboard
**Last Updated:** 2026-01-12

---

## Prerequisites

- [ ] SDK installed: `npm install -g @revenium/claude-code-metering`
- [ ] Revenium API key (starts with `hak_`)
- [ ] Access to Revenium dashboard ([app.revenium.ai](https://app.revenium.ai))
- [ ] Claude Code CLI installed

---

## Step 1: Configure SDK

```bash
# Run setup wizard
revenium-metering setup

# Or non-interactive:
revenium-metering setup \
  --api-key hak_your_key_here \
  --email your@email.com \
  --tier pro
```

**Verify configuration:**
```bash
revenium-metering status
```

Expected output should show:
- ✅ Configuration file exists
- ✅ API key configured
- ✅ OTEL endpoint configured

---

## Step 2: Verify Environment Variables

After setup, verify the generated config:

```bash
# Source the config
source ~/.claude/revenium.env

# Verify critical variables
echo "CLAUDE_CODE_ENABLE_TELEMETRY: $CLAUDE_CODE_ENABLE_TELEMETRY"  # Should be: 1
echo "OTEL_METRICS_EXPORTER: $OTEL_METRICS_EXPORTER"                # Should be: otlp
echo "OTEL_EXPORTER_OTLP_ENDPOINT: $OTEL_EXPORTER_OTLP_ENDPOINT"    # Should contain api.revenium.ai
```

**Critical Check:** `OTEL_METRICS_EXPORTER` must be `otlp` (NOT `OTEL_LOGS_EXPORTER`)

---

## Step 3: Send Test Metric

```bash
# Send test metric to verify connectivity
revenium-metering test --verbose
```

Expected output:
- HTTP 200 response
- "Test metric sent successfully" message

---

## Step 4: Dashboard Verification

### 4.1 Log into Dashboard

1. Go to [app.revenium.ai](https://app.revenium.ai)
2. Log in with your credentials
3. Navigate to the appropriate workspace

### 4.2 Find Test Transaction

1. Go to **Transactions** or **AI Analytics** page
2. Filter by:
   - Time range: Last 5 minutes
   - Source: Claude Code (if available)
3. Look for the test transaction

### 4.3 Verify Transaction Data

| Field | Expected Value | Check |
|-------|----------------|-------|
| Provider | `CLAUDE` or `ANTHROPIC` | ☐ |
| Model | Model name from test | ☐ |
| Input Tokens | > 0 | ☐ |
| Output Tokens | > 0 | ☐ |
| Timestamp | Within last 5 minutes | ☐ |

---

## Step 5: Full E2E with Claude Code

### 5.1 Start New Terminal

```bash
# Open new terminal to load environment
# Verify env vars are loaded
echo $OTEL_METRICS_EXPORTER  # Should output: otlp
```

### 5.2 Use Claude Code

```bash
# Start Claude Code
claude

# Make a simple request
> What is 2+2?
```

### 5.3 Verify in Dashboard

1. Wait 30-60 seconds for telemetry to arrive
2. Check Transactions page
3. Look for Claude Code session transaction

---

## Troubleshooting

### Transaction Not Appearing

1. **Check environment loaded:**
   ```bash
   env | grep OTEL
   ```

2. **Verify API key is valid:**
   ```bash
   revenium-metering test --verbose
   ```

3. **Check for errors:**
   ```bash
   REVENIUM_DEBUG=true revenium-metering test
   ```

### Wrong Exporter Type

If you see `OTEL_LOGS_EXPORTER` instead of `OTEL_METRICS_EXPORTER`:

```bash
# Re-run setup to fix
revenium-metering setup --api-key YOUR_KEY --tier pro

# Verify fix
grep EXPORTER ~/.claude/revenium.env
```

### API Key Issues

- Verify key starts with `hak_`
- Check key is active in dashboard (Settings → API Keys)
- Ensure network connectivity to `api.revenium.ai`

---

## Success Criteria

All of the following must pass:

- [ ] SDK setup completes without errors
- [ ] `revenium-metering status` shows all green
- [ ] `revenium-metering test` returns HTTP 200
- [ ] Test transaction appears in dashboard within 60 seconds
- [ ] Token counts are > 0
- [ ] Full Claude Code session telemetry appears after using Claude

---

## Validation Checklist

Use this checklist before marking publication complete:

```
E2E Dashboard Validation
========================
Date: ___________
Tester: ___________
SDK Version: ___________

[ ] Step 1: SDK configured successfully
[ ] Step 2: Environment variables correct
    [ ] OTEL_METRICS_EXPORTER = otlp
    [ ] OTEL_EXPORTER_OTLP_ENDPOINT contains api.revenium.ai
[ ] Step 3: Test metric returned HTTP 200
[ ] Step 4: Test transaction visible in dashboard
[ ] Step 5: Full Claude Code E2E works

Result: PASS / FAIL
Notes: ___________
```

---

## Related Documentation

- [README.md](../README.md) - SDK overview and setup
- [examples/README.md](../examples/README.md) - Usage examples
- [OTEL Integration Checklist](https://docs.revenium.io) - OTEL configuration details
