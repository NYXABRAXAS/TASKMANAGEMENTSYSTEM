'use strict';
module.exports = {
  apps: [
    {
      name: 'prohorizon-api',
      script: 'server.js',
      cwd: __dirname,
      instances: 'max',           // one worker per CPU core
      exec_mode: 'cluster',       // zero-downtime reloads
      watch: false,               // never watch in production
      max_memory_restart: '512M',

      // ── Environment ────────────────────────────────────────
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },

      // ── Logging ────────────────────────────────────────────
      out_file:        './logs/pm2-out.log',
      error_file:      './logs/pm2-err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs:      true,
      log_type:        'json',

      // ── Restart policy ─────────────────────────────────────
      autorestart:   true,
      restart_delay: 3000,
      max_restarts:  10,
      exp_backoff_restart_delay: 100,

      // ── Graceful shutdown ──────────────────────────────────
      kill_timeout:   10000,
      listen_timeout: 8000,
      wait_ready:     true,

      // ── Health monitoring ──────────────────────────────────
      min_uptime: '10s',
    },
  ],
};
