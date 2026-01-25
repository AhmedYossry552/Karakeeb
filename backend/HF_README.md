---
title: Karakeeb API
emoji: ♻️
colorFrom: green
colorTo: blue
sdk: docker
pinned: false
license: mit
app_port: 7860
---

# Karakeeb Recycling API

.NET 8 Backend API for the Karakeeb Recycling Platform.

## Environment Variables Required

Set these as **Secrets** in your Space settings:

- `ConnectionStrings__DefaultConnection` - PostgreSQL connection string from Neon
- `Jwt__Secret` - Your JWT secret key (32+ characters)
- `Cloudinary__CloudName` - Cloudinary cloud name (optional)
- `Cloudinary__ApiKey` - Cloudinary API key (optional)
- `Cloudinary__ApiSecret` - Cloudinary API secret (optional)
- `Stripe__SecretKey` - Stripe secret key (optional)
- `GROQ_API_KEY` - Groq API key (optional)
