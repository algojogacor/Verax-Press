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
        MEDIA_HMAC_SECRET: 'vx_media_prod_sec_2026_d3f9e2a1b7c8e4f501a2b3c4d5e6f7a8',
      },
      error_file: '/home/azureuser/verax-media-service/logs/err.log',
      out_file: '/home/azureuser/verax-media-service/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
