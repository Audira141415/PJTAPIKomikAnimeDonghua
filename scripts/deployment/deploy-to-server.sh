#!/bin/bash
# Deploy Endpoint Monitor to Server
# ════════════════════════════════════════════════════════════════════════════
# Run this script setelah SSH ke server:
#   ssh audira@192.168.100.158
#   bash deploy-to-server.sh
# ════════════════════════════════════════════════════════════════════════════

set -e

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║              ENDPOINT MONITOR SERVER DEPLOYMENT                            ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Define colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get project directory
PROJECT_DIR=$(pwd)
echo -e "${BLUE}[1/6]${NC} Project directory: ${PROJECT_DIR}"

# Step 1: Backup current .env
if [ -f "$PROJECT_DIR/.env" ]; then
    BACKUP_FILE="$PROJECT_DIR/.env.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$PROJECT_DIR/.env" "$BACKUP_FILE"
    echo -e "${GREEN}[2/6]${NC} Backup created: $BACKUP_FILE"
else
    echo -e "${YELLOW}[2/6]${NC} No existing .env found, creating new one"
fi

# Step 2: Update .env with Telegram & Monitor config
echo -e "${BLUE}[3/6]${NC} Updating .env with Telegram & Monitor configuration..."

# Append or update configuration
if grep -q "TELEGRAM_BOT_TOKEN" "$PROJECT_DIR/.env" 2>/dev/null; then
    echo -e "${YELLOW}    → Telegram config already exists, updating...${NC}"
    sed -i 's/^TELEGRAM_BOT_TOKEN=.*/TELEGRAM_BOT_TOKEN=8793938728:AAGO6A3914gqe5SkHDzFEG11J8AtEj0EV4U/' "$PROJECT_DIR/.env"
    sed -i 's/^TELEGRAM_CHAT_ID=.*/TELEGRAM_CHAT_ID=-5283057899/' "$PROJECT_DIR/.env"
else
    echo -e "${YELLOW}    → Adding Telegram config to .env${NC}"
    cat >> "$PROJECT_DIR/.env" << 'EOF'

# ═══════════════════════════════════════════════════════════════════════════════
# TELEGRAM & ENDPOINT MONITOR
# ═══════════════════════════════════════════════════════════════════════════════

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=8793938728:AAGO6A3914gqe5SkHDzFEG11J8AtEj0EV4U
TELEGRAM_CHAT_ID=-5283057899

# Endpoint Monitor Configuration
ENDPOINT_MONITOR_ENABLED=true
ENDPOINT_MONITOR_CRON=*/15 * * * *
ENDPOINT_MONITOR_BASE_URL=http://api:5000
ENDPOINT_MONITOR_TIMEOUT_MS=10000
ENDPOINT_MONITOR_NOTIFY_ON_SUCCESS=false
ENDPOINT_MONITOR_MAX_FAIL_LINES=20
ENDPOINT_MONITOR_MAX_TARGETS=50
ENDPOINT_MONITOR_ALLOW_PRIVATE_BASE_URL=false
EOF
fi

echo -e "${GREEN}    ✓ Configuration updated${NC}"

# Step 3: Verify Docker Compose services
echo -e "${BLUE}[4/6]${NC} Checking Docker Compose services..."
docker compose -p pjtapikomikanimedonghua ps
echo ""

# Step 4: Restart services
echo -e "${BLUE}[5/6]${NC} Restarting services (scheduler, worker, api)..."
docker compose -p pjtapikomikanimedonghua restart scheduler worker api
echo -e "${GREEN}    ✓ Services restarted${NC}"
echo ""

# Step 5: Verify services are running
echo -e "${BLUE}[6/6]${NC} Verifying service status..."
sleep 3
docker compose -p pjtapikomikanimedonghua ps

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                   ✅ DEPLOYMENT COMPLETE                                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}📊 NEXT STEPS:${NC}"
echo "  1. Verify scheduler logs:"
echo "     ${YELLOW}docker-compose logs scheduler | grep endpoint-monitor${NC}"
echo ""
echo "  2. Monitor live logs:"
echo "     ${YELLOW}docker-compose logs -f scheduler${NC}"
echo ""
echo "  3. Check Telegram group for notifications:"
echo "     → 'Audira WEB/API komik'"
echo ""
echo "  4. Endpoint monitor will run every 15 minutes automatically"
echo ""

echo -e "${YELLOW}⚠️  IMPORTANT:${NC}"
echo "  • Check logs: docker-compose logs scheduler"
echo "  • Verify config: docker-compose exec api env | grep TELEGRAM"
echo "  • Manual test: curl -X POST http://localhost:5000/api/v1/jobs/endpoint-monitor"
echo ""
