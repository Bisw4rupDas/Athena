# Deploy COLOSSEUM

This app needs a **Node.js backend** (auth, AI, database). **GitHub Pages alone cannot run the API** — use it only for the frontend UI, with the API on Vercel.

---

## Option A — Vercel (recommended, full app)

One URL serves both the UI and API.

### Steps

1. Sign in at [vercel.com](https://vercel.com) with GitHub.
2. **Add New Project** → import **Bisw4rupDas/Athena**.
3. Framework: **Other** (Vercel reads `vercel.json` automatically).
4. **Environment variables** (Settings → Environment Variables):

   | Name | Value |
   |------|--------|
   | `GROQ_API_KEY` | Your Groq API key |
   | `YOUTUBE_API_KEY` | YouTube Data API v3 key |
   | `SESSION_SECRET` | Long random string |
   | `NODE_ENV` | `production` |

5. Deploy. Your live URL will look like `https://athena-xxxx.vercel.app`.

### Notes

- Database and uploads use `/tmp` on Vercel (resets on cold starts; fine for demos).
- Battle plan generation can take 1–3 minutes. Hobby plan may hit timeouts; Pro allows longer runs (`maxDuration` is set to 300s in `vercel.json`).
- After deploy, open the Vercel URL and register a new account.

---

## Option B — GitHub Pages (UI) + Vercel (API)

Use this if you want the site at `https://bisw4rupdas.github.io/Athena/`.

### 1. Deploy API on Vercel first (Option A)

Copy your Vercel URL, e.g. `https://athena-xxxx.vercel.app` (no trailing slash).

### 2. Configure Vercel CORS

In Vercel → Project → Settings → Environment Variables, add:

| Name | Value |
|------|--------|
| `FRONTEND_URL` | `https://bisw4rupdas.github.io` |
| `CORS_ORIGINS` | `https://bisw4rupdas.github.io` |

Redeploy after adding these.

### 3. Enable GitHub Pages

1. Repo **Settings** → **Pages** → Source: **GitHub Actions**.
2. **Settings** → **Secrets and variables** → **Actions** → New secret:
   - Name: `API_BASE_URL`
   - Value: your Vercel URL (e.g. `https://athena-xxxx.vercel.app`)
3. Push to `main` — workflow `.github/workflows/deploy-pages.yml` deploys `public/`.

Live UI: `https://bisw4rupdas.github.io/Athena/`

---

## Local development

```bash
npm install
cp .env.example .env
# Edit .env with your API keys
npm start
```

Open `http://localhost:3000`.

---

## Why not Render / GitHub Pages only?

- **Render free tier** may be unavailable in some regions.
- **GitHub Pages** hosts static files only — no Node.js, no sessions, no AI routes.
