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
        CLOUDINARY_CLOUD_NAME: "dtdallm4i",
        CLOUDINARY_API_KEY: "561193799796589",
        CLOUDINARY_API_SECRET: "dCvnAUqTioBvscq2BmsldcEq5fM",
        CLOUDINARY_FOLDER_VIDEO: "tournament/opening",
        CLOUDINARY_FOLDER_SPONSOR: "tournament/sponsors",
        CLOUDINARY_FOLDER_BRANDING: "tournament/branding",

        ALLOWED_ORIGINS:
          "https://fifa-ramadan-tournament-2026.vercel.app,http://localhost:5173"
      }
    }
  ]
}
