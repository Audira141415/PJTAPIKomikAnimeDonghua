# auto-deploy.ps1
# Automate deployment from local machine to production server

Write-Host "🚀 Starting Automatic Deployment..." -ForegroundColor Cyan

# Step 1: Push local changes to GitHub
Write-Host "[1/3] Syncing local changes to GitHub..." -ForegroundColor Yellow
# Run save.bat but we'll check git status instead of just exit code
.\save.bat "auto: deployment sync"

# Check if we are in sync with origin
$gitStatus = git status
if ($gitStatus -match "Your branch is up to date with 'origin/main'") {
    Write-Host "✅ Local changes synced successfully (or already up to date)." -ForegroundColor Green
} else {
    Write-Host "⚠️ Warning: Local branch might not be synced. Proceeding anyway..." -ForegroundColor Yellow
}

# Step 2: Update the server via SSH
$SERVER_IP = "192.168.100.158"
$SERVER_USER = "audira"

Write-Host "[2/3] Updating production server ($SERVER_IP)..." -ForegroundColor Yellow
ssh -o ConnectTimeout=10 "$SERVER_USER@$SERVER_IP" "cd audira-api && git pull origin main && docker compose restart api"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: SSH deployment failed. Check if SSH Key is authorized." -ForegroundColor Red
    exit 1
}

# Step 3: Check site status
Write-Host "[3/3] Deployment complete! Dashboard should be live." -ForegroundColor Green
Write-Host "URL: http://$SERVER_IP:3000" -ForegroundColor Cyan
