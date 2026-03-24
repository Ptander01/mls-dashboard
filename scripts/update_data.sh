#!/bin/bash
# update_data.sh — MLS 2026 Data Pipeline Wrapper
#
# Runs the full data pipeline:
#   1. Scrape Fox Sports for counting stats (cards, fouls, tackles, etc.)
#   2. Fetch ASA data and merge with Fox Sports stats → mls2026.json
#
# Usage:
#   cd /path/to/mls-dashboard
#   bash scripts/update_data.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "========================================"
echo "  MLS 2026 Data Pipeline"
echo "  $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "========================================"
echo ""

echo "Step 1/2: Scraping Fox Sports..."
echo "────────────────────────────────"
python3 scripts/scrape_fox_stats.py
echo ""

echo "Step 2/2: Fetching ASA data and merging..."
echo "────────────────────────────────────────────"
python3 scripts/fetch_2026_season.py
echo ""

echo "========================================"
echo "  Pipeline complete!"
echo "========================================"
