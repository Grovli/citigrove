"use client";

/**
 * Sticky "Try Grovli" pill — sits bottom-right on every blog page.
 *
 * Routes back to grovli.citigrove.com with UTM tags so the funnel
 * attribution stream (PRs #31, #33, #34) can join citigrove blog
 * traffic into users.attribution at signup time.
 *
 * Mirrors the visual register of the homepage Grovli sticky CTA on
 * grovli.citigrove.com but uses CitiGrove's brand colors (sage green
 * #577260 rather than terracotta).
 */

import { useEffect, useState } from "react";

interface StickyTryGrovliProps {
  /** The campaign slug for UTM attribution. Distinguishes blog index
   *  clicks from individual-post clicks for funnel analysis. */
  campaign: string;
}

export function StickyTryGrovli({ campaign }: StickyTryGrovliProps) {
  // Don't render server-side — the pill shows after a small scroll so
  // the page header reads first. SSR rendering the pill would cause
  // it to flash for SSR readers + then animate in.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const href = `https://grovli.citigrove.com/?utm_source=citigrove_blog&utm_medium=sticky_cta&utm_campaign=${encodeURIComponent(
    campaign
  )}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Try Grovli"
      className={`fixed bottom-6 right-6 z-40 inline-flex items-center gap-2.5 rounded-full px-5 py-3.5 text-[13px] font-bold tracking-[0.04em] uppercase text-[#F4F2EA] shadow-lg transition-all duration-300 ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-3 pointer-events-none"
      }`}
      style={{
        backgroundColor: "#28332C",
        boxShadow: "0 20px 50px rgba(40,51,44,0.35)",
      }}
    >
      <span>Try Grovli</span>
      <span aria-hidden>→</span>
    </a>
  );
}
