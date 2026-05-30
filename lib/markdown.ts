/**
 * Markdown rendering for CitiGrove Journal posts.
 *
 * document-api stores each post's body as Markdown. The blog post page splits
 * that body on two in-content CTA markers — {{SUBSCRIBE}} and {{TRY_GROVLI}} —
 * rendering the prose between them as HTML and the markers as live React
 * components (the email-capture form and the Grovli CTA). This is what makes
 * inline links clickable and headings semantic (real <h2>/<h3> for SEO),
 * rather than the old "split on blank lines into <p>" dump.
 *
 * Content is first-party (authored into our own KB), so the HTML produced by
 * `marked` is trusted; we still strip <script> defensively.
 */
import { marked } from "marked";

marked.use({ gfm: true, breaks: false });

/** A renderable piece of a post body. */
export type PostSegment =
  | { kind: "html"; html: string }
  | { kind: "subscribe" }
  | { kind: "cta" };

const TOKEN_RE = /\{\{\s*(SUBSCRIBE|TRY_GROVLI)\s*\}\}/g;

function renderMarkdown(md: string): string {
  const html = marked.parse(md, { async: false }) as string;
  // Defensive: never emit a <script> from stored content.
  return html.replace(/<script[\s\S]*?<\/script>/gi, "");
}

/**
 * Split a post body into ordered segments. Prose chunks become HTML; the
 * {{SUBSCRIBE}} / {{TRY_GROVLI}} markers become component placeholders.
 */
export function renderPostBody(body: string): {
  segments: PostSegment[];
  hasSubscribe: boolean;
} {
  const parts = (body || "").split(TOKEN_RE); // odd indices are captured tokens
  const segments: PostSegment[] = [];
  let hasSubscribe = false;

  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      if (part === "SUBSCRIBE") {
        segments.push({ kind: "subscribe" });
        hasSubscribe = true;
      } else {
        segments.push({ kind: "cta" });
      }
      return;
    }
    const trimmed = part.trim();
    if (!trimmed) return;
    segments.push({ kind: "html", html: renderMarkdown(trimmed) });
  });

  return { segments, hasSubscribe };
}

/** Plain-text excerpt from Markdown (used for JSON-LD / OG fallbacks). */
export function markdownToPlainText(md: string, maxLen = 320): string {
  const text = (md || "")
    .replace(TOKEN_RE, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLen ? text.slice(0, maxLen - 1).trimEnd() + "…" : text;
}
