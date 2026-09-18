# 🌐 Telegram Drive — 24x7 Cloud Share Service

This Cloudflare Worker provides **24x7 password-protected, expiring share links** for files stored in Telegram Drive.

Links hosted on this service:
- ✅ **Work 24x7** even when your computer is shut down, app is deleted, or you are offline.
- ✅ **100% Free** using Cloudflare Workers and Cloudflare D1 database (100,000 free requests/day).
- ✅ **Password-Protected** with PBKDF2 WebCrypto hashing and anti-brute-force rate limits.
- ✅ **Direct High-Speed Telegram Streaming** — files are fetched directly from Telegram's cloud.

---

## 🚀 Quick Setup & Deployment (2 Minutes)

### 1. Install dependencies
From the `cloud-share-service/` folder:
```bash
npm install
```

### 2. Login to your free Cloudflare account
```bash
npx wrangler login
```

### 3. Create your free D1 Database
Run this command to create the database on Cloudflare:
```bash
npx wrangler d1 create telegram-drive-cloud-shares
```
It will output a `database_id` (e.g., `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).
Copy that ID and paste it into `wrangler.jsonc` under `database_id`.

### 4. Apply database migration
```bash
npx wrangler d1 migrations apply telegram-drive-cloud-shares --remote
```

### 5. Deploy to Cloudflare
```bash
npx wrangler deploy
```

Once deployed, Wrangler will give you your public worker URL, for example:
```
https://telegram-drive-cloud-share.<your-account-subdomain>.workers.dev
```

### 6. Connect to Telegram Drive App
1. Open **Telegram Drive** on your PC.
2. Go to **Settings ➔ Sharing Tab**.
3. In **"🌐 24x7 Cloud Share Worker URL"**, paste your Worker URL (e.g. `https://telegram-drive-cloud-share.your-subdomain.workers.dev`).
4. Click **Save**.

That's it! Now whenever you share a file, select **"🌐 24x7 Cloud Share Link"** to get a link that works anytime, anywhere!
