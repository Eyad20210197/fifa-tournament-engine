module.exports = {
  apps: [
    {
      name: 'ramadan-backend',
      script: './src/server.js',
      cwd: '/root/Ramadan/backend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '700M',
      restart_delay: 2000,
      listen_timeout: 10000,
      kill_timeout: 10000,
      env: {
        NODE_ENV: 'production',
        PORT: '4000',
        BASE_URL: 'https://fifaleague.duckdns.org',

        DATABASE_URL:
          'postgresql://neondb_owner:npg_udMHrKm30YaF@ep-morning-tooth-aggimjcn-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',

        JWT_SECRET: '9f3b7e2c4a8d1f6b0c9e5a2d7f1b3c8e6a4d9c2b7f0e1a5c8d3b6e9f2a4c7d1',
        JWT_EXPIRES_IN: '12h',

        CORS_ALLOW_ALL_ORIGINS: 'true',

        ABLY_API_KEY: 'kEpfbw.67-8Eg:MFTtmDcXSF5In7pJXlhZJFZR5uLbScW6JmIEtQS5JeE',
        ABLY_TOKEN_TTL_MS: '3600000',

        CLOUDINARY_CLOUD_NAME: 'dtdallm4i',
        CLOUDINARY_API_KEY: '561193799796589',
        CLOUDINARY_API_SECRET: 'dCvnAUqTioBvscq2BmsldcEq5fM',
        CLOUDINARY_FOLDER_VIDEO: 'opening',
        CLOUDINARY_FOLDER_SPONSOR: 'sponsors',
        CLOUDINARY_FOLDER_BRANDING: 'branding',
      },
    },
  ],
}
