/**
 * GrovliCTA — the in-article "Start food planning" call-to-action block.
 *
 * Rendered wherever a blog post body contains a {{TRY_GROVLI}} marker (see
 * lib/markdown.ts) and at the foot of every essay. Routes to
 * grovli.citigrove.com with UTM tags so the funnel attribution stream can
 * join citigrove-blog traffic into Grovli signups.
 *
 * Server component (no hooks) so it renders inside the statically-exported
 * blog post pages without a client boundary.
 */

const APP_STORE_URL = "https://apps.apple.com/us/app/grovli/id6760633541";

interface GrovliCTAProps {
  /** Campaign slug for UTM attribution — usually the post slug. */
  campaign: string;
  /** "band" = full-width green block (default); "compact" = slimmer inline bar. */
  variant?: "band" | "compact";
}

export function GrovliCTA({ campaign, variant = "band" }: GrovliCTAProps) {
  const href = `https://grovli.citigrove.com/?utm_source=citigrove_blog&utm_medium=content&utm_campaign=${encodeURIComponent(
    campaign
  )}`;

  if (variant === "compact") {
    return (
      <div className="my-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl px-6 py-5 border border-[#3B362D]/[0.10] bg-[#E9E2D3]">
        <p className="text-[15px] leading-[1.5] text-[#3B362D]/80 m-0">
          Grovli turns this into a plan you can actually cook — food planning,
          not just meal planning.
        </p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[13px] font-bold tracking-[0.03em] uppercase whitespace-nowrap"
          style={{ backgroundColor: "#3B362D", color: "#F1ECE1" }}
        >
          Start food planning <span aria-hidden>→</span>
        </a>
      </div>
    );
  }

  return (
    <div
      className="my-12 rounded-3xl px-7 py-10 sm:px-10 text-center"
      style={{ backgroundColor: "#3B362D", color: "#F1ECE1" }}
    >
      <div
        className="text-[11px] tracking-[0.22em] uppercase font-semibold mb-4"
        style={{ color: "rgba(241,236,225,0.55)" }}
      >
        Food planning, handled
      </div>
      <h3
        className="text-[clamp(1.6rem,3vw,2.25rem)] leading-[1.15] tracking-[-0.015em] mb-4"
        style={{ fontFamily: "var(--font-newsreader), Georgia, serif" }}
      >
        Let Grovli plan your food, not just your meals.
      </h3>
      <p
        className="max-w-[460px] mx-auto text-[15px] leading-[1.65] mb-7"
        style={{ color: "rgba(241,236,225,0.72)" }}
      >
        A personalized food plan in under 30 seconds — from what you grow to
        what lands on the table, with the grocery list already done.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[13px] font-bold tracking-[0.03em] uppercase"
          style={{ backgroundColor: "#F1ECE1", color: "#3B362D" }}
        >
          Start food planning <span aria-hidden>→</span>
        </a>
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[13px] font-semibold tracking-[0.02em]"
          style={{ border: "1px solid rgba(241,236,225,0.30)", color: "#F1ECE1" }}
        >
          Get the iPhone app
        </a>
      </div>
    </div>
  );
}
