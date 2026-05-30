import type { MetadataRoute } from "next";
import { SITE_URL, fetchBlogIndex, toUTCDate } from "@/lib/site";

/**
 * /sitemap.xml — emitted as a static file by the export. Lists the homepage,
 * the journal index, and every published post (with its publish date as
 * lastModified) so search + AI crawlers discover the whole journal.
 */
export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const items = await fetchBlogIndex();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
  ];

  const posts: MetadataRoute.Sitemap = items.map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: toUTCDate(p.published_at),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...posts];
}
