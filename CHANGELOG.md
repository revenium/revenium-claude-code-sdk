# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.1.1] - 2026-01-21

### Fixed

- Corrected OTLP endpoint path from `/meter/v2/otel` to `/meter/v2/otlp`
- Changed payload format from OTEL Metrics to OTLP Logs for correct backend compatibility
- Updated endpoint URL from `/v1/metrics` to `/v1/logs`
- Fixed response field from `processedMetrics` to `processedEvents`

### Changed

- Updated minimum Node.js version from 18.0.0 to 20.0.0
- Migrated from OTEL Metrics format to OTLP Logs format
- Updated test payload structure to match ClaudeCodeMapper backend expectations
- Added email field support in test payloads for subscriber attribution

### Added

- New `hashing.ts` utility module for transaction ID generation
- Support for `user.email` attribute in log records
- Improved error message truncation (max 200 chars) for better readability
- SDK standardization files (LICENSE, SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md)
- Examples directory with usage samples
- Interactive setup wizard (`revenium-metering setup`)
- Status check command (`revenium-metering status`)
- Test metric sender (`revenium-metering test`)
- Backfill command for historical data import (`revenium-metering backfill`)
- Shell profile auto-detection (bash, zsh, fish)
- Subscription tier configuration (Pro, Max, Team, Enterprise, API)
- Cost multiplier calculation based on subscription tier
- Non-interactive mode with CLI flags
- Verbose output option for debugging
- Creates `~/.claude/revenium.env` with OTLP environment variables
- Automatic shell profile sourcing configuration
- Support for custom endpoints (for development/testing)

[Unreleased]: https://github.com/revenium/revenium-claude-code-sdk/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/revenium/revenium-claude-code-sdk/releases/tag/v0.1.1
