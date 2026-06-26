"use client";

import { useState, useEffect } from "react";
import type { CSSProperties } from "react";

/* ───────────────────────────── data ─────────────────────────────────────── */
const NAV_LINKS = [
  { label: "Food Planning", href: "#food-planning" },
  { label: "Beverages", href: "#beverages" },
  { label: "Skincare", href: "#skincare" },
  { label: "Journal", href: "/blog" },
];

const GROVLI_HOME =
  "https://grovli.citigrove.com/?utm_source=citigrove&utm_medium=web&utm_campaign=homepage";
const APP_STORE_URL = "https://apps.apple.com/us/app/grovli/id6760633541";

const GCS_BUCKET = process.env.NEXT_PUBLIC_GCS_BUCKET_URL ?? "";
const HERO_IMG = GCS_BUCKET ? `${GCS_BUCKET}/hero/hero-bg.jpg` : "/hero-bg.jpg";
/* A still frame of the app (no video) — the onboarding explainer's poster. */
const APP_IMG =
  "https://image.mux.com/3Vt3C02UTX6sUC7Mlt9wsEZ4vRdZ6oYmmHsg01WAoGey8/thumbnail.jpg?width=900&fit_mode=preserve";

const DRINKS = [
  { name: "Cranberry Lemongrass Apple", note: "Crisp · tart · barely sweet", price: "$25" },
  { name: "Lime Rosemary Grapefruit", note: "Bittersweet · herbal", price: "$25" },
  { name: "Mint Blueberry Lime", note: "Cool · bright · clean", price: "$25" },
  { name: "Fennel Apple Spritz", note: "Anise · orchard", price: "$18" },
  { name: "Peach Ginger Sparkler", note: "Warm · golden", price: "$25" },
  { name: "Cherry Basil Refresher", note: "Dark fruit · garden", price: "$18" },
  { name: "Kiwi Lime Mint Refresher", note: "Sharp · green", price: "$25" },
];

const CHAPTERS = [
  {
    n: "01",
    kicker: "Food Planning",
    title: "Grovli",
    body:
      "Our food planning app. A personalized plan in under thirty seconds — across forty cuisines and a dozen ways of eating — with the grocery list already written and a garden you can plan from. Food planning, not just meal planning.",
    cta: "Start food planning",
    href: GROVLI_HOME,
    external: true,
    dark: true,
  },
  {
    n: "02",
    kicker: "Beverages",
    title: "Two ingredients,\nnothing to hide.",
    body:
      "Sparkling water and natural extracts. No sugar, no additives — seven flavours made to taste clean and feel good. Poured slowly, in small batches.",
    cta: "See the flavours",
    href: "#beverages",
    external: false,
    dark: false,
  },
  {
    n: "03",
    kicker: "Skincare",
    title: "Made for skin,\nand for the season.",
    body:
      "Thoughtfully formulated with quality botanicals for your natural radiance. Wellness inside and out — the same care we bring to the table, brought to your skin.",
    cta: "Explore skincare",
    href: "#skincare",
    external: false,
    dark: false,
  },
];

const STORE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "CitiGrove Sparkling Beverages",
  itemListElement: DRINKS.map((d, i) => ({
    "@type": "ListItem",
    position: i + 1,
    item: {
      "@type": "Product",
      name: d.name,
      category: "Sparkling Beverage",
      brand: { "@type": "Brand", name: "CitiGrove" },
      offers: {
        "@type": "Offer",
        price: d.price.replace("$", ""),
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
    },
  })),
};

/* ─────────────────────────── design tokens ──────────────────────────────── */
const C = {
  page: "#F7F5EF",
  surface: "#FCFBF7",
  ink: "#16140F",
  soft: "#6F6A60",
  faint: "rgba(22,20,15,0.40)",
  clay: "#9A4A26",
  clayFill: "#B5582F",
  line: "#E4E1D6",
  dark: "#16140F",
  onDark: "#F7F5EF",
  onDarkSoft: "rgba(247,245,239,0.62)",
  onDarkLine: "rgba(247,245,239,0.18)",
};
const serif: CSSProperties = { fontFamily: "var(--font-playfair), serif" };

function eyebrowStyle(dark = false): CSSProperties {
  return {
    fontSize: 11,
    letterSpacing: "0.26em",
    textTransform: "uppercase",
    fontWeight: 600,
    color: dark ? C.onDarkSoft : C.clay,
  };
}

const pageWrap: CSSProperties = { maxWidth: 1320, margin: "0 auto", padding: "0 clamp(22px,5vw,56px)" };

/* ─────────────────────────────── page ───────────────────────────────────── */
export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [posts, setPosts] = useState<
    { title: string; summary: string; slug: string; published_at: string }[]
  >([]);
  const [email, setEmail] = useState("");
  const [subState, setSubState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [subMsg, setSubMsg] = useState("");

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const base =
      process.env.NEXT_PUBLIC_DOCUMENT_API_URL ||
      "https://grovli-document-api-public-uyply7jkca-uc.a.run.app";
    fetch(`${base}/public/categories/blog?limit=3`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setPosts((d.items || []).slice(0, 3)))
      .catch(() => {});
  }, []);

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (subState === "loading") return;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@") || !trimmed.includes(".")) {
      setSubState("error");
      setSubMsg("Enter a valid email.");
      return;
    }
    setSubState("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, source: "citigrove_homepage" }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setSubState("error");
        setSubMsg("Something went wrong. Try again?");
        return;
      }
      setSubState("done");
      setSubMsg(data.message || "You're in — check your inbox.");
      setEmail("");
    } catch {
      setSubState("error");
      setSubMsg("Couldn't reach the server. Try again?");
    }
  }

  return (
    <div id="top" style={{ background: C.page, color: C.ink, fontFamily: "var(--font-inter), system-ui, sans-serif", overflowX: "hidden" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STORE_JSONLD).replace(/</g, "\\u003c") }}
      />

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          transition: "background .4s ease, border-color .4s ease",
          background: scrolled ? "rgba(247,245,239,0.88)" : "transparent",
          backdropFilter: scrolled ? "blur(14px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(14px)" : "none",
          borderBottom: `1px solid ${scrolled ? C.line : "transparent"}`,
        }}
      >
        <div style={{ ...pageWrap, height: 78, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="#top" style={{ ...serif, fontSize: 21, fontWeight: 500, letterSpacing: "0.14em", color: C.ink, textDecoration: "none" }}>
            CITIGROVE
          </a>
          <nav className="hidden md:flex" style={{ gap: 42 }}>
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href}
                style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: C.soft, textDecoration: "none", transition: "color .2s" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = C.ink)}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = C.soft)}>
                {l.label}
              </a>
            ))}
          </nav>
          <a href={GROVLI_HOME} target="_blank" rel="noopener noreferrer" className="hidden md:inline-block"
            style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: C.ink, textDecoration: "none", borderBottom: `1px solid ${C.ink}`, paddingBottom: 3 }}>
            The App
          </a>
          <button className="md:hidden" aria-label="Menu" onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 8, display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ width: 22, height: 1, background: C.ink, transition: "all .3s", transform: menuOpen ? "rotate(45deg) translate(4px,4px)" : "none" }} />
            <span style={{ width: 22, height: 1, background: C.ink, transition: "all .3s", opacity: menuOpen ? 0 : 1 }} />
            <span style={{ width: 22, height: 1, background: C.ink, transition: "all .3s", transform: menuOpen ? "rotate(-45deg) translate(4px,-4px)" : "none" }} />
          </button>
        </div>
        {menuOpen && (
          <div style={{ background: "rgba(247,245,239,0.97)", backdropFilter: "blur(14px)", borderTop: `1px solid ${C.line}`, padding: "20px clamp(22px,5vw,56px)" }}>
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)}
                style={{ display: "block", padding: "14px 0", fontSize: 14, letterSpacing: "0.06em", color: C.ink, textDecoration: "none", borderBottom: `1px solid ${C.line}` }}>
                {l.label}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* ── Hero (no video) ─────────────────────────────────────────────────── */}
      <section style={{ ...pageWrap, minHeight: "100svh", display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: "clamp(130px,20vh,210px)", paddingBottom: "clamp(56px,8vw,96px)" }}>
        <div style={{ marginBottom: 30 }}><span style={eyebrowStyle()}>Food · Wellness · Community</span></div>
        <h1 style={{ ...serif, fontWeight: 400, fontSize: "clamp(2.6rem,8.4vw,6.75rem)", lineHeight: 1.0, letterSpacing: "-0.02em", margin: 0 }}>
          Eat good.<br />Look good.<br /><span style={{ color: C.clay }}>Feel good.</span>
        </h1>
        <p style={{ marginTop: 40, maxWidth: 540, fontSize: "clamp(1rem,1.45vw,1.1875rem)", lineHeight: 1.75, color: C.soft }}>
          A food-first wellness house. It begins with Grovli — our food planning app — and grows into
          small-batch sparkling drinks and natural skincare. Considered, connected, made by people.
        </p>
        <div style={{ marginTop: 46, display: "flex", gap: 22, flexWrap: "wrap", alignItems: "center" }}>
          <a href={GROVLI_HOME} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: C.onDark, background: C.ink, padding: "16px 34px", borderRadius: 999, textDecoration: "none" }}>
            Start food planning
          </a>
          <a href="#food-planning" style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: C.ink, textDecoration: "none", borderBottom: `1px solid ${C.line}`, paddingBottom: 4 }}>
            Explore the house
          </a>
        </div>
      </section>

      {/* ── Full-bleed lifestyle band ───────────────────────────────────────── */}
      <div role="img" aria-label="CitiGrove" style={{ height: "clamp(300px,52vh,580px)", background: `${C.line} url(${HERO_IMG}) center / cover no-repeat` }} />

      {/* ── Manifesto ───────────────────────────────────────────────────────── */}
      <section style={{ ...pageWrap, maxWidth: 1040, paddingTop: "clamp(110px,16vw,200px)", paddingBottom: "clamp(110px,16vw,200px)", textAlign: "center" }}>
        <div style={{ marginBottom: 30 }}><span style={eyebrowStyle()}>Our belief</span></div>
        <p style={{ ...serif, fontWeight: 400, fontSize: "clamp(1.65rem,3.6vw,2.85rem)", lineHeight: 1.34, letterSpacing: "-0.01em", margin: 0 }}>
          Eating well shouldn&apos;t be a project. It should be the most natural thing — accessible,
          personal, and deeply human. So we make the tools, the rituals, and the small good things
          that let it feel that way.
        </p>
      </section>

      {/* ── Chapters ────────────────────────────────────────────────────────── */}
      <div id="food-planning">
        <Chapter chapter={CHAPTERS[0]} image={APP_IMG} flip={false} />
      </div>
      <div id="beverages-intro">
        <Chapter chapter={CHAPTERS[1]} flip />
      </div>

      {/* ── Beverages gallery ───────────────────────────────────────────────── */}
      <section id="beverages" style={{ ...pageWrap, paddingTop: "clamp(40px,5vw,64px)", paddingBottom: "clamp(110px,16vw,200px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(228px, 1fr))", gap: "clamp(14px,1.4vw,22px)" }}>
          {DRINKS.map((d) => (
            <div key={d.name} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 6, padding: "clamp(22px,2.4vw,30px)", display: "flex", flexDirection: "column", minHeight: 292 }}>
              <div style={{ height: 110, borderRadius: 4, background: "rgba(154,74,38,0.07)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
                <span style={{ ...serif, fontSize: 30, color: "rgba(154,74,38,0.5)" }}>◦</span>
              </div>
              <div style={{ ...eyebrowStyle(), color: C.faint, marginBottom: 10 }}>Sparkling</div>
              <div style={{ ...serif, fontWeight: 400, fontSize: 19, lineHeight: 1.2, color: C.ink, marginBottom: 6 }}>{d.name}</div>
              <div style={{ fontSize: 13, color: C.soft, lineHeight: 1.5 }}>{d.note}</div>
              <div style={{ marginTop: "auto", paddingTop: 18, fontSize: 14, color: C.ink }}>{d.price}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Skincare chapter ────────────────────────────────────────────────── */}
      <div id="skincare">
        <Chapter chapter={CHAPTERS[2]} flip={false} />
      </div>

      {/* ── Journal ─────────────────────────────────────────────────────────── */}
      <section style={{ ...pageWrap, paddingTop: "clamp(40px,6vw,80px)", paddingBottom: "clamp(110px,16vw,200px)", borderTop: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 20, marginBottom: "clamp(40px,5vw,64px)", marginTop: "clamp(40px,5vw,64px)" }}>
          <div>
            <div style={{ marginBottom: 18 }}><span style={eyebrowStyle()}>The Journal</span></div>
            <h2 style={{ ...serif, fontWeight: 400, fontSize: "clamp(1.9rem,4vw,3rem)", lineHeight: 1.08, letterSpacing: "-0.015em", margin: 0 }}>
              Notes from the table.
            </h2>
          </div>
          <a href="/blog" style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: C.ink, textDecoration: "none", borderBottom: `1px solid ${C.ink}`, paddingBottom: 4, whiteSpace: "nowrap" }}>
            Read the Journal
          </a>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "clamp(28px,3vw,48px)" }}>
          {(posts.length ? posts : [0, 1, 2].map(() => null)).map((p, i) =>
            p ? (
              <a key={p.slug} href={`/blog/${p.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                <div style={{ ...eyebrowStyle(), color: C.faint, marginBottom: 14 }}>{fmtDate(p.published_at)}</div>
                <div style={{ ...serif, fontWeight: 400, fontSize: 22, lineHeight: 1.22, color: C.ink, marginBottom: 12 }}>{p.title}</div>
                <div style={{ fontSize: 14.5, color: C.soft, lineHeight: 1.65 }}>{p.summary}</div>
                <div style={{ marginTop: 16, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: C.clay }}>Read essay →</div>
              </a>
            ) : (
              <div key={i} style={{ opacity: 0.4 }}>
                <div style={{ height: 9, width: 90, background: C.line, marginBottom: 16 }} />
                <div style={{ height: 22, background: C.line, marginBottom: 12 }} />
                <div style={{ height: 12, background: C.line, width: "85%" }} />
              </div>
            )
          )}
        </div>
      </section>

      {/* ── Newsletter / first order ────────────────────────────────────────── */}
      <section style={{ background: C.dark, color: C.onDark }}>
        <div style={{ ...pageWrap, maxWidth: 760, paddingTop: "clamp(110px,16vw,180px)", paddingBottom: "clamp(110px,16vw,180px)", textAlign: "center" }}>
          <div style={{ marginBottom: 24 }}><span style={eyebrowStyle(true)}>Pull up a chair</span></div>
          <h2 style={{ ...serif, fontWeight: 400, fontSize: "clamp(1.9rem,4.4vw,3.1rem)", lineHeight: 1.12, letterSpacing: "-0.015em", margin: "0 0 18px" }}>
            10% off your first order.
          </h2>
          <p style={{ fontSize: "clamp(0.95rem,1.4vw,1.05rem)", lineHeight: 1.7, color: C.onDarkSoft, maxWidth: 460, margin: "0 auto clamp(32px,4vw,44px)" }}>
            One short, useful note every few weeks — the food thinking we&apos;d send a friend. Join and
            we&apos;ll send your code.
          </p>
          {subState === "done" ? (
            <p style={{ ...serif, fontSize: "1.25rem", color: C.onDark }}>{subMsg}</p>
          ) : (
            <form onSubmit={handleSubscribe} style={{ display: "flex", gap: 12, maxWidth: 480, margin: "0 auto", flexWrap: "wrap", justifyContent: "center" }}>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" aria-label="Email"
                style={{ flex: "1 1 240px", background: "transparent", border: `1px solid ${C.onDarkLine}`, borderRadius: 999, padding: "15px 24px", fontSize: 15, color: C.onDark, outline: "none" }} />
              <button type="submit" disabled={subState === "loading"}
                style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: C.ink, background: C.onDark, border: "none", borderRadius: 999, padding: "15px 32px", cursor: "pointer" }}>
                {subState === "loading" ? "Sending…" : "Join"}
              </button>
            </form>
          )}
          {subState === "error" && <p style={{ marginTop: 16, fontSize: 13, color: "#E0A07E" }}>{subMsg}</p>}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer style={{ background: C.page, borderTop: `1px solid ${C.line}` }}>
        <div style={{ ...pageWrap, paddingTop: "clamp(56px,7vw,88px)", paddingBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 40 }}>
            <div style={{ maxWidth: 320 }}>
              <div style={{ ...serif, fontSize: 22, fontWeight: 500, letterSpacing: "0.14em", marginBottom: 16 }}>CITIGROVE</div>
              <p style={{ fontSize: 14, color: C.soft, lineHeight: 1.65 }}>
                A food-first wellness house. Eat good, look good, feel good.
              </p>
            </div>
            <div style={{ display: "flex", gap: "clamp(40px,6vw,90px)", flexWrap: "wrap" }}>
              <FooterCol title="The House" links={[
                { label: "Food Planning", href: GROVLI_HOME, ext: true },
                { label: "Beverages", href: "#beverages", ext: false },
                { label: "Skincare", href: "#skincare", ext: false },
                { label: "Journal", href: "/blog", ext: false },
              ]} />
              <FooterCol title="Grovli" links={[
                { label: "Open the app", href: GROVLI_HOME, ext: true },
                { label: "Get it on iPhone", href: APP_STORE_URL, ext: true },
              ]} />
              <FooterCol title="More" links={[
                { label: "Instagram", href: "https://instagram.com/grovli", ext: true },
                { label: "Privacy", href: "/privacy", ext: false },
                { label: "Terms", href: "/terms", ext: false },
              ]} />
            </div>
          </div>
          <div style={{ marginTop: "clamp(48px,6vw,72px)", paddingTop: 24, borderTop: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontSize: 12, color: C.faint }}>© {new Date().getFullYear()} CitiGrove</span>
            <span style={{ fontSize: 12, color: C.faint }}>Built by people, for people.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─────────────────────────── components ──────────────────────────────────── */
function Chapter({
  chapter,
  image,
  flip,
}: {
  chapter: (typeof CHAPTERS)[number];
  image?: string;
  flip: boolean;
}) {
  const dark = chapter.dark;
  const text = (
    <div style={{ flex: "1 1 420px", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 26 }}>
        <span style={{ ...serif, fontSize: 15, color: dark ? C.onDarkSoft : C.clay }}>{chapter.n}</span>
        <span style={{ width: 28, height: 1, background: dark ? C.onDarkLine : C.line }} />
        <span style={eyebrowStyle(dark)}>{chapter.kicker}</span>
      </div>
      <h2 style={{ ...serif, fontWeight: 400, fontSize: "clamp(2.1rem,4.6vw,3.6rem)", lineHeight: 1.05, letterSpacing: "-0.015em", margin: "0 0 26px", color: dark ? C.onDark : C.ink, whiteSpace: "pre-line" }}>
        {chapter.title}
      </h2>
      <p style={{ fontSize: "clamp(1rem,1.4vw,1.125rem)", lineHeight: 1.75, color: dark ? C.onDarkSoft : C.soft, maxWidth: 480, margin: 0 }}>
        {chapter.body}
      </p>
      <a href={chapter.href} target={chapter.external ? "_blank" : undefined} rel={chapter.external ? "noopener noreferrer" : undefined}
        style={{ display: "inline-block", marginTop: 34, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: dark ? C.onDark : C.ink, textDecoration: "none", borderBottom: `1px solid ${dark ? C.onDark : C.ink}`, paddingBottom: 5 }}>
        {chapter.cta} →
      </a>
    </div>
  );

  const visual = (
    <div style={{ flex: "1 1 360px", display: "flex", alignItems: "center", justifyContent: "center", minWidth: 0 }}>
      {image ? (
        <div style={{ aspectRatio: "443 / 960", height: "clamp(360px,56vh,560px)", maxWidth: "100%", borderRadius: 26, overflow: "hidden", background: `${C.dark} url(${image}) center / cover no-repeat`, boxShadow: dark ? "none" : "0 40px 90px rgba(22,20,15,0.18)" }} />
      ) : (
        <div style={{ width: "100%", aspectRatio: "4 / 5", maxHeight: 540, borderRadius: 8, background: dark ? "rgba(247,245,239,0.06)" : "rgba(154,74,38,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ ...serif, fontSize: 56, color: dark ? "rgba(247,245,239,0.18)" : "rgba(154,74,38,0.32)" }}>{chapter.n}</span>
        </div>
      )}
    </div>
  );

  return (
    <section style={{ background: dark ? C.dark : C.page }}>
      <div style={{ ...pageWrap, paddingTop: "clamp(96px,13vw,168px)", paddingBottom: "clamp(96px,13vw,168px)", display: "flex", gap: "clamp(40px,6vw,96px)", alignItems: "center", flexWrap: "wrap", flexDirection: flip ? "row-reverse" : "row" }}>
        {text}
        {visual}
      </div>
    </section>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string; ext: boolean }[] }) {
  return (
    <div>
      <div style={{ ...eyebrowStyle(), color: C.faint, marginBottom: 16 }}>{title}</div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} target={l.ext ? "_blank" : undefined} rel={l.ext ? "noopener noreferrer" : undefined}
              style={{ fontSize: 14, color: C.soft, textDecoration: "none" }}>
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "";
  }
}
