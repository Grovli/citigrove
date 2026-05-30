# Publish Runbook — CitiGrove Journal + Grovli SEO

Everything in this initiative is **built and committed**. This runbook is the
"go live" checklist — the steps that need your credentials (prod Mongo, GitHub
push → CI/CD deploy, and the Google/Bing webmaster consoles).

Repos touched — **committed locally, NOT pushed**. Each is on a branch; to deploy
a repo, merge its branch into `main` and push (pushing `main` triggers CI/CD). The
`git push origin main` lines below assume you've merged.

| Repo | Branch | What changed |
|---|---|---|
| `management/citigrove` | `feat/blog-routes` | Food-planning homepage; Markdown blog + CTAs; static-export deploy fix; subscribe → Firebase Function; sitemap/robots/llms.txt/RSS/IndexNow/JSON-LD. |
| `document-api` | `feat/blog-category-public-router` | 9 blog posts in `seeds/blog/*.md`. |
| `email-api` | `sync/design-tokens-2026-05-26` | 9 `blog_*` MJML mirrors; `TemplateFamily` + `source=blog_<slug>` routing; voice → food planning. (Committed on the branch you were on — cherry-pick if you'd rather isolate it.) |
| `Grovli` | `feat/food-planning-seo` | sitemap/robots/llms.txt/JSON-LD; positioning copy → food planning. (Your `CLAUDE.md` + `.claude/` WIP was left uncommitted.) |

> Order matters: **seed the blog posts first**, then deploy citigrove (its build
> statically generates the blog pages from the seeded KB).

---

## 0. Prerequisites
- `gcloud` authenticated to project `organic-spirit-488116-e2` (for the seed step).
- Push access to the `mariosmith-eng` repos (citigrove, document-api, email-api, Grovli).
  Your PAT must span both GitHub accounts if you keep cross-account repos.
- Each repo deploys on push to `main` (citigrove via its own GitHub Action;
  document-api/email-api fire `repository_dispatch` → Grovli's per-service deploy).

---

## 1. Seed the 9 blog posts into document-api (prod MongoDB)

This loads `seeds/blog/*.md` into the `grovli_docs.documents` collection as
`category="blog"`, auto-published. Idempotent (re-running no-ops on identical content).

```bash
cd document-api
export MONGO_URI="$(gcloud secrets versions access latest \
  --secret=grovli-mongo-uri --project=organic-spirit-488116-e2)"
export APP_ENV=development            # avoids Vertex init; no AI is used in front-matter mode
python -m scripts.seed_documents seeds/blog/
```

Verify the posts are live on the public API:
```bash
curl -s "https://grovli-document-api-public-uyply7jkca-uc.a.run.app/public/categories/blog?limit=20" \
  | python3 -m json.tool
```
You should see 9 items. Also commit/push the `seeds/blog/` files so the source of
truth is in git (the seed script is the loader; the markdown is the source).

---

## 2. Deploy email-api (blog email mirrors + routing)

```bash
cd email-api
git push origin main      # CI (lint/test) → repository_dispatch → Grovli deploys grovli-email-api
```
After deploy, a subscribe with `source=blog_<slug>` fires that post's mirror.
Smoke test (uses a real address you control):
```bash
curl -s -X POST "https://grovli-email-api-uyply7jkca-uc.a.run.app/marketing/subscribe" \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","source":"blog_meal_planning_vs_food_planning"}'
```

## 3. Deploy Grovli frontend (food-planning copy + SEO)

```bash
cd Grovli
git push origin main      # Grovli per-service pipeline deploys grovli-frontend
```
Verify:
```bash
curl -s https://grovli.citigrove.com/robots.txt | head
curl -s https://grovli.citigrove.com/sitemap.xml | head
curl -s https://grovli.citigrove.com/llms.txt | head
```

## 4. Deploy citigrove.com (static export + blog + functions)

Do this **after** step 1 so the build generates the blog pages from the seeded KB.

```bash
cd management/citigrove
git push origin main      # GitHub Action: next build (static export → out/) + firebase deploy
```
The CI build uses `DOCUMENT_API_URL` (defaulted to the correct public document-api
in `.github/workflows/deploy.yml`; override with a repo secret of the same name if a
custom domain is mapped later). The `citigroveSubscribe` Function reads `EMAIL_API_URL`
from `functions/.env` (already committed).

Verify after deploy:
```bash
curl -s https://citigrove.com/sitemap.xml          # should now list all 9 /blog/<slug> URLs
curl -s https://citigrove.com/blog | grep -o "Read essay" | head
curl -s https://citigrove.com/robots.txt | tail -3
curl -s -X POST https://citigrove.com/api/subscribe \
  -H "Content-Type: application/json" -d '{"email":"you@example.com","source":"citigrove_homepage"}'
```

---

## 5. Submit to search engines + AI

### IndexNow (Bing, Yandex, Seznam, Naver) — scripted, run after citigrove deploys
```bash
cd management/citigrove
node scripts/indexnow-submit.mjs
```
(The key file ships at `https://citigrove.com/d37a328b7f30c94513cd035bec849bb0.txt`.)

### Google Search Console (manual — needs your login)
1. https://search.google.com/search-console → add property `https://citigrove.com`
   (and `https://grovli.citigrove.com` if not already verified).
2. Verify via DNS TXT or the Firebase/hosting method.
3. Sitemaps → submit `sitemap.xml` for each property.
4. Repeat for `https://grovli.citigrove.com/sitemap.xml`.

### Bing Webmaster Tools (manual — or import from GSC)
1. https://www.bing.com/webmasters → add both sites → submit each `sitemap.xml`.
   (IndexNow already pings Bing; this adds reporting + manual submission.)

### Optional discovery surfaces (already live, no action needed)
- RSS: `https://citigrove.com/rss.xml`
- llms.txt: `https://citigrove.com/llms.txt`, `https://grovli.citigrove.com/llms.txt`

---

## 6. Notes / caveats
- **Onboarding video format.** The embedded explainer is the app's `.mov`
  (`…/onboarding/how-to-use-explainer.mov`). Safari plays it natively; some
  Chrome/Firefox builds won't play a QuickTime container. For universal
  playback, re-encode an MP4/H.264 + WebM and swap `GROVLI_VIDEO_URL` in
  `app/page.tsx`. A "Watch the walkthrough →" fallback link is already in place.
- **Email subjects.** Each mirror's subject is produced by the Gemini
  personalizer, anchored to curated reference lines added per family in
  `email-api/app/services/personalizer.py` (`_DEFAULT_SUBJECT_REFS`). On a Vertex
  outage it falls back to the curated line. No DB rows needed — the `.mjml` file
  + the family enum are sufficient.
- **Adding a future post.** Drop a front-matter `.md` in `document-api/seeds/blog/`,
  re-run the seed, add a matching `email-api/app/templates/mjml/blog_<slug>.mjml`
  + `TemplateFamily` member + subject ref, then redeploy citigrove. The citigrove
  blog regenerates from the KB on each build.
