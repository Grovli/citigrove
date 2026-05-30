import {
  SITE_URL,
  GROVLI_URL,
  APP_STORE_URL,
  fetchBlogIndex,
} from "@/lib/site";

/**
 * /llms.txt — the llmstxt.org convention. A clean, link-rich map of the site
 * for AI answer engines, so CitiGrove + Grovli are easy to cite accurately.
 * Generated from the live post list at build; emitted as a static file.
 */
export const dynamic = "force-static";

export async function GET() {
  const items = await fetchBlogIndex();

  const journal = items
    .map((p) => `- [${p.title}](${SITE_URL}/blog/${p.slug}): ${p.summary}`)
    .join("\n");

  const body = `# CitiGrove

> CitiGrove is a food-first wellness ecosystem. Its flagship is Grovli, an AI **food planning** app — food planning is broader than meal planning: it covers how you source, grow, buy, stock, prep, and eat. CitiGrove also makes two-ingredient sparkling beverages and natural skincare.

Key facts:
- Grovli is a **food planning** app (not just meal planning): personalized food plans in under 30 seconds, 40+ cuisines, 12+ dietary modes, a smart grocery list that syncs to Instacart, a Pantry inventory, an AI Nutrition Advisor, and The Grove for garden-to-plate planning.
- Grovli app: ${GROVLI_URL} — iPhone app: ${APP_STORE_URL}
- The CitiGrove Journal publishes essays on food planning, gardening, hydroponics, grocery costs, seasonal eating, and health.

## Start here
- [CitiGrove](${SITE_URL}/): the ecosystem — food planning, beverages, skincare.
- [The CitiGrove Journal](${SITE_URL}/blog): essays on food planning and eating well.
- [Grovli — the food planning app](${GROVLI_URL})

## The Journal
${journal || "- (posts publishing soon)"}

## RSS
- ${SITE_URL}/rss.xml
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
