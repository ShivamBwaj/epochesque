# Deploying Epochesque to Netlify (leaving Vercel)

Vercel's `vercel.app` domain is blocked on the college wifi. Netlify (`netlify.app`) is not — so we're moving hosting there. **Nothing in the app code changes**: the database, auth, and file storage all live in Supabase, not on Vercel. Only the server that renders pages and runs Server Actions moves.

## Why this is safe

- The site is a standard Next.js App Router app — Netlify's official Next.js runtime supports App Router, Server Actions, middleware, and ISR.
- All file uploads (decks, photos, gallery) already go **browser → Supabase Storage directly** (that was the Vercel 4.5MB workaround) — they never pass through the host, so Netlify's function body limits don't matter.
- The only "big" server-action body is the CSV team import, which is plain text (a few KB).

## One-time setup (~5 minutes)

1. **Commit & push the repo** (Netlify deploys from GitHub):
   ```
   git add -A
   git commit -m "v8.2: roll spin rework + netlify config"
   git push origin master
   ```
2. Go to **https://app.netlify.com** → sign in (GitHub login works) → **Add new site → Import an existing project** → pick **ShivamBwaj/epochesque**.
3. Build settings are auto-read from `netlify.toml` (already in the repo) — don't change them.
4. **Environment variables** (Site configuration → Environment variables) — add for Production **and** Preview:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | from `.env.local` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from `.env.local` |
   | `SUPABASE_SERVICE_ROLE_KEY` | from `.env.local` |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-site>.netlify.app` |

5. **Deploy**. First build takes ~2–3 min. You get `https://<something>.netlify.app`.
6. (Optional) Change the site name in Site configuration → the URL becomes `https://epochesque.netlify.app`.
7. (Optional) Test the whole flow once on the Netlify URL: login → roll stage → upload a deck → download it from admin.

## Supabase side (one small thing)

Supabase Auth redirect URLs are email-link based and this app uses password login only, so nothing to change there. If you ever add a custom domain, add it to `NEXT_PUBLIC_SITE_URL` and redeploy.

## Keeping both (transition period)

The Vercel deploy stays alive until you delete it — nothing breaks by leaving it. When the Netlify URL is confirmed working on college wifi:
1. Share the Netlify URL with participants.
2. Delete the Vercel project (or just stop mentioning the old URL).

## Gotchas

- **Vercel is still the git remote's auto-deploy** — pushing to GitHub will keep updating the Vercel site too. Harmless. To stop it: Vercel dashboard → Project → Settings → Git → Disconnect.
- Netlify free tier includes 100GB bandwidth/month and 300 build minutes — plenty for a college event.
- If a build fails on Netlify, check the deploy log for the env vars step (missing `SUPABASE_SERVICE_ROLE_KEY` is the usual suspect).
