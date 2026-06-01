/**
 * Shared site constants + blog data access for citigrove.com.
 *
 * One module so the homepage, blog index, blog post pages, sitemap, and RSS
 * feed all agree on the canonical site URL, the Grovli funnel target, and how
 * blog content is fetched from document-api (the headless CMS).
 *
 * The site is built as a static export (output: "export") and deployed to
 * Firebase Hosting, so these fetches run at BUILD time. Re-seed document-api,
 * rebuild, and redeploy to publish new posts.
 */

/** Canonical production origin — drives canonical URLs, sitemap, OG. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://citigrove.com"
).replace(/\/$/, "");

/** Grovli — the food planning app. Primary blog → app funnel target. */
export const GROVLI_URL = "https://grovli.citigrove.com";
export const APP_STORE_URL = "https://apps.apple.com/us/app/grovli/id6760633541";
export const INSTAGRAM_URL = "https://instagram.com/grovli";

/**
 * Headless CMS base — document-api's PUBLIC Cloud Run service. Overridable via
 * env. NOTE: api.grovli.citigrove.com is grovli-backend and 404s on /public/*;
 * the blog must point at grovli-document-api-public. If a custom domain (e.g.
 * docs.grovli.citigrove.com) is mapped later, set DOCUMENT_API_URL to it.
 */
export const DOCUMENT_API_URL =
  process.env.DOCUMENT_API_URL ||
  process.env.NEXT_PUBLIC_DOCUMENT_API_URL ||
  "https://grovli-document-api-public-uyply7jkca-uc.a.run.app";

export interface BlogIndexItem {
  title: string;
  summary: string;
  slug: string;
  published_at: string;
  tags?: string[];
}

export interface BlogPost {
  title: string;
  summary: string;
  slug: string;
  category: string;
  published_at: string;
  body?: string;
  body_format?: "markdown" | "text" | "html" | string;
  tags?: string[];
  /**
   * Optional public GCS image URL (reused from Grovli's meal images). When
   * present, the post page renders it as a rounded hero above the title and
   * uses it for OG/Twitter; when absent the page is unchanged (site-wide
   * /hero-bg.jpg OG fallback).
   */
  hero_image_url?: string;
}

/** All published blog posts (index projection), newest first. Empty on error. */
export async function fetchBlogIndex(): Promise<BlogIndexItem[]> {
  try {
    const res = await fetch(
      `${DOCUMENT_API_URL}/public/categories/blog?limit=200`
    );
    if (!res.ok) return [];
    const data: { items?: BlogIndexItem[] } = await res.json();
    return data.items ?? [];
  } catch {
    // A KB outage at build time should degrade to "no posts", never fail the
    // whole static export.
    return [];
  }
}

/** One post by slug, or null if missing / not a blog post. */
export async function fetchPost(slug: string): Promise<BlogPost | null> {
  try {
    const res = await fetch(`${DOCUMENT_API_URL}/public/documents/${slug}`);
    if (!res.ok) return null;
    const post = (await res.json()) as BlogPost;
    if (post.category && post.category !== "blog") return null;
    return post;
  } catch {
    return null;
  }
}

/** Slugs of every published post — feeds generateStaticParams + sitemap. */
export async function fetchAllSlugs(): Promise<string[]> {
  const items = await fetchBlogIndex();
  return items.map((i) => i.slug).filter(Boolean);
}

/**
 * Sibling posts for the "You may also like" block on a post page.
 *
 * Ranks the rest of the journal by tag overlap with the current post (most
 * shared tags first), breaking ties — and filling any shortfall — with the
 * newest remaining posts. Returns at most `limit` items, never the current
 * post. Reuses the build-time index fetch; degrades to [] on a KB outage so
 * the static export never fails.
 */
export async function fetchRelatedPosts(
  currentSlug: string,
  tags: string[] | undefined,
  limit = 3
): Promise<BlogIndexItem[]> {
  const items = await fetchBlogIndex(); // newest-first
  const candidates = items.filter((p) => p.slug && p.slug !== currentSlug);
  const wanted = new Set((tags || []).map((t) => t.toLowerCase()));

  const overlap = (p: BlogIndexItem) =>
    (p.tags || []).reduce((n, t) => n + (wanted.has(t.toLowerCase()) ? 1 : 0), 0);

  // Stable sort: tag-overlap desc, then preserve index order (newest-first)
  // for ties and zero-overlap posts — so absent tags ⇒ pure newest-first.
  const ranked = candidates
    .map((p, i) => ({ p, i, score: overlap(p) }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((x) => x.p);

  return ranked.slice(0, limit);
}

/** Human date, e.g. "May 29, 2026". */
export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

/** Rough reading time in minutes from a Markdown body (200 wpm). */
export function readingMinutes(body: string | undefined): number {
  const words = (body || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Serialize JSON-LD for a <script> tag, escaping "<" so a stray "</script>"
 *  in CMS content can't break out of the tag. */
export function ldJson(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

/**
 * Normalize a document-api timestamp to a valid UTC Date. The public API
 * returns naive microsecond strings like "2026-05-30T03:37:50.418000" (6-digit
 * fractional seconds, no timezone), which are invalid in a sitemap <lastmod>.
 * Truncate to milliseconds and pin to UTC.
 */
export function toUTCDate(s: string | undefined): Date {
  let v = (s || "").trim().replace(/(\.\d{3})\d+/, "$1"); // µs → ms
  if (v && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(v)) v += "Z"; // naive → UTC
  const d = v ? new Date(v) : new Date();
  return isNaN(d.getTime()) ? new Date() : d;
}
