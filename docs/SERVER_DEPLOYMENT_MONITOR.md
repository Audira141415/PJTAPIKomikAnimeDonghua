# SERVER DEPLOYMENT GUIDE - Endpoint Monitor

**Status:** ✅ Konfigurasi Permanen Siap  
**Last Updated:** April 15, 2026  
**Components:** Telegram Bot, Endpoint Monitor, Job Scheduler  

---

## 📋 CONFIGURATION SUMMARY

Konfigurasi berikut telah diupdate di **`.env`**:

```env
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
```

**Penjabaran:**
| Variable | Value | Penjelasan |
|----------|-------|-----------|
| `TELEGRAM_BOT_TOKEN` | `8793938728:...` | Telegram bot API token |
| `TELEGRAM_CHAT_ID` | `-5283057899` | Group chat ID untuk notifikasi |
| `ENDPOINT_MONITOR_ENABLED` | `true` | Aktifkan monitoring otomatis |
| `ENDPOINT_MONITOR_CRON` | `*/15 * * * *` | Jalankan setiap 15 menit |
| `ENDPOINT_MONITOR_BASE_URL` | `http://api:5000` | Base URL internal Docker (PENTING!) |
| `ENDPOINT_MONITOR_TIMEOUT_MS` | `10000` | Timeout per endpoint: 10 detik |

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Copy `.env` ke Server
```bash
# Copy dari local development
scp .env user@server:/path/to/api/.env

# Atau edit langsung di server dengan nano/vim
nano /path/to/api/.env
```

**PENTING:** Pastikan konfigurasi Telegram dan Endpoint Monitor sudah ada di `.env` server.

---

### Step 2: Restart Docker Compose Services

```bash
# SSH ke server
ssh user@server

# Navigate ke project directory
cd /path/to/PJTAPIKomikAnimeDonghua

# Restart services untuk load env variables baru
docker-compose restart scheduler worker api

# Verifikasi services running
docker-compose ps
```

**Expected Output:**
```
NAME               IMAGE                 COMMAND                 STATUS
comic-api          project_api          "npm start"            Up (healthy)
comic-scheduler    project_scheduler    "node scripts/..."     Up
comic-worker       project_worker       "node src/jobs/..."    Up
```

---

### Step 3: Verifikasi Konfigurasi

Run verification script di server:
```bash
# Di server, dalam project directory
NODE_ENV=production node scripts/verify-endpoint-monitor-setup.js
```

**Expected Output:**
```
✅ All checks passed:
  - TELEGRAM_BOT_TOKEN = 8793938728:...
  - TELEGRAM_CHAT_ID = -5283057899
  - ENDPOINT_MONITOR_ENABLED = true
  - ENDPOINT_MONITOR_BASE_URL = http://api:5000
  - Telegram test message sent successfully
```

---

### Step 4: Monitor Logs

Periksa scheduler logs untuk konfirmasi job terjadwal:
```bash
# Real-time logs dari scheduler container
docker-compose logs -f scheduler

# Cari pattern: "Endpoint Monitor scheduled" atau "endpoint-monitor"
```

Expected logs:
```
scheduler    | [scheduler] Scheduling endpoint-monitor with cron: */15 * * * *
scheduler    | [scheduler] Next run at: 2026-04-15T16:00:00+07:00
```

---

### Step 5: Trigger Test Notification

Trigger endpoint-monitor job secara manual untuk test:
```bash
# Dari server, gunakan API endpoint
curl -X POST http://localhost:5000/api/v1/jobs/endpoint-monitor \
  -H "Authorization: Bearer <YOUR_ADMIN_TOKEN>" \
  -H "Content-Type: application/json"
```

Atau dari dashboard BullMQ:
1. Buka `http://server:3000/admin/bull` (jika Bull Board enabled)
2. Pilih queue: `endpoint-monitor`
3. Click "Add Job" untuk trigger manual

---

### Step 6: Verifikasi Notifikasi di Telegram

Periksa Telegram group **"Audira WEB/API komik"** untuk notifikasi:

✅ **Contoh notifikasi sukses:**
```
✅ Endpoint Monitor - All OK
━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Total checks: 12
✓ Passed: 12
✗ Failed: 0
```

⚠️ **Contoh notifikasi ada error:**
```
⚠️ Endpoint Monitor - 2 failures detected
━━━━━━━━━━━━━━━━━━━━━━━━━━━
✗ GET /health (status 503)
✗ POST /api/v1/search (timeout)
✓ 10 endpoints OK
```

---

## 📊 MONITORING DASHBOARD

### BullMQ Queue Status
```bash
# Akses Bull admin dashboard (jika tersedia)
http://server:3000/admin/bull

# Atau check via CLI
docker-compose exec api redis-cli
> KEYS endpoint-monitor:*
> LLEN endpoint-monitor:waiting
> LLEN endpoint-monitor:completed
```

### Docker Logs untuk Debugging
```bash
# Scheduler logs
docker-compose logs scheduler | grep endpoint-monitor

# Worker logs
docker-compose logs worker | grep endpoint-monitor

# API logs
docker-compose logs api | grep jobs
```

---

## ⚙️ TROUBLESHOOTING

### Problem: Monitor tidak jalan (tidak ada job di queue)
```bash
# Check if ENDPOINT_MONITOR_ENABLED=true
docker-compose exec scheduler sh -c 'echo $ENDPOINT_MONITOR_ENABLED'

# Check scheduler logs untuk error
docker-compose logs scheduler | tail -20

# Solution: Restart scheduler setelah update .env
docker-compose restart scheduler
```

### Problem: Notifikasi tidak terima di Telegram
```bash
# Test Telegram connection
NODE_ENV=production node scripts/verify-endpoint-monitor-setup.js

# Check if TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID correct
docker-compose exec api sh -c 'echo $TELEGRAM_BOT_TOKEN && echo $TELEGRAM_CHAT_ID'

# Manual test send message
curl -X POST "https://api.telegram.org/botTOKEN/sendMessage" \
  -d "chat_id=-5283057899" \
  -d "text=Test message"
```

### Problem: Endpoint check timeout
```bash
# Increase timeout value
ENDPOINT_MONITOR_TIMEOUT_MS=15000

# Check if ENDPOINT_MONITOR_BASE_URL accessible
docker-compose exec worker curl -I http://api:5000/health

# If using external URL, ensure firewall allows
```

### Problem: Docker networking issue
```bash
# Verify Docker network exists
docker network ls | grep comic-net

# Check container IP
docker-compose exec api hostname -I

# Verify DNS resolution
docker-compose exec scheduler nslookup api
```

---

## 🔒 SECURITY NOTES

### Telegram Token Rotation (RECOMMENDED)
Token telah di-share dalam conversation history. Untuk production:

1. Buka Telegram BotFather: `@BotFather`
2. Select bot Anda, pilih `/revoke`
3. Generate token baru
4. Update `.env` dengan token baru
5. Restart services

```bash
# Command shortcut
docker-compose exec api sh -c 'echo "Update .env with new token" && docker-compose restart scheduler worker'
```

### .env Security
- ❌ Don't commit `.env` ke git
- ✅ Use secret management (HashiCorp Vault, AWS Secrets Manager, etc.)
- ✅ Restrict `.env` file permissions: `chmod 600 .env`
- ✅ Use separate `.env.production` untuk production

---

## 📈 MONITORING CHECKLIST

- [ ] `.env` updated dengan Telegram credentials
- [ ] `ENDPOINT_MONITOR_ENABLED=true` di .env
- [ ] `ENDPOINT_MONITOR_BASE_URL=http://api:5000` (untuk Docker)
- [ ] Services restarted: `docker-compose restart scheduler worker api`
- [ ] Scheduler logs menunjukkan job terjadwal
- [ ] Test notification received di Telegram
- [ ] Cron job berjalan setiap 15 menit (verify logs setiap 15min)
- [ ] Manual trigger test berhasil via `/api/v1/jobs/endpoint-monitor`
- [ ] Telegram token rotation planned (jika token shared)

---

## 📞 SUPPORT REFERENCES

- **Telegram Bot API:** https://core.telegram.org/bots/api
- **Node Cron Syntax:** https://crontab.guru/
- **Docker Compose Docs:** https://docs.docker.com/compose/
- **BullMQ Documentation:** https://docs.bullmq.io/

---

**Last Verified:** 2026-04-15  
**Status:** ✅ Ready for Production Deployment
