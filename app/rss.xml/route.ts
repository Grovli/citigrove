import { SITE_URL, fetchBlogIndex } from "@/lib/site";

/**
 * /rss.xml — a real syndication feed for the CitiGrove Journal so the blog can
 * be submitted to feed aggregators, Google/Bing, and AI ingestion endpoints.
 * Emitted as a static file by the export.
 */
export const dynamic = "force-static";

function xmlEscape(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const items = await fetchBlogIndex();
  const updated = items[0]?.published_at
    ? new Date(items[0].published_at).toUTCString()
    : new Date().toUTCString();

  const entries = items
    .map((p) => {
      const url = `${SITE_URL}/blog/${p.slug}`;
      const pub = p.published_at
        ? new Date(p.published_at).toUTCString()
        : updated;
      const cats = (p.tags || [])
        .map((t) => `<category>${xmlEscape(t)}</category>`)
        .join("");
      return `    <item>
      <title>${xmlEscape(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pub}</pubDate>
      <description>${xmlEscape(p.summary)}</description>
      ${cats}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>The CitiGrove Journal</title>
    <link>${SITE_URL}/blog</link>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Essays on food planning, gardening, and eating well in 2026 — the thinking behind CitiGrove and the Grovli food planning app.</description>
    <language>en-us</language>
    <lastBuildDate>${updated}</lastBuildDate>
${entries}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
