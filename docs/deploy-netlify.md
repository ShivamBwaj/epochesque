# Deploying Epochesque to Netlify — DONE ✅

**Production URL: https://epochesque.netlify.app**
**Admin: https://app.netlify.com/projects/epochesque**

Vercel's `vercel.app` domain is blocked on the college wifi. Netlify (`netlify.app`) is not. The site is now deployed and live — this doc records what was done and how to work with it.

## What was done (already complete)

- Site `epochesque` created on Netlify (clean URL: `epochesque.netlify.app`)
- Env vars set for **production + preview**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`
- `src/proxy.ts` renamed to `src/middleware.ts` — Next 16's new "proxy" convention can't be bundled by Netlify's edge plugin; the old "middleware" name works fine (just logs a deprecation warning)
- Deployed via `netlify deploy --prod` — verified live: landing, speakers, OC (Aman's card), login, leaderboard lock, auth redirects (307 to /login)

## Day-to-day commands

From the repo root (Netlify CLI is installed globally, already logged in):

```
netlify deploy --prod        # deploy current working directory to production
netlify env:list --json      # see env vars
netlify status               # who am I / which site is linked
```

## Optional: connect GitHub for auto-deploy on push

Currently deploys are manual (CLI). To make every `git push` auto-deploy:
1. https://app.netlify.com/projects/epochesque/configuration → **Build & deploy → Link repository** → pick `ShivamBwaj/epochesque`
2. Build command `npm run build`, publish `.next` (auto-read from `netlify.toml`)
3. Then **stop the Vercel auto-deploys** if you don't want double hosting: Vercel dashboard → Project → Settings → Git → Disconnect

## Notes

- Uploads (decks, photos, gallery) go **browser → Supabase directly** — Netlify's function body limits never apply
- Free tier: 100GB bandwidth/month, 300 build minutes — plenty for the event
- The Vercel deploy still exists at epochesque.vercel.app until you delete it; the two share the same database, so **give participants the netlify.app URL only** to avoid confusion
