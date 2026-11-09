#!/usr/bin/env bash
# ==============================================================================
# ZipZap - Oracle Cloud VM Automated Daily Scraping Setup
# Configures automated daily scraping for Indian Govt Jobs & Private Jobs
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================================="
echo "🇮🇳 ZipZap - Oracle Cloud Automated Scraper Setup"
echo "=========================================================="

# 1. Check Python3 and venv
if ! command -v python3 &> /dev/null; then
    echo "Installing python3 and python3-venv..."
    sudo apt update && sudo apt install -y python3 python3-pip python3-venv
fi

# 2. Create and activate virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment in $SCRIPT_DIR/venv..."
    python3 -m venv venv
fi

echo "Activating virtual environment and installing dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 3. Create logs directory
mkdir -p "$SCRIPT_DIR/logs"

# 4. Create cron runner script
RUNNER_SCRIPT="$SCRIPT_DIR/run_daily_scrapers.sh"
cat << 'EOF' > "$RUNNER_SCRIPT"
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
source venv/bin/activate

TIMESTAMP=$(date "+%Y-%m-%d_%H-%M-%S")
LOG_FILE="$SCRIPT_DIR/logs/scrape_$TIMESTAMP.log"

echo "=== Scrape Started at $(date) ===" >> "$LOG_FILE"

# 1. Run Indian Govt Jobs & Exams Scraper
echo "--- Running Govt Jobs & Exams Scraper ---" >> "$LOG_FILE"
python3 govt_scraper.py >> "$LOG_FILE" 2>&1

# 2. Run Multi-Portal Private Jobs Scraper
echo "--- Running Multi-Portal Jobs Scraper ---" >> "$LOG_FILE"
python3 scraper.py >> "$LOG_FILE" 2>&1

echo "=== Scrape Finished at $(date) ===" >> "$LOG_FILE"
EOF

chmod +x "$RUNNER_SCRIPT"

# 5. Add cron job to crontab (Runs daily at 8:30 AM IST and 6:30 PM IST)
# Note: Oracle VM usually runs in UTC. 
# 8:30 AM IST = 03:00 UTC
# 6:30 PM IST = 13:00 UTC
CRON_CMD="0 3,13 * * * $RUNNER_SCRIPT"

# Check if cron job already exists
(crontab -l 2>/dev/null | grep -F "$RUNNER_SCRIPT") || (
    (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
    echo "✓ Added automated cron schedule (08:30 AM IST & 06:30 PM IST daily)"
)

echo "=========================================================="
echo "✅ Oracle Cloud Scraper Automation successfully configured!"
echo "• Runner script: $RUNNER_SCRIPT"
echo "• Logs folder: $SCRIPT_DIR/logs"
echo "• Test run now with: $RUNNER_SCRIPT"
echo "=========================================================="

