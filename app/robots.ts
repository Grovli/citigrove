import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * /robots.txt — emitted statically. Opens the whole site to search engines AND
 * the major AI crawlers (so CitiGrove + Grovli are quotable by AI answer
 * engines), and points every crawler at the sitemap.
 */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  // Explicitly named AI/search agents — all allowed. Naming them documents
  // intent and satisfies crawlers that look for their own token first.
  const aiAndSearchAgents = [
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "ClaudeBot",
    "Claude-Web",
    "anthropic-ai",
    "PerplexityBot",
    "Perplexity-User",
    "Google-Extended",
    "Googlebot",
    "Bingbot",
    "Applebot",
    "Applebot-Extended",
    "Amazonbot",
    "CCBot",
    "Bytespider",
    "DuckDuckBot",
    "cohere-ai",
    "Meta-ExternalAgent",
  ];

  return {
    rules: [
      { userAgent: "*", allow: "/" },
      ...aiAndSearchAgents.map((userAgent) => ({ userAgent, allow: "/" })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
