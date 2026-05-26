import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StickyTryGrovli } from "@/components/StickyTryGrovli";
import { InlineSubscribe } from "@/components/InlineSubscribe";

/**
 * /blog/[slug] — individual CitiGrove essay.
 *
 * Server component, fetches from document-api by slug. The InlineSubscribe
 * block sits mid-article (after the first ~third of the body) and the
 * StickyTryGrovli pill sits bottom-right on every post. Both routes share
 * Branch-tagged UTMs back into the funnel attribution stream.
 *
 * Body rendering: document-api returns the parsed body as either
 * markdown or text. We render markdown-ish prose with a minimal
 * paragraph splitter — full Markdown rendering belongs to a
 * dedicated component if/when essays start carrying images, lists,
 * code blocks. The current shape (single-column essay) is the most
 * common.
 */

const DOCUMENT_API_URL =
  process.env.DOCUMENT_API_URL ||
  process.env.NEXT_PUBLIC_DOCUMENT_API_URL ||
  "https://api.grovli.citigrove.com";

interface BlogPost {
  title: string;
  summary: string;
  slug: string;
  category: string;
  published_at: string;
  body?: string;
  body_format?: "markdown" | "text" | string;
  tags?: string[];
}

export const revalidate = 300;

async function fetchPost(slug: string): Promise<BlogPost | null> {
  try {
    const res = await fetch(`${DOCUMENT_API_URL}/public/documents/${slug}`, {
      next: { revalidate: 300 },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as BlogPost;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) {
    return { title: "Not found — CitiGrove" };
  }
  return {
    title: `${post.title} — CitiGrove`,
    description: post.summary,
    openGraph: {
      title: post.title,
      description: post.summary,
      type: "article",
      publishedTime: post.published_at,
    },
  };
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

/**
 * Split body into paragraphs and inject the inline subscribe block
 * roughly one-third of the way in. For short posts (<3 paragraphs)
 * the block lands at the end so it isn't the first thing after a
 * one-paragraph intro.
 */
function splitForInjection(paragraphs: string[]): {
  before: string[];
  after: string[];
} {
  if (paragraphs.length < 3) {
    return { before: paragraphs, after: [] };
  }
  const cut = Math.max(1, Math.floor(paragraphs.length / 3));
  return {
    before: paragraphs.slice(0, cut),
    after: paragraphs.slice(cut),
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) {
    notFound();
  }

  // Defensive: posts that slip through with the wrong category should
  // 404 rather than render. The classifier should keep this from
  // happening, but the safety check is cheap.
  if (post.category && post.category !== "blog") {
    notFound();
  }

  const paragraphs = (post.body ?? "").split(/\n{2,}/).filter(Boolean);
  const { before, after } = splitForInjection(paragraphs);

  return (
    <main className="min-h-screen bg-[#FAFAF6] text-[#1A1916]">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="border-b border-[#1A1916]/[0.08]">
        <div className="max-w-[1100px] mx-auto px-8 py-8 flex items-center justify-between">
          <Link
            href="/"
            className="text-[20px] tracking-[-0.01em]"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            CitiGrove
          </Link>
          <Link
            href="/blog"
            className="text-[12px] tracking-[0.18em] uppercase text-[#5C7A5E] font-semibold"
          >
            ← All essays
          </Link>
        </div>
      </header>

      {/* ── Article ────────────────────────────────────────────────── */}
      <article className="max-w-[760px] mx-auto px-8 pt-20 pb-32">
        <div className="text-[11px] tracking-[0.22em] uppercase text-[#5C7A5E] font-semibold mb-5">
          {formatDate(post.published_at)}
          {post.tags && post.tags.length > 0 && (
            <>
              {" · "}
              {post.tags.slice(0, 4).join(" · ")}
            </>
          )}
        </div>
        <h1
          className="text-[clamp(2.25rem,4vw,3.5rem)] leading-[1.1] tracking-[-0.02em]"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          {post.title}
        </h1>
        {post.summary && (
          <p className="text-[19px] text-[#1A1916]/70 leading-[1.6] mt-6 italic">
            {post.summary}
          </p>
        )}

        <div className="mt-12 space-y-6 text-[17px] leading-[1.75] text-[#1A1916]/90">
          {before.map((p, i) => (
            <p key={`b-${i}`}>{p}</p>
          ))}
        </div>

        {after.length > 0 && (
          <div className="my-16">
            <InlineSubscribe slug={post.slug} />
          </div>
        )}

        <div className="space-y-6 text-[17px] leading-[1.75] text-[#1A1916]/90">
          {after.map((p, i) => (
            <p key={`a-${i}`}>{p}</p>
          ))}
        </div>

        {/* When the inline block lands at the end (short post), still
            render it once after the prose. */}
        {after.length === 0 && (
          <div className="mt-16">
            <InlineSubscribe slug={post.slug} />
          </div>
        )}
      </article>

      <StickyTryGrovli campaign={`blog_post_${post.slug}`} />
    </main>
  );
}
