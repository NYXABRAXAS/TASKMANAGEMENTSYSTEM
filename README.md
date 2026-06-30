# ProHorizon Backend — Production Deployment

## Stack
Node.js 18+ · Express 4 · PostgreSQL 15 · Sequelize ORM · Socket.io · PM2

## Quick Start

```bash
# 1. Install dependencies
npm install --omit=dev

# 2. Configure environment
cp .env.production .env
nano .env   # Set DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET, SMTP credentials

# 3. Start with PM2
npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup   # auto-start on reboot
```

## Health Check
```
GET http://localhost:5000/api/v1/health
```

## Logs
```bash
pm2 logs prohorizon-api
tail -f logs/pm2-err.log
```

## Zero-Downtime Reload
```bash
pm2 reload prohorizon-api
```
