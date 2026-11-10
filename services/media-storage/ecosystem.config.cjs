/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

let envConfig = {};
try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        envConfig[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
      }
    }
  }
} catch (_) {}

module.exports = {
  apps: [
    {
      name: 'verax-media',
      script: 'src/server.mjs',
      cwd: '/home/azureuser/verax-media-service',
      exec_mode: 'fork',
      instances: 1,
      node_args: '--max-old-space-size=96',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,
      max_memory_restart: '150M',
      env: {
        NODE_ENV: 'production',
        MEDIA_PORT: '4188',
        MEDIA_HOST: '127.0.0.1',
        MEDIA_STORAGE_ROOT: '/var/lib/verax/media',
        ...envConfig,
      },
      error_file: '/home/azureuser/verax-media-service/logs/err.log',
      out_file: '/home/azureuser/verax-media-service/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
