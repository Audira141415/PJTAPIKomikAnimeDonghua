# 📙 Audira Comic & Anime API

> Platform API komprehensif untuk komik, manhwa, manhua, anime, dan donghua dengan fitur lengkap termasuk scraping, aggregasi konten, dan community features.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D16-brightgreen)
![Status](https://img.shields.io/badge/status-active%20development-brightblue)

---

## 🌟 Fitur Utama

### Content Management
- ✅ **Manga/Comics Management**: CRUD operations dengan metadata lengkap (author, artist, genres, status)
- ✅ **Anime/Donghua Management**: Manajemen season, episodes, studio information
- ✅ **Chapter/Episode Management**: Tracking per-bab/per-episode dengan image/video support
- ✅ **Web Scraping**: Otomatis scrape konten dari 20+ sumber (Komik Indo, MangaSusuku, Anichin, dll)

### User Features
- ✅ **Authentication**: JWT-based auth dengan refresh token dan password reset
- ✅ **Bookmarks**: Simpan favorit manga/anime dengan progress tracking
- ✅ **History**: Track reading/watching history per user
- ✅ **Collections**: Create custom collections & share dengan users
- ✅ **Comments & Reviews**: Community interaction dengan rating sistem

### Advanced Features
- ✅ **Full-Text Search**: Semantic search across all content
- ✅ **Rich Filtering**: Filter by genre, status, author, rating, etc.
- ✅ **Pagination**: Efficient pagination untuk large datasets
- ✅ **Caching**: Redis-based caching untuk performance optimization
- ✅ **Job Queue**: BullMQ untuk background jobs dan scheduled tasks
- ✅ **Real-time Monitoring**: Dashboard untuk sistem monitoring

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ (LTS recommended)
- MongoDB (local atau cloud - Atlas)
- Redis (untuk caching & job queue)
- npm atau yarn

### Installation

```bash
# 1. Clone repository
git clone https://github.com/audira-io/api.git
cd api

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env.local

# 4. Edit .env.local dengan credentials Anda
# MONGODB_URI, REDIS_URL, JWT_SECRET, dll

# 5. Jalankan server development
npm run dev

# Server berjalan di http://localhost:3000
```

### Environment Variables

```bash
# Server
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/audira-dev

# Cache & Queue
REDIS_URL=redis://localhost:6379/0

# Authentication
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRE=7d

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=app-password
EMAIL_FROM=noreply@audira.com

# Logging
LOG_LEVEL=debug

# Full import pipeline (optional)
# Uncomment only if a remote source is blocked in your deployment environment.
# FULL_IMPORT_DISABLED_STAGES=mangadex-all
```

---

## 📖 Struktur Project

```
src/
├── app.js                    # Express app setup
├── server.js                 # Entry point
├── config/                   # Konfigurasi
│   ├── db.js                 # MongoDB connection
│   ├── redis.js              # Redis connection
│   ├── env.js                # Environment variables
│   ├── logger.js             # Logger setup
│   └── swagger.js            # API documentation
├── models/                   # MongoDB models (13 models)
│   ├── User.js
│   ├── Manga.js
│   ├── Chapter.js
│   ├── Anime.js
│   ├── Episode.js
│   ├── Comment.js
│   ├── Review.js
│   ├── Bookmark.js
│   ├── History.js
│   ├── Collection.js
│   ├── Rating.js
│   ├── Tag.js
│   └── Season.js
├── modules/                  # Business logic (33+ modules)
│   ├── auth/                 # Authentication & Authorization
│   ├── manga/                # Manga management
│   ├── anime/                # Anime management
│   ├── comic/                # Comics scraping
│   ├── donghua/              # Donghua content
│   ├── user/                 # User profile management
│   ├── bookmark/             # Bookmark management
│   ├── history/              # Reading/watching history
│   ├── comment/              # Comments management
│   ├── review/               # Reviews management
│   ├── search/               # Full-text search
│   ├── tag/                  # Tag management
│   └── [20+ other modules]   # Specific content sources
├── middlewares/              # Express middlewares
│   ├── auth.middleware.js
│   ├── error.middleware.js
│   ├── rateLimiter.middleware.js
│   ├── validation.middleware.js
│   └── upload.middleware.js
├── jobs/                     # Background jobs
│   ├── scheduler.js          # Job scheduling
│   ├── worker.js             # Job processing
│   ├── queue.js              # Queue management
│   └── jobRunner.js          # Job execution logic
├── routes/                   # API routes
├── shared/                   # Shared utilities
├── utils/                    # Helper functions
└── tests/                    # Test suites

```

---

## 🔌 API Endpoints

### Authentication
```bash
POST   /api/v1/auth/register         # Register user
POST   /api/v1/auth/login            # Login user
POST   /api/v1/auth/refresh          # Refresh token
POST   /api/v1/auth/forgot-password  # Request password reset
POST   /api/v1/auth/reset-password   # Reset password
```

### Manga/Comics
```bash
GET    /api/v1/manga                 # List all manga
GET    /api/v1/manga/:id             # Get manga by ID
GET    /api/v1/manga/:id/chapters    # Get manga chapters
POST   /api/v1/manga                 # Create manga (admin)
PATCH  /api/v1/manga/:id             # Update manga (admin)
DELETE /api/v1/manga/:id             # Delete manga (admin)
GET    /api/v1/manga/search          # Search manga
```

### Anime
```bash
GET    /api/v1/anime                 # List all anime
GET    /api/v1/anime/:id             # Get anime by ID
GET    /api/v1/anime/:id/episodes    # Get anime episodes
GET    /api/v1/anime/:id/seasons     # Get anime seasons
```

### User Features
```bash
GET    /api/v1/users/profile         # Get user profile
PATCH  /api/v1/users/profile         # Update profile
GET    /api/v1/bookmarks             # Get user bookmarks
POST   /api/v1/bookmarks             # Add bookmark
DELETE /api/v1/bookmarks/:id         # Remove bookmark
GET    /api/v1/history               # Get reading history
```

### Comments & Reviews
```bash
GET    /api/v1/comments              # Get comments
POST   /api/v1/comments              # Create comment
PATCH  /api/v1/comments/:id          # Update comment
DELETE /api/v1/comments/:id          # Delete comment
```

**📚 Full API documentation:** `http://localhost:3000/api-docs` (Swagger UI)

---

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:unit
npm run test:integration

# Run with coverage report
npm run test:coverage

# Watch mode
npm run test -- --watch
```

### Coverage Target
- **Statements**: 80%
- **Branches**: 60%
- **Functions**: 75%
- **Lines**: 80%

---

## 🔒 Security

### Features
- ✅ JWT token-based authentication
- ✅ Password hashing with bcrypt
- ✅ Rate limiting on all endpoints
- ✅ CORS configuration
- ✅ Security headers (Helmet.js)
- ✅ Input validation & sanitization
- ✅ Request ID tracking
- ✅ Error handling without sensitive data leakage

### Security Checklist

See [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) untuk checklist lengkap.

**Key Items:**
- [ ] All secrets in environment variables
- [ ] HTTPS enabled in production
- [ ] Database credentials secured
- [ ] API keys rotated regularly
- [ ] Dependencies kept up-to-date

---

## 🚢 Deployment

### Platform Options

#### 1. Railway (Recommended)
```bash
# Connect Git repository dan auto-deploy
1. Push ke main branch
2. Railway auto-builds and deploys
3. Configure env vars di dashboard
```

#### 2. Docker
```bash
docker build -t audira-api .
docker run -p 3000:3000 audira-api
```

#### 3. PM2
```bash
pm2 start src/server.js --name audira-api
pm2 startup
pm2 save
```

### Deployment Guide
Lihat [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) untuk instruksi lengkap.

---

## 📊 Performance

### Optimization Strategies
- ✅ Database indexing pada fields yang sering di-query
- ✅ Redis caching untuk frequently accessed data
- ✅ Query projection untuk reduce payload size
- ✅ Pagination untuk avoid loading huge datasets
- ✅ Compression (gzip) pada responses
- ✅ Connection pooling untuk database

### Benchmarks (Development)
- Response time: ~100-200ms (cached), ~500-1000ms (fresh)
- Database queries: Optimized dengan indexes
- Cache hit rate: ~70-80% untuk popular content
- API throughput: 1000+ requests/sec

---

## 📈 Monitoring

### Health Check
```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-04-12T10:00:00Z",
  "version": "1.0.0",
  "database": "connected",
  "redis": "connected",
  "uptime": 86400000
}
```

### Logs
- Development: Console + File
- Production: Centralized logging (Sentry/ELK recommended)

### Metrics
- Request count
- Response time distribution
- Error rates by endpoint
- Database query performance
- Cache hit/miss ratio

---

## 🔧 Development

### Available Scripts

```bash
npm start              # Start production server
npm run dev            # Start development server (nodemon)
npm test               # Run all tests
npm run test:unit      # Run unit tests
npm run test:integration  # Run integration tests
npm run test:coverage  # Generate coverage report
npm run lint:syntax    # Check syntax
npm audit              # Check dependency vulnerabilities
npm run security:audit # Security audit
npm run seed           # Seed database
npm run import:full    # One-command full import with checkpoint resume
npm run scheduler      # Run job scheduler
npm run worker         # Run job worker
full-import-daily.bat  # Windows batch: reset checkpoint lalu jalankan full import
```

### Daily Full Import
- Default cron untuk scheduler: `SCRAPER_FULL_IMPORT_CRON=0 6 * * *`
- Waktu default: setiap hari jam 06:00 WIB
- Kalau ingin jadwal lain, ubah `SCRAPER_FULL_IMPORT_CRON` di `.env` atau `docker-compose.yml`

### Code Style
- ESLint configuration included
- Prettier for code formatting
- Follow Node.js conventi

ons

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push dan create PR
git push origin feature/your-feature
```

---

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Requirements
- Add tests for new features
- Update documentation
- Follow code style guidelines
- Pass all tests before submitting PR

---

## 📚 Documentation Files

- **[SECURITY_AUDIT.md](./SECURITY_AUDIT.md)** - Security checklist dan best practices
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Panduan deployment production
- **[API_DOCUMENTATION.md](./docs/API.md)** - Detailed API endpoints
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - System architecture
- **[TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)** - Common issues & solutions

---

## 🐛 Troubleshooting

### Common Issues

#### "MongoDB connection failed"
```bash
# Check MongoDB is running
mongod --version

# Verify MONGODB_URI in .env
# Format: mongodb+srv://user:pass@cluster.mongodb.net/dbname
```

#### "Redis connection refused"
```bash
# Check Redis is running
redis-cli ping  # Should return PONG

# Verify REDIS_URL in .env
```

#### "Port 3000 already in use"
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm start
```

Lihat [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) untuk more issues.

---

## 📞 Support & Contact

- 📧 Email: support@audira.com
- 🐛 Issues: GitHub Issues
- 💬 Discord: [Join our server]
- 📖 Documentation: https://docs.audira.com

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- Scrapers dari: Komik Indo, MangaSusuku, Anichin, Otakudesu, dan many more
- Community contributors
- Open-source libraries digunakan

---

## 📊 Project Stats

![Lines of Code](https://img.shields.io/badge/lines%20of%20code-50K%2B-blue)
![Test Coverage](https://img.shields.io/badge/test%20coverage-~60%25-yellow)
![MongoDB Collections](https://img.shields.io/badge/MongoDB%20collections-13-brightgreen)
![API Endpoints](https://img.shields.io/badge/API%20endpoints-100%2B-success)

---

## 🗓️ Roadmap

### Q2 2026
- [ ] Tingkatkan test coverage ke 80%+
- [ ] Implement advanced caching strategy
- [ ] Add WebSocket support untuk real-time features
- [ ] Mobile app integration

### Q3 2026
- [ ] Microservices migration
- [ ] Advanced recommendation engine
- [ ] Machine learning untuk content classification
- [ ] International localization

### Q4 2026
- [ ] Enterprise features
- [ ] White-label solution
- [ ] Advanced analytics & reporting
- [ ] API marketplace

---

**Last Updated:** 2026-04-12  
**Maintainer:** [Your Name / Team]  
**Status:** ✅ Active Development
