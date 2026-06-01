# Lexalyze

Lexalyze is a Next.js app configured for Cloudflare deployment with the OpenNext Cloudflare adapter.

## Local Development

```bash
npm run dev
```

Open `http://localhost:3000`.

## Cloudflare Production

This app is not a static export. It uses Next.js API routes for auth, analysis, uploads, history, sharing, teams, and account controls. Deploy it with Cloudflare's full-stack Next.js path through OpenNext/Workers.

Cloudflare build/deploy commands:

```bash
npm run cloudflare:build
npm run cloudflare:preview
npm run cloudflare:deploy
```

The short aliases `npm run preview` and `npm run deploy` now point to Cloudflare too.

Cloudflare Workers Build settings:

```text
Build command: npm run cloudflare:build
Production deploy command: npm run cloudflare:deploy
Node.js version: 20+
```

Required production environment variables:

```text
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GROQ_API_KEY
GOOGLE_GENERATIVE_AI_API_KEY
RESEND_API_KEY
```

Optional aliases supported by the app:

```text
NEXT_PUBLIC_CLOUDFLARE_URL
GEMINI_API_KEY
GOOGLE_API_KEY
```

Set `NEXT_PUBLIC_SITE_URL` to the final Cloudflare production URL or custom domain. Also add that same URL to Supabase Auth redirect URLs and Google OAuth authorized origins after the Cloudflare domain is live.
