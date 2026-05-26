import type { Metadata } from "next";
import Link from "next/link";
import { StickyTryGrovli } from "@/components/StickyTryGrovli";

/**
 * /blog — index of CitiGrove wellness essays.
 *
 * Server component (no "use client") — SSR + ISR-friendly so search
 * engines can crawl the index cleanly and Vercel/Firebase Hosting
 * caches the response. Refetches every 5 minutes (revalidate: 300)
 * so newly-published posts surface without a rebuild.
 *
 * Backend: document-api's public router (PR #3 on
 * mariosmith-eng/document-api adds the `blog` category and the
 * citigrove.com CORS allowance). The same KB powers grovli.citigrove.com's
 * /careers, /faqs, /privacy, /terms pages.
 */

const DOCUMENT_API_URL =
  process.env.DOCUMENT_API_URL ||
  process.env.NEXT_PUBLIC_DOCUMENT_API_URL ||
  "https://api.grovli.citigrove.com";

interface BlogIndexItem {
  title: string;
  summary: string;
  slug: string;
  published_at: string;
  tags?: string[];
}

export const metadata: Metadata = {
  title: "Journal — CitiGrove",
  description:
    "Essays on food traditions, longevity research, and family eating. The wellness commentary behind CitiGrove's products.",
};

// 5-min revalidate: blog posts are not high-frequency. Refresh sooner
// via Firebase Hosting cache purge if a time-sensitive piece needs to
// surface immediately.
export const revalidate = 300;

async function fetchBlogIndex(): Promise<BlogIndexItem[]> {
  try {
    const res = await fetch(
      `${DOCUMENT_API_URL}/public/categories/blog?limit=50`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data: { items?: BlogIndexItem[] } = await res.json();
    return data.items ?? [];
  } catch {
    // Network error fetching the KB — render an empty state rather
    // than throwing. SSR errors would surface a generic 500 to
    // visitors; better to show "no posts yet" while a follow-up
    // build picks the API back up.
    return [];
  }
}

function formatDate(iso: string): string {
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

export default async function BlogIndexPage() {
  const items = await fetchBlogIndex();

  return (
    <main className="min-h-screen bg-[#FAFAF6] text-[#1A1916]">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="border-b border-[#1A1916]/[0.08]">
        <div className="max-w-[1100px] mx-auto px-8 py-8 flex items-center justify-between">
          <Link
            href="/"
            className="font-[var(--font-playfair),serif] text-[20px] tracking-[-0.01em]"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            CitiGrove
          </Link>
          <Link
            href="/"
            className="text-[12px] tracking-[0.18em] uppercase text-[#5C7A5E] font-semibold"
          >
            ← Back home
          </Link>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="max-w-[1100px] mx-auto px-8 pt-20 pb-12">
        <div
          className="text-[11px] tracking-[0.22em] uppercase text-[#5C7A5E] font-semibold mb-5"
        >
          Journal · Volume 1
        </div>
        <h1
          className="text-[clamp(2.5rem,5vw,4.5rem)] leading-[1.05] tracking-[-0.02em]"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          Notes on the food we choose,
          <br />
          and why it shapes us.
        </h1>
        <p className="max-w-[640px] text-[17px] text-[#1A1916]/70 leading-[1.65] mt-6">
          Essays from CitiGrove on food traditions, longevity research, and the
          rituals of family eating. The wellness thinking that informs
          Grovli&apos;s meal plans, our sparkling teas, and the skincare we
          make.
        </p>
      </section>

      {/* ── Post list ──────────────────────────────────────────────── */}
      <section className="max-w-[1100px] mx-auto px-8 pb-32">
        {items.length === 0 ? (
          <div className="border-t border-[#1A1916]/[0.08] pt-12 text-[15px] text-[#1A1916]/60">
            We&apos;re writing — posts are coming soon. Subscribe below to be
            the first to hear when the journal opens.
          </div>
        ) : (
          <ul className="border-t border-[#1A1916]/[0.08]">
            {items.map((post) => (
              <li
                key={post.slug}
                className="border-b border-[#1A1916]/[0.08] py-10"
              >
                <Link href={`/blog/${post.slug}`} className="group block">
                  <div className="text-[11px] tracking-[0.18em] uppercase text-[#5C7A5E] font-semibold mb-3">
                    {formatDate(post.published_at)}
                    {post.tags && post.tags.length > 0 && (
                      <>
                        {" · "}
                        {post.tags.slice(0, 3).join(" · ")}
                      </>
                    )}
                  </div>
                  <h2
                    className="text-[clamp(1.5rem,2.5vw,2.25rem)] leading-[1.15] tracking-[-0.015em] group-hover:text-[#5C7A5E] transition-colors"
                    style={{ fontFamily: "var(--font-playfair), serif" }}
                  >
                    {post.title}
                  </h2>
                  <p className="text-[16px] text-[#1A1916]/70 leading-[1.65] mt-3 max-w-[760px]">
                    {post.summary}
                  </p>
                  <span className="inline-block mt-4 text-[12px] tracking-[0.18em] uppercase text-[#5C7A5E] font-semibold">
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
