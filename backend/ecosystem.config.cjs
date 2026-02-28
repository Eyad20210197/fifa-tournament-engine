module.exports = {
  apps: [
    {
      name: "my-backend",
      script: "./src/server.js",
      cwd: "/root/Ramadan/backend",

      env: {
        NODE_ENV: "production",

        JWT_SECRET: "9f3b7e2c4a8d1f6b0c9e5a2d7f1b3c8e6a4d9c2b7f0e1a5c8d3b6e9f2a4c7d1",

        FRONTEND_URL: "https://fifa-ramadan-tournament-2026.vercel.app",

        ALLOWED_ORIGINS:
          "https://fifa-ramadan-tournament-2026.vercel.app,http://localhost:5173"
      }
    }
  ]
}
