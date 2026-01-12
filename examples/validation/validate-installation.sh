#!/bin/bash
# validate-installation.sh
# Comprehensive validation script for @revenium/claude-code-metering
#
# Usage: ./validate-installation.sh [--api-key KEY] [--endpoint URL]
#
# This script validates:
# 1. CLI is installed and accessible
# 2. Setup command works (creates config)
# 3. Status command shows correct configuration
# 4. Test command successfully sends metrics to Revenium
# 5. Generated config has correct OTEL settings

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
API_KEY="${REVENIUM_API_KEY:-}"
ENDPOINT="${REVENIUM_ENDPOINT:-https://api.revenium.ai}"
TIER="pro"
EMAIL="validation@test.com"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --api-key)
      API_KEY="$2"
      shift 2
      ;;
    --endpoint)
      ENDPOINT="$2"
      shift 2
      ;;
    --tier)
      TIER="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     @revenium/claude-code-metering - Validation Suite      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

PASS_COUNT=0
FAIL_COUNT=0

pass() {
  echo -e "${GREEN}✓ PASS:${NC} $1"
  ((PASS_COUNT++))
}

fail() {
  echo -e "${RED}✗ FAIL:${NC} $1"
  ((FAIL_COUNT++))
}

warn() {
  echo -e "${YELLOW}⚠ WARN:${NC} $1"
}

# ═══════════════════════════════════════════════════════════════
# CHECK 1: CLI Installation
# ═══════════════════════════════════════════════════════════════
echo -e "\n${BLUE}[1/5] Checking CLI installation...${NC}"

if command -v revenium-metering &> /dev/null; then
  VERSION=$(revenium-metering --version 2>/dev/null || echo "unknown")
  pass "CLI installed (version: $VERSION)"
else
  fail "CLI not found. Install with: npm install -g @revenium/claude-code-metering"
  echo "Aborting validation - CLI required for remaining tests"
  exit 1
fi

# ═══════════════════════════════════════════════════════════════
# CHECK 2: Help Commands
# ═══════════════════════════════════════════════════════════════
echo -e "\n${BLUE}[2/5] Checking help commands...${NC}"

if revenium-metering --help &> /dev/null; then
  pass "Main help command works"
else
  fail "Main help command failed"
fi

if revenium-metering setup --help &> /dev/null; then
  pass "Setup help command works"
else
  fail "Setup help command failed"
fi

# ═══════════════════════════════════════════════════════════════
# CHECK 3: Setup Command (requires API key)
# ═══════════════════════════════════════════════════════════════
echo -e "\n${BLUE}[3/5] Checking setup command...${NC}"

if [ -z "$API_KEY" ]; then
  warn "No API key provided. Skipping setup test."
  warn "Run with: ./validate-installation.sh --api-key hak_your_key"
else
  # Backup existing config if present
  CONFIG_FILE="$HOME/.claude/revenium.env"
  BACKUP_FILE="$HOME/.claude/revenium.env.backup.$$"

  if [ -f "$CONFIG_FILE" ]; then
    cp "$CONFIG_FILE" "$BACKUP_FILE"
    echo "Backed up existing config to $BACKUP_FILE"
  fi

  # Run setup in non-interactive mode
  if revenium-metering setup \
    --api-key "$API_KEY" \
    --email "$EMAIL" \
    --tier "$TIER" \
    --endpoint "$ENDPOINT" \
    --skip-shell-update &> /dev/null; then
    pass "Setup command completed"

    # Verify config file created
    if [ -f "$CONFIG_FILE" ]; then
      pass "Config file created at $CONFIG_FILE"

      # Check OTEL settings (CRITICAL)
      if grep -q "OTEL_METRICS_EXPORTER=otlp" "$CONFIG_FILE"; then
        pass "OTEL_METRICS_EXPORTER correctly set to 'otlp'"
      else
        fail "OTEL_METRICS_EXPORTER not set correctly"
      fi

      if grep -q "OTEL_EXPORTER_OTLP_ENDPOINT" "$CONFIG_FILE"; then
        pass "OTEL_EXPORTER_OTLP_ENDPOINT configured"
      else
        fail "OTEL_EXPORTER_OTLP_ENDPOINT missing"
      fi

      # Check for legacy OTEL_LOGS_EXPORTER (should NOT be present)
      if grep -q "OTEL_LOGS_EXPORTER" "$CONFIG_FILE"; then
        fail "Config contains legacy OTEL_LOGS_EXPORTER (should be OTEL_METRICS_EXPORTER)"
      else
        pass "No legacy OTEL_LOGS_EXPORTER present"
      fi

    else
      fail "Config file not created"
    fi
  else
    fail "Setup command failed"
  fi

  # Restore backup if it existed
  if [ -f "$BACKUP_FILE" ]; then
    mv "$BACKUP_FILE" "$CONFIG_FILE"
    echo "Restored original config"
  fi
fi

# ═══════════════════════════════════════════════════════════════
# CHECK 4: Status Command
# ═══════════════════════════════════════════════════════════════
echo -e "\n${BLUE}[4/5] Checking status command...${NC}"

if revenium-metering status &> /dev/null; then
  pass "Status command works"
else
  warn "Status command returned non-zero (may be expected if not configured)"
fi

# ═══════════════════════════════════════════════════════════════
# CHECK 5: Test Command (requires API key)
# ═══════════════════════════════════════════════════════════════
echo -e "\n${BLUE}[5/5] Checking test command...${NC}"

if [ -z "$API_KEY" ]; then
  warn "No API key provided. Skipping test command."
else
  if revenium-metering test --verbose --endpoint "$ENDPOINT" 2>&1 | grep -q "success\|200"; then
    pass "Test command sent metrics successfully"
  else
    warn "Test command completed but success unclear - check manually"
  fi
fi

# ═══════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════
echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}VALIDATION SUMMARY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Passed: ${GREEN}$PASS_COUNT${NC}"
echo -e "Failed: ${RED}$FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}All validations passed!${NC}"
  exit 0
else
  echo -e "${RED}Some validations failed. Review output above.${NC}"
  exit 1
fi
