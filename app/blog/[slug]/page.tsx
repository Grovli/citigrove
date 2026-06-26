import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { StickyTryGrovli } from "@/components/StickyTryGrovli";
import { InlineSubscribe } from "@/components/InlineSubscribe";
import { GrovliCTA } from "@/components/GrovliCTA";
import { RelatedPosts } from "@/components/RelatedPosts";
import { renderPostBody } from "@/lib/markdown";
import {
  SITE_URL,
  fetchPost,
  fetchAllSlugs,
  fetchRelatedPosts,
  formatDate,
  readingMinutes,
  ldJson,
} from "@/lib/site";

/**
 * /blog/[slug] — an individual CitiGrove Journal essay.
 *
 * Statically generated at build (output: "export") from document-api, so each
 * post ships as crawlable HTML. The body is real Markdown — headings, lists,
 * and links render semantically — with two in-content CTA markers:
 *   {{SUBSCRIBE}}   → the email-capture form (kicks off the blog's email
 *                     mirror in email-api)
 *   {{TRY_GROVLI}}  → the Grovli food-planning CTA (funnel to the app)
 * Both carry UTM/source tags so blog → app/email conversion is attributable.
 */

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await fetchAllSlugs();
  // output: export requires a non-empty param set. Before the KB is seeded the
  // list is empty — emit a single placeholder so the build still succeeds.
  // Once posts exist, only real slugs are generated (placeholder never built).
  if (slugs.length === 0) return [{ slug: "coming-soon" }];
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post)
    return { title: "The Journal — CitiGrove", robots: { index: false } };
  const url = `${SITE_URL}/blog/${post.slug}`;
  // Per-post social image: when the doc carries a hero, use it for OG/Twitter,
  // overriding the site-wide /hero-bg.jpg fallback (set in app/layout.tsx).
  // When absent, we omit `images` entirely so the layout fallback is inherited
  // unchanged — existing posts keep their current OG card.
  const hero = post.hero_image_url?.trim();
  const ogImages = hero
    ? [{ url: hero, alt: post.title }]
    : undefined;
  return {
    title: `${post.title} — CitiGrove Journal`,
    description: post.summary,
    keywords: post.tags,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.summary,
      url,
      type: "article",
      siteName: "CitiGrove",
      publishedTime: post.published_at,
      tags: post.tags,
      ...(ogImages ? { images: ogImages } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.summary,
      ...(hero ? { images: [hero] } : {}),
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await fetchPost(slug);

  // Graceful state for an unseeded/flaky KB — never hard-crash the export.
  if (!post) {
    return (
      <main className="min-h-screen bg-[#F4F2EA] text-[#211F1A]">
        <header className="border-b border-[#211F1A]/[0.08]">
          <div className="max-w-[1100px] mx-auto px-8 py-8 flex items-center justify-between">
            <Link href="/" className="text-[20px] tracking-[-0.01em]" style={{ fontFamily: "var(--font-playfair), serif" }}>
              Citi<span style={{ color: "#577260" }}>Grove</span>
            </Link>
            <Link href="/blog" className="text-[12px] tracking-[0.18em] uppercase text-[#577260] font-semibold">
              ← All essays
            </Link>
          </div>
        </header>
        <article className="max-w-[760px] mx-auto px-8 pt-28 pb-32 text-center">
          <h1 className="text-[clamp(2rem,4vw,3rem)] leading-[1.1]" style={{ fontFamily: "var(--font-playfair), serif" }}>
            This essay is publishing soon.
          </h1>
          <p className="text-[17px] text-[#211F1A]/70 leading-[1.65] mt-5">
            The Journal is being seeded. In the meantime, start food planning with Grovli.
          </p>
          <div className="mt-8">
            <GrovliCTA campaign="blog_coming_soon" />
          </div>
        </article>
        <StickyTryGrovli campaign="blog_coming_soon" />
      </main>
    );
  }

  const { segments, hasSubscribe } = renderPostBody(post.body ?? "");
  const url = `${SITE_URL}/blog/${post.slug}`;
  const minutes = readingMinutes(post.body);
  // Optional per-post hero (public GCS image, reused from Grovli meal images).
  const hero = post.hero_image_url?.trim();
  // Up to 3 sibling essays for the "You may also like" block — tag-matched,
  // then newest-first. Resolved at build (output: "export"); [] on KB outage.
  const related = await fetchRelatedPosts(post.slug, post.tags, 3);

  // BlogPosting structured data — lets Google + AI engines parse the essay as
  // an article (author, dates, keywords, publisher).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.summary,
    datePublished: post.published_at,
    dateModified: post.published_at,
    keywords: (post.tags || []).join(", "),
    articleSection: "Food planning",
    inLanguage: "en-US",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: { "@type": "Organization", name: "The CitiGrove Journal", url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: "CitiGrove",
      url: SITE_URL,
    },
  };

  return (
    <main className="min-h-screen bg-[#F4F2EA] text-[#211F1A]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(jsonLd) }}
      />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="border-b border-[#211F1A]/[0.08]">
        <div className="max-w-[1100px] mx-auto px-8 py-8 flex items-center justify-between">
          <Link
            href="/"
            className="text-[20px] tracking-[-0.01em]"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            Citi<span style={{ color: "#577260" }}>Grove</span>
          </Link>
          <Link
            href="/blog"
            className="text-[12px] tracking-[0.18em] uppercase text-[#577260] font-semibold"
          >
            ← All essays
          </Link>
        </div>
      </header>

      {/* ── Article ────────────────────────────────────────────────── */}
      {/* ~680px column: hero, title, and CTA bands sit a touch wider than the
          ~34em (≈66ch) prose measure (capped in .prose-citigrove), giving a
          tasteful editorial inset rather than one flush full-width slab. */}
      <article className="max-w-[680px] mx-auto px-8 pt-20 pb-32">
        {/* Optional hero — only renders when the doc carries hero_image_url, so
            posts without one degrade cleanly (title leads instead). Full-width
            within the article column, locked to 16:9, rounded to match the
            site's soft visual language, and lazy-loaded (images.unoptimized →
            plain <img>, served pre-optimised from GCS). */}
        {hero && (
          <Image
            src={hero}
            alt={post.title}
            width={1200}
            height={675}
            sizes="(max-width: 680px) 100vw, 680px"
            loading="lazy"
            className="w-full h-auto rounded-2xl mb-10 object-cover"
            style={{ aspectRatio: "16 / 9" }}
          />
        )}
        <div className="text-[11px] tracking-[0.22em] uppercase text-[#577260] font-semibold mb-5">
          {formatDate(post.published_at)}
          <span className="text-[#211F1A]/30"> · {minutes} min read</span>
          {post.tags && post.tags.length > 0 && (
            <> {" · "}{post.tags.slice(0, 4).join(" · ")}</>
          )}
        </div>
        <h1
          className="text-[clamp(2.25rem,4vw,3.5rem)] leading-[1.1] tracking-[-0.02em]"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          {post.title}
        </h1>
        {post.summary && (
          <p className="text-[19px] text-[#211F1A]/70 leading-[1.6] mt-6 italic">
            {post.summary}
          </p>
        )}
        <div className="text-[13px] text-[#211F1A]/45 mt-6 pb-2">
          By <span className="text-[#211F1A]/70">The CitiGrove Journal</span>
        </div>

        {/* Body — Markdown chunks interleaved with live CTA components. */}
        <div className="mt-10">
          {segments.map((seg, i) => {
            if (seg.kind === "subscribe") {
              return (
                <div className="my-14" key={`seg-${i}`}>
                  <InlineSubscribe slug={post.slug} />
                </div>
              );
            }
            if (seg.kind === "cta") {
              // In-content {{TRY_GROVLI}} markers are intentionally NOT rendered.
              // Every essay gets exactly ONE Grovli CTA — the closing funnel CTA
              // below (after related posts). Rendering the marker here too caused
              // the block to appear 2-3x per post (body embeds it 1-2x + the
              // closing one). {{SUBSCRIBE}} is unaffected (separate segment).
              return null;
            }
            return (
              <div
                key={`seg-${i}`}
                className="prose-citigrove"
                dangerouslySetInnerHTML={{ __html: seg.html }}
              />
            );
          })}

          {/* Fallback: posts without an inline {{SUBSCRIBE}} marker still get
              one capture block before the closing CTA. */}
          {!hasSubscribe && (
            <div className="my-14">
              <InlineSubscribe slug={post.slug} />
            </div>
          )}
        </div>

        {/* "You may also like" — sibling essays before the funnel hand-off,
            so a finished reader has a next read inside the journal. Renders
            nothing when there are no siblings. */}
        <RelatedPosts posts={related} />

        {/* Closing funnel CTA on every essay. */}
        <GrovliCTA campaign={post.slug} />

        {/* Quiet cross-link back to the journal. */}
        <div className="mt-12 pt-8 border-t border-[#211F1A]/[0.08]">
          <Link
            href="/blog"
            className="text-[12px] tracking-[0.18em] uppercase text-[#577260] font-semibold"
          >
            ← Read more from the Journal
          </Link>
        </div>
      </article>

      <StickyTryGrovli campaign={`blog_post_${post.slug}`} />
    </main>
  );
}
