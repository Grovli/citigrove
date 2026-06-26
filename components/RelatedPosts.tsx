import Link from "next/link";
import { formatDate, type BlogIndexItem } from "@/lib/site";

/**
 * RelatedPosts — "You may also like" block on a /blog/[slug] essay.
 *
 * Surfaces up to three sibling essays (tag-matched, then newest-first; see
 * fetchRelatedPosts in lib/site.ts) just before the closing Grovli CTA, so a
 * reader who finished one essay has an obvious next read inside the journal —
 * keeping them on-site one beat longer before the funnel hand-off.
 *
 * Server component (no hooks) so it renders inside the statically-exported
 * post pages without a client boundary. Renders nothing when there are no
 * siblings (e.g. a single-post journal), so the layout degrades cleanly.
 */

interface RelatedPostsProps {
  posts: BlogIndexItem[];
}

export function RelatedPosts({ posts }: RelatedPostsProps) {
  if (!posts || posts.length === 0) return null;

  return (
    <section
      aria-label="More from the Journal"
      className="mt-16 pt-10 border-t border-[#3B362D]/[0.08]"
    >
      <div className="text-[11px] tracking-[0.22em] uppercase text-[#8A4A28] font-semibold mb-7">
        You may also like
      </div>
      <ul className="grid gap-8 sm:grid-cols-3">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link href={`/blog/${post.slug}`} className="group block">
              {post.tags && post.tags.length > 0 ? (
                <div className="text-[10px] tracking-[0.18em] uppercase text-[#8A4A28]/80 font-semibold mb-2">
                  {post.tags[0]}
                </div>
              ) : (
                <div className="text-[10px] tracking-[0.18em] uppercase text-[#3B362D]/40 font-semibold mb-2">
                  {formatDate(post.published_at)}
                </div>
              )}
              <h3
                className="text-[clamp(1.15rem,1.6vw,1.3rem)] leading-[1.25] tracking-[-0.01em] text-[#3B362D] group-hover:text-[#8A4A28] transition-colors"
                style={{ fontFamily: "var(--font-newsreader), Georgia, serif" }}
              >
                {post.title}
              </h3>
              {post.summary && (
                <p className="text-[14px] text-[#3B362D]/65 leading-[1.55] mt-2 line-clamp-3">
                  {post.summary}
                </p>
              )}
              <span className="inline-block mt-3 text-[11px] tracking-[0.16em] uppercase text-[#8A4A28] font-semibold">
                Read essay →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
