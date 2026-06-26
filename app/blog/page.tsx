import type { Metadata } from "next";
import Link from "next/link";
import { StickyTryGrovli } from "@/components/StickyTryGrovli";
import { SITE_URL, fetchBlogIndex, formatDate, ldJson } from "@/lib/site";

/**
 * /blog — index of CitiGrove Journal essays.
 *
 * Statically generated at build (output: "export") from document-api's public
 * KB. Re-seed the KB + rebuild to surface new posts. Renders crawlable HTML so
 * search + AI engines index the whole journal from one entry point.
 */

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "The Journal — Food Planning, Gardening & Eating Well | CitiGrove",
  description:
    "Essays on food planning, gardening, hydroponics, grocery costs, and eating well in 2026 — the thinking behind CitiGrove and the Grovli food planning app.",
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    title: "The CitiGrove Journal",
    description:
      "Essays on food planning, gardening, and eating well — the thinking behind CitiGrove and Grovli.",
    url: `${SITE_URL}/blog`,
    type: "website",
    siteName: "CitiGrove",
  },
};

export default async function BlogIndexPage() {
  const items = await fetchBlogIndex();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "The CitiGrove Journal",
    description:
      "Essays on food planning, gardening, and eating well in 2026.",
    url: `${SITE_URL}/blog`,
    publisher: { "@type": "Organization", name: "CitiGrove", url: SITE_URL },
    blogPost: items.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      description: p.summary,
      datePublished: p.published_at,
      url: `${SITE_URL}/blog/${p.slug}`,
      keywords: (p.tags || []).join(", "),
    })),
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
            href="/"
            className="text-[12px] tracking-[0.18em] uppercase text-[#577260] font-semibold"
          >
            ← Back home
          </Link>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="max-w-[1100px] mx-auto px-8 pt-20 pb-12">
        <div className="text-[11px] tracking-[0.22em] uppercase text-[#577260] font-semibold mb-5">
          The Journal · Food Planning
        </div>
        <h1
          className="text-[clamp(2.5rem,5vw,4.5rem)] leading-[1.05] tracking-[-0.02em]"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          Notes on the food we choose,
          <br />
          and how we plan to eat it.
        </h1>
        <p className="max-w-[640px] text-[17px] text-[#211F1A]/70 leading-[1.65] mt-6">
          Food planning is bigger than meal planning — it&apos;s how you grow,
          buy, stock, and cook. These are essays on all of it: gardening and
          hydroponics, grocery costs, seasonal eating, and the everyday habits
          that make eating well feel easy. The thinking behind{" "}
          <a
            href="https://grovli.citigrove.com/?utm_source=citigrove_blog&utm_medium=journal_intro&utm_campaign=blog_index"
            className="text-[#577260] underline underline-offset-2"
          >
            Grovli
          </a>
          , our food planning app.
        </p>
      </section>

      {/* ── Post list ──────────────────────────────────────────────── */}
      <section className="max-w-[1100px] mx-auto px-8 pb-32">
        {items.length === 0 ? (
          <div className="border-t border-[#211F1A]/[0.08] pt-12 text-[15px] text-[#211F1A]/60">
            We&apos;re writing — posts are coming soon. Subscribe from any essay
            to be the first to hear when the journal opens.
          </div>
        ) : (
          <ul className="border-t border-[#211F1A]/[0.08]">
            {items.map((post) => (
              <li
                key={post.slug}
                className="border-b border-[#211F1A]/[0.08] py-10"
              >
                <Link href={`/blog/${post.slug}`} className="group block">
                  <div className="text-[11px] tracking-[0.18em] uppercase text-[#577260] font-semibold mb-3">
                    {formatDate(post.published_at)}
                    {post.tags && post.tags.length > 0 && (
                      <> {" · "}{post.tags.slice(0, 3).join(" · ")}</>
                    )}
                  </div>
                  <h2
                    className="text-[clamp(1.5rem,2.5vw,2.25rem)] leading-[1.15] tracking-[-0.015em] group-hover:text-[#577260] transition-colors"
                    style={{ fontFamily: "var(--font-playfair), serif" }}
                  >
                    {post.title}
                  </h2>
                  <p className="text-[16px] text-[#211F1A]/70 leading-[1.65] mt-3 max-w-[760px]">
                    {post.summary}
                  </p>
                  <span className="inline-block mt-4 text-[12px] tracking-[0.18em] uppercase text-[#577260] font-semibold">
                    Read essay →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <StickyTryGrovli campaign="blog_index" />
    </main>
  );
}
