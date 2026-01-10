# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed
- **BREAKING**: Changed from `OTEL_LOGS_EXPORTER` to `OTEL_METRICS_EXPORTER` in generated config
  - If you have an existing `~/.claude/revenium.env`, run `revenium-metering setup` to regenerate it
  - The `status` command now detects old configs and warns about migration

### Added
- SDK standardization files (LICENSE, SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, CHANGELOG.md)
- Examples directory with usage samples
- Migration detection in `status` command to identify outdated configurations
- Unit tests for config content generation (OTEL exporter type validation)

## [0.1.0] - 2026-01-05

### Fixed
- Changed OTEL endpoint from `/meter/v2/ai/otlp/v1/logs` to `/meter/v2/otel/v1/metrics` (PR #3)
- Changed payload format from OTEL Logs to OTEL Metrics for correct API compatibility

### Added
- Interactive setup wizard (`revenium-metering setup`)
- Status check command (`revenium-metering status`)
- Test metric sender (`revenium-metering test`)
- Shell profile auto-detection (bash, zsh, fish)
- Subscription tier configuration (Pro, Max, Team, Enterprise, API)
- Cost multiplier calculation based on subscription tier
- Non-interactive mode with CLI flags
- Verbose output option for debugging

### Configuration
- Creates `~/.claude/revenium.env` with OTEL environment variables
- Automatic shell profile sourcing configuration
- Support for custom endpoints (for development/testing)

### Supported Tiers
| Tier | Cost Multiplier | Effective Discount |
|------|-----------------|-------------------|
| Pro | 0.16 | 84% |
| Max 5x | 0.16 | 84% |
| Max 20x | 0.08 | 92% |
| Team Premium | 0.24 | 76% |
| Enterprise | 0.05 | 95% |
| API | 1.0 | 0% |

[Unreleased]: https://github.com/revenium/revenium-claude-code-metering/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/revenium/revenium-claude-code-metering/releases/tag/v0.1.0
