# Settings.json Telemetry Configuration: Research Findings

**Date**: January 16, 2026
**Status**: Investigation Complete - Approach Not Viable
**PR**: #7 (feat/settings-json-migration)

## Executive Summary

We attempted to migrate the Revenium Claude Code Metering SDK from writing `~/.claude/revenium.env` (requires shell sourcing) to writing directly to `~/.claude/settings.json` (Claude Code's native config). The goal was to enable telemetry for **all Claude Code interfaces** (CLI, VS Code extension, JetBrains, etc.) with a single configuration.

**Finding**: The settings.json `env` section does not work for telemetry configuration because Claude Code's OTLP exporter initializes before the env vars are applied to its own process.

## Background

### The Problem We Were Solving

The current SDK approach requires:
1. Writing env vars to `~/.claude/revenium.env`
2. Adding `source ~/.claude/revenium.env` to shell profiles (`.zshrc`, `.bashrc`, etc.)
3. Restarting terminals for changes to take effect

This approach has limitations:
- **VS Code Extension**: Launched from Dock/Spotlight doesn't inherit shell env vars
- **JetBrains IDEs**: Same issue - IDE-launched Claude Code doesn't see shell vars
- **Cross-platform**: Shell profile management differs across OS/shells
- **User friction**: Requires manual shell profile editing or restart

### What We Thought Would Work

Claude Code documentation states that `~/.claude/settings.json` supports an `env` section:

```json
{
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
    "OTEL_EXPORTER_OTLP_ENDPOINT": "https://api.example.com/meter/v2/otlp",
    "OTEL_EXPORTER_OTLP_HEADERS": "x-api-key=hak_xxx"
  }
}
```

The documentation claims these env vars are "applied to every session" and "available to Claude Code and all Bash commands."

We implemented a migration (PR #7) that:
1. Created `src/core/config/settings-json.ts` for JSONC read/write/backup
2. Updated config loader to read from settings.json
3. Updated setup wizard to write to settings.json instead of .env
4. Removed shell profile update logic
5. Added backup/restore functionality with comment preservation

## What We Discovered

### Test Methodology

1. Disabled both `.env` files (Claude and Gemini SDKs)
2. Removed shell profile sourcing
3. Started fresh terminal sessions
4. Verified settings.json had correct env section
5. Started Claude Code and checked telemetry

### Key Finding

**Environment variables from settings.json `env` section are only available to child processes (Bash commands executed inside Claude Code), NOT to Claude Code's own OTLP telemetry exporter.**

Evidence:

```bash
# INSIDE Claude Code (! prefix runs shell command):
! env | grep OTEL
# Shows all OTEL vars correctly ✓

# OUTSIDE Claude Code (after exiting):
env | grep OTEL
# Shows NOTHING - vars not in shell ✗
```

### Why This Happens

Claude Code's initialization sequence appears to be:

1. Start process
2. Initialize OTLP telemetry exporter (reads env vars from process environment)
3. Read settings.json
4. Apply settings.json `env` vars to internal environment (for child processes)
5. Begin session

The telemetry exporter is initialized at step 2, but settings.json env vars aren't applied until step 4. By the time the vars are available, the exporter is already configured (with no OTLP endpoint).

### Comparison: Working vs Non-Working Sessions

| Aspect | Working (shell .env) | Not Working (settings.json) |
|--------|---------------------|----------------------------|
| Vars in shell at startup | ✓ Yes | ✗ No |
| Vars available to OTLP exporter | ✓ Yes | ✗ No |
| Vars available to Bash commands | ✓ Yes | ✓ Yes |
| Telemetry sent | ✓ Yes | ✗ No |

## Implications for the SDK

### What This Means

1. **settings.json `env` cannot replace shell sourcing** for telemetry configuration
2. **IDE integrations remain problematic** - VS Code/JetBrains launched outside terminal won't have telemetry
3. **The shell sourcing approach is still required** for CLI usage
4. **No single-config solution exists** with current Claude Code architecture

### Conflict Discovery

During testing, we also discovered that having multiple Revenium SDKs (Claude + Gemini) sourced in shell profiles can cause conflicts:

- Both set `OTEL_RESOURCE_ATTRIBUTES`
- Gemini's config overwrites Claude's `cost_multiplier` with different attributes
- This breaks telemetry for whichever SDK sources second

## Proposed Next Steps

### Option 1: Report to Anthropic (Recommended)

File a feature request/bug report asking Anthropic to:
1. Read telemetry-related env vars from settings.json BEFORE initializing the OTLP exporter
2. Or provide a dedicated telemetry configuration section in settings.json that's read at startup

This would enable the settings.json approach to work as documented.

### Option 2: Hybrid Approach

Keep both mechanisms:
1. Write to settings.json (for potential future compatibility)
2. Continue writing .env and updating shell profiles (for current functionality)
3. Detect IDE context and provide appropriate instructions

### Option 3: Accept Limitations

Document the limitations clearly:
- CLI: Requires shell sourcing (works)
- VS Code/IDE: Requires launching from terminal with sourced env (workaround)
- Native IDE launch: Not supported until Anthropic fixes settings.json handling

### Option 4: Investigate Managed Settings

Claude Code has a `managed-settings.json` for enterprise deployments. Investigate if this has different initialization timing that might work for telemetry.

## Files Changed in PR #7

The migration implementation is complete and working for the settings.json write/read mechanics. The code changes are valid but the approach doesn't achieve the desired outcome due to Claude Code's initialization order.

| File | Purpose |
|------|---------|
| `src/core/config/settings-json.ts` | NEW - JSONC handling with backup |
| `src/core/config/writer.ts` | Generate env vars, write to settings.json |
| `src/core/config/loader.ts` | Read config from settings.json |
| `src/cli/commands/setup.ts` | New UX flow (automated vs manual) |
| `src/cli/commands/status.ts` | Updated messaging |
| `src/utils/constants.ts` | Added REVENIUM_MANAGED_ENV_VARS |
| `tests/unit/settings-json.test.ts` | NEW - Unit tests |

## Recommendation

**Do not merge PR #7** until Anthropic addresses the settings.json env initialization timing. The current shell-sourcing approach, while less elegant, is the only reliable method for telemetry configuration.

Consider filing an issue with Anthropic referencing:
- The documented behavior of settings.json `env` section
- The actual behavior (vars not available to OTLP exporter at startup)
- The use case (third-party telemetry integration)

## References

- [Claude Code Settings Documentation](https://docs.anthropic.com/en/docs/claude-code/settings)
- [GitHub Issue: env vars from settings.json not passed to MCPs](https://github.com/anthropics/claude-code/issues/11927) - Related issue
- PR #7: feat/settings-json-migration
- Migration Plan: `docs/plans/settings-json-migration-plan.md`
