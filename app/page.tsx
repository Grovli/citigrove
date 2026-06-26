"use client";

import { useState, useEffect, useRef } from "react";
import type { CSSProperties } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
 * IMAGES — master switch for site photography.
 *
 * Currently FALSE: the site is intentionally image-void while real photography
 * is sourced. The full photography-led layout (full-bleed photo bands, the
 * seasonal-table carousel, photo product/journal cards) is preserved below and
 * gated behind this flag. To bring photography back: drop files into
 * public/img/ per public/img/SHOTLIST.md, then set IMAGES = true. No other
 * change is required.
 * ──────────────────────────────────────────────────────────────────────────── */
const IMAGES = false;

/* ───────────────────────────── data ─────────────────────────────────────── */
const NAV_LINKS = [
  { label: "Food Planning", href: "#grovli" },
  { label: "Sparkling", href: "#sparkling" },
  { label: "The House", href: "#house" },
  { label: "The Journal", href: "/blog" },
];

const GROVLI_HOME =
  "https://grovli.citigrove.com/?utm_source=citigrove&utm_medium=web&utm_campaign=homepage";
const APP_STORE_URL = "https://apps.apple.com/us/app/grovli/id6760633541";

const STATUS = [
  { label: "Current season", value: "Summer" },
  { label: "New this week", value: "Peach Ginger" },
  { label: "Membership", value: "Open" },
];

const STEPS = [
  { n: "1", head: "Plan your food", body: "Open Grovli and get a personal plan in under thirty seconds — across forty cuisines and a dozen ways of eating, grocery list already written." },
  { n: "2", head: "Pour something good", body: "Two-ingredient sparkling water, made in small batches. No sugar, nothing to hide — just fruit and bubbles, in season." },
  { n: "3", head: "Care for the rest", body: "Seasonal skincare, everyday wear, and a garden you can plan from — the same patience we bring to the table, brought to the day." },
];

/* Sparkling — each card carries a flavour tone (used as the photo fallback /
   the typographic accent dot). */
const DRINKS = [
  { slot: "drink-1", name: "Cranberry Lemongrass Apple", note: "Crisp · tart · barely sweet", price: "$25", tone: "#E2B79E" },
  { slot: "drink-2", name: "Lime Rosemary Grapefruit", note: "Bittersweet · herbal", price: "$25", tone: "#C2C6B2" },
  { slot: "drink-3", name: "Mint Blueberry Lime", note: "Cool · bright · clean", price: "$25", tone: "#BFC9CB" },
  { slot: "drink-4", name: "Fennel Apple Spritz", note: "Anise · orchard", price: "$18", tone: "#D8C7AE" },
  { slot: "drink-5", name: "Peach Ginger Sparkler", note: "Warm · golden", price: "$25", tone: "#E6C19A" },
  { slot: "drink-6", name: "Cherry Basil Refresher", note: "Dark fruit · garden", price: "$18", tone: "#CBB3B0" },
];

/* The Seasonal Table — full-bleed photo carousel (shown only when IMAGES). */
const TABLE = [
  { slot: "table-1", season: "Summer", name: "The Mediterranean plate" },
  { slot: "table-2", season: "Summer", name: "Garden grains" },
  { slot: "table-3", season: "Summer", name: "The slow roast" },
  { slot: "table-4", season: "Summer", name: "Bright & green" },
  { slot: "table-5", season: "Summer", name: "Winter, kept warm" },
];

/* The rest of the house — categories awaiting their own photography. */
const HOUSE = [
  { slot: "wear", name: "Wear", note: "Tees, tanks & totes — soft cotton, small runs." },
  { slot: "garden", name: "Garden", note: "Seeds, soil & supplies — plan it, then plant it." },
  { slot: "skincare", name: "Skincare", note: "Seasonal botanicals — wellness, inside and out." },
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
      offers: { "@type": "Offer", price: d.price.replace("$", ""), priceCurrency: "USD", availability: "https://schema.org/InStock" },
    },
  })),
};

/* ── Ffern register: warm, muted, cream/peach/sage + soft ink + coral ──────── */
const C = {
  cream: "#F1ECE1",
  panel: "#E9E2D3",
  peach: "#E2B79E",
  sage: "#C2C6B2",
  clay: "#D8B79E",
  stone: "#CFC6B4",
  ink: "#3B362D",
  soft: "#7A7263",
  faint: "rgba(59,54,45,0.45)",
  coral: "#C2703E",
  line: "#DAD3C4",
};
const serif: CSSProperties = { fontFamily: "var(--font-newsreader), Georgia, serif" };
const SIDEBAR = 268;

function label(dark = false): CSSProperties {
  return { fontSize: 10.5, letterSpacing: "0.2em", textTransform: "uppercase", color: dark ? "rgba(59,54,45,0.5)" : C.soft };
}
function Dot({ color = C.coral, size = 6 }: { color?: string; size?: number }) {
  return <span style={{ display: "inline-block", width: size, height: size, borderRadius: 999, background: color, verticalAlign: "middle", marginLeft: 9 }} />;
}
/* Full-bleed photo background (only when IMAGES); otherwise the warm tone. */
function cover(slot: string, tone: string): CSSProperties {
  return IMAGES
    ? { backgroundColor: tone, backgroundImage: `url(/img/${slot}.jpg)`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }
    : { backgroundColor: tone };
}

/* ─────────────────────────────── page ───────────────────────────────────── */
export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [posts, setPosts] = useState<{ title: string; summary: string; slug: string; published_at: string }[]>([]);
  const [email, setEmail] = useState("");
  const [subState, setSubState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [subMsg, setSubMsg] = useState("");
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_DOCUMENT_API_URL || "https://grovli-document-api-public-uyply7jkca-uc.a.run.app";
    fetch(`${base}/public/categories/blog?limit=3`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setPosts((d.items || []).slice(0, 3)))
      .catch(() => {});
  }, []);

  function scrollTable(dir: number) {
    tableRef.current?.scrollBy({ left: dir * 372, behavior: "smooth" });
  }

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (subState === "loading") return;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@") || !trimmed.includes(".")) { setSubState("error"); setSubMsg("Enter a valid email."); return; }
    setSubState("loading");
    try {
      const res = await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: trimmed, source: "citigrove_homepage" }) });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) { setSubState("error"); setSubMsg("Something went wrong. Try again?"); return; }
      setSubState("done"); setSubMsg(data.message || "You're in — check your inbox."); setEmail("");
    } catch { setSubState("error"); setSubMsg("Couldn't reach the server. Try again?"); }
  }

  return (
    <div style={{ background: C.cream, color: C.ink, fontFamily: "var(--font-inter), system-ui, sans-serif", minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STORE_JSONLD).replace(/</g, "\\u003c") }} />

      {/* ── Fixed left sidebar (desktop) ───────────────────────────────────── */}
      <aside className="hidden lg:flex" style={{ position: "fixed", top: 0, left: 0, width: SIDEBAR, height: "100vh", flexDirection: "column", padding: "40px 36px", borderRight: `1px solid ${C.line}`, background: C.cream, zIndex: 40 }}>
        <a href="#top" style={{ ...serif, fontSize: 29, fontWeight: 500, color: C.ink, textDecoration: "none", letterSpacing: "0.005em" }}>CitiGrove</a>
        <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 18 }}>
          {STATUS.map((s) => (
            <div key={s.label}>
              <div style={label()}>{s.label}</div>
              <div style={{ marginTop: 7, ...serif, fontSize: 17, letterSpacing: "0.005em", color: C.ink }}>
                {s.value}{s.value === "Open" ? <Dot /> : null}
              </div>
            </div>
          ))}
        </div>
        <nav style={{ marginTop: 46, display: "flex", flexDirection: "column", gap: 14 }}>
          {NAV_LINKS.map((l) => (
            <a key={l.label} href={l.href} style={{ fontSize: 13.5, letterSpacing: "0.01em", color: C.ink, textDecoration: "none" }}>{l.label}</a>
          ))}
        </nav>
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          <a href={GROVLI_HOME} target="_blank" rel="noopener noreferrer" style={{ ...label(), color: C.coral, textDecoration: "none" }}>The Grovli App ↗</a>
          <span style={{ fontSize: 12, color: C.faint }}>United States · USD</span>
        </div>
      </aside>

      {/* ── Mobile top bar ─────────────────────────────────────────────────── */}
      <header className="lg:hidden" style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(241,236,225,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px" }}>
          <a href="#top" style={{ ...serif, fontSize: 23, fontWeight: 500, color: C.ink, textDecoration: "none" }}>CitiGrove</a>
          <button aria-label="Menu" onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", gap: 5, padding: 6 }}>
            <span style={{ width: 22, height: 1, background: C.ink }} /><span style={{ width: 22, height: 1, background: C.ink }} /><span style={{ width: 22, height: 1, background: C.ink }} />
          </button>
        </div>
        {menuOpen && (
          <div style={{ padding: "8px 22px 20px", borderTop: `1px solid ${C.line}` }}>
            {NAV_LINKS.map((l) => <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "12px 0", fontSize: 15, color: C.ink, textDecoration: "none", borderBottom: `1px solid ${C.line}` }}>{l.label}</a>)}
          </div>
        )}
      </header>

      {/* ── Content column ─────────────────────────────────────────────────── */}
      <main id="top" className="cg-main">
        <div style={{ textAlign: "center", padding: "13px 16px", borderBottom: `1px solid ${C.line}`, ...label(), color: C.soft }}>
          Free local delivery on first orders · Small batches, in season
        </div>

        {/* Hero — warm peach tonal panel + concierge intro */}
        <section className="cg-hero" style={{ background: C.peach, borderBottom: `1px solid ${C.line}` }}>
          <div style={{ padding: "clamp(60px,8vw,116px) clamp(28px,5vw,76px)", maxWidth: 760 }}>
            <div style={label(true)}>The CitiGrove House</div>
            <h1 style={{ ...serif, fontWeight: 400, fontSize: "clamp(2.3rem,4.6vw,4.1rem)", lineHeight: 1.1, letterSpacing: "-0.012em", margin: "22px 0 0" }}>
              A food-first wellness house — small-batch, seasonal, and made by people.
            </h1>
            <p style={{ marginTop: 26, maxWidth: 480, fontSize: 16, lineHeight: 1.72, color: "rgba(59,54,45,0.8)" }}>
              It begins with Grovli, our food planning app, and grows into sparkling drinks, skincare, wear and the garden. A few small good things, in season, all year.
            </p>
            <a href={GROVLI_HOME} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 34, fontSize: 11.5, letterSpacing: "0.16em", textTransform: "uppercase", color: C.cream, background: C.ink, padding: "16px 32px", borderRadius: 2, textDecoration: "none" }}>
              Start with Grovli<Dot color={C.cream} />
            </a>
          </div>
        </section>

        {/* Full-bleed hero photograph (only when IMAGES) */}
        {IMAGES && <Stamp slot="hero" tone={C.sage} stamp="In season" line="Built around the way you actually eat." />}

        {/* Concierge — how the house works */}
        <section style={{ padding: "clamp(64px,8vw,120px) clamp(28px,5vw,76px)", borderBottom: `1px solid ${C.line}` }}>
          <div style={label()}>How the house works</div>
          <ol style={{ listStyle: "none", margin: "34px 0 0", padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))", gap: "clamp(28px,4vw,56px)" }}>
            {STEPS.map((s) => (
              <li key={s.n}>
                <div style={{ ...serif, fontSize: 30, fontWeight: 400, color: C.coral }}>{s.n}</div>
                <div style={{ ...serif, fontSize: 21, fontWeight: 500, margin: "10px 0 10px", color: C.ink }}>{s.head}</div>
                <p style={{ fontSize: 14.5, lineHeight: 1.7, color: C.soft, margin: 0, maxWidth: 320 }}>{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Manifesto */}
        <section style={{ padding: "clamp(80px,11vw,168px) clamp(28px,6vw,96px)", borderBottom: `1px solid ${C.line}`, textAlign: "center" }}>
          <div style={label()}>Our belief</div>
          <p style={{ ...serif, fontWeight: 400, fontSize: "clamp(1.7rem,3.4vw,2.9rem)", lineHeight: 1.34, letterSpacing: "-0.008em", margin: "28px auto 0", maxWidth: 920 }}>
            Eating well shouldn&apos;t be a project. It should be the most natural thing — accessible, personal, and
            deeply human. So we make the tools, the rituals, and the small good things that let it feel that way.
          </p>
        </section>

        {/* Chapter — Grovli */}
        <Grovli />

        {/* The Seasonal Table — full-bleed photo carousel (only when IMAGES) */}
        {IMAGES && (
          <section style={{ padding: "clamp(64px,8vw,116px) 0", borderBottom: `1px solid ${C.line}` }}>
            <div style={{ padding: "0 clamp(28px,5vw,76px)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: "clamp(28px,3.4vw,44px)" }}>
              <div>
                <div style={label()}>In season</div>
                <h2 style={{ ...serif, fontWeight: 400, fontSize: "clamp(1.8rem,3.4vw,2.9rem)", lineHeight: 1.08, margin: "14px 0 0" }}>The seasonal table.</h2>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <CarouselBtn dir={-1} onClick={() => scrollTable(-1)} />
                <CarouselBtn dir={1} onClick={() => scrollTable(1)} />
              </div>
            </div>
            <div ref={tableRef} className="cg-scroll" style={{ display: "flex", gap: "clamp(14px,1.5vw,22px)", overflowX: "auto", scrollSnapType: "x mandatory", padding: "0 clamp(28px,5vw,76px)", scrollbarWidth: "none" }}>
              {TABLE.map((t) => (
                <div key={t.slot} style={{ flex: "0 0 auto", width: "clamp(252px,28vw,344px)", scrollSnapAlign: "start" }}>
                  <div role="img" aria-label={t.name} style={{ aspectRatio: "4 / 5", borderRadius: 3, ...cover(t.slot, C.panel), position: "relative", display: "flex", alignItems: "flex-end", padding: 18 }}>
                    <div style={{ position: "absolute", inset: 0, borderRadius: 3, background: "linear-gradient(to top, rgba(28,25,20,0.5), rgba(28,25,20,0) 52%)" }} />
                    <span style={{ position: "relative", ...label(), color: "rgba(255,255,255,0.82)" }}>{t.season}</span>
                  </div>
                  <div style={{ ...serif, fontSize: 18, marginTop: 14 }}>{t.name}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Sparkling */}
        <section id="sparkling" style={{ padding: "clamp(70px,8vw,124px) clamp(28px,5vw,76px)", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: "clamp(34px,4vw,56px)" }}>
            <div>
              <div style={label()}>In season · Sparkling</div>
              <h2 style={{ ...serif, fontWeight: 400, fontSize: "clamp(1.8rem,3.4vw,2.9rem)", lineHeight: 1.08, margin: "14px 0 0" }}>Two ingredients, nothing to hide.</h2>
            </div>
            <a href="#sparkling" style={{ ...label(), color: C.coral, textDecoration: "none", whiteSpace: "nowrap" }}>Shop all flavours ↗</a>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: IMAGES ? "repeat(auto-fill, minmax(232px,1fr))" : "repeat(auto-fill, minmax(248px,1fr))", gap: IMAGES ? "clamp(16px,1.8vw,28px)" : "clamp(2px,2.4vw,44px) clamp(28px,3vw,52px)" }}>
            {DRINKS.map((d) => (
              <a key={d.slot} href="#sparkling" style={{ textDecoration: "none", color: "inherit", display: "block", borderTop: IMAGES ? "none" : `1px solid ${C.line}`, paddingTop: IMAGES ? 0 : 22 }}>
                {IMAGES ? (
                  <div role="img" aria-label={d.name} style={{ aspectRatio: "4 / 5", borderRadius: 3, ...cover(d.slot, d.tone), display: "flex", alignItems: "flex-end", padding: 18 }}>
                    <span style={{ ...label(), color: "rgba(59,54,45,0.5)" }}>Sparkling</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 999, background: d.tone, display: "inline-block" }} />
                    <span style={label()}>Sparkling</span>
                  </div>
                )}
                <div style={{ ...serif, fontSize: IMAGES ? 18 : 22, lineHeight: 1.2, marginTop: IMAGES ? 15 : 12 }}>{d.name}</div>
                <div style={{ fontSize: 13, color: C.soft, marginTop: 6 }}>{d.note}</div>
                <div style={{ fontSize: 13.5, marginTop: 10 }}>{d.price}</div>
              </a>
            ))}
          </div>
        </section>

        {/* The rest of the house */}
        <section id="house" style={{ padding: "clamp(70px,8vw,124px) clamp(28px,5vw,76px)", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ marginBottom: "clamp(34px,4vw,56px)" }}>
            <div style={label()}>The rest of the house</div>
            <h2 style={{ ...serif, fontWeight: 400, fontSize: "clamp(1.8rem,3.4vw,2.9rem)", lineHeight: 1.08, margin: "14px 0 0" }}>Made with the same patience.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))", gap: IMAGES ? "clamp(16px,1.8vw,28px)" : "clamp(2px,2vw,36px) clamp(28px,3vw,56px)" }}>
            {HOUSE.map((h) => (
              <div key={h.slot} style={{ borderTop: IMAGES ? "none" : `1px solid ${C.line}`, paddingTop: IMAGES ? 0 : 22 }}>
                {IMAGES ? (
                  <div role="img" aria-label={h.name} style={{ aspectRatio: "3 / 4", borderRadius: 3, ...cover(h.slot, C.panel), position: "relative", display: "flex", alignItems: "flex-end", padding: 22 }}>
                    <span style={{ ...label(), color: "rgba(59,54,45,0.5)" }}>Joining the list</span>
                  </div>
                ) : (
                  <div style={label()}>Joining the list</div>
                )}
                <div style={{ ...serif, fontSize: IMAGES ? 21 : 24, marginTop: IMAGES ? 16 : 12 }}>{h.name}</div>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: C.soft, margin: "10px 0 0", maxWidth: 300 }}>{h.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Journal */}
        <section style={{ padding: "clamp(70px,8vw,124px) clamp(28px,5vw,76px)", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: "clamp(34px,4vw,56px)" }}>
            <div>
              <div style={label()}>The Journal</div>
              <h2 style={{ ...serif, fontWeight: 400, fontSize: "clamp(1.8rem,3.4vw,2.9rem)", lineHeight: 1.08, margin: "14px 0 0" }}>Notes from the table.</h2>
            </div>
            <a href="/blog" style={{ ...label(), color: C.coral, textDecoration: "none", whiteSpace: "nowrap" }}>Read the Journal ↗</a>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(264px,1fr))", gap: IMAGES ? "clamp(26px,3vw,46px)" : "clamp(2px,2vw,36px) clamp(28px,3vw,56px)" }}>
            {(posts.length ? posts : ([null, null, null] as null[])).map((p, i) =>
              p ? (
                <a key={p.slug} href={`/blog/${p.slug}`} style={{ textDecoration: "none", color: "inherit", borderTop: IMAGES ? "none" : `1px solid ${C.line}`, paddingTop: IMAGES ? 0 : 22, display: "block" }}>
                  {IMAGES && <div role="img" aria-label={p.title} style={{ aspectRatio: "3 / 2", borderRadius: 3, marginBottom: 18, ...cover(`journal-${(i % 3) + 1}`, i % 2 ? C.sage : C.peach) }} />}
                  <div style={{ ...label(), color: C.faint }}>{fmtDate(p.published_at)}</div>
                  <div style={{ ...serif, fontSize: IMAGES ? 21 : 23, lineHeight: 1.24, margin: "12px 0 10px" }}>{p.title}</div>
                  <div style={{ fontSize: 14, color: C.soft, lineHeight: 1.62 }}>{p.summary}</div>
                </a>
              ) : (
                <div key={i} style={{ opacity: 0.5, borderTop: IMAGES ? "none" : `1px solid ${C.line}`, paddingTop: IMAGES ? 0 : 22 }}>
                  {IMAGES && <div style={{ aspectRatio: "3 / 2", background: C.panel, borderRadius: 3, marginBottom: 18 }} />}
                  <div style={{ height: 10, width: 90, background: C.line, marginBottom: 12 }} />
                  <div style={{ height: 18, background: C.line, width: "80%" }} />
                </div>
              )
            )}
          </div>
        </section>

        {/* Membership / first order */}
        <section style={{ background: C.peach, padding: "clamp(84px,9vw,148px) clamp(28px,6vw,96px)", textAlign: "center" }}>
          <div style={label(true)}>Pull up a chair</div>
          <h2 style={{ ...serif, fontWeight: 400, fontSize: "clamp(1.9rem,3.6vw,3.1rem)", lineHeight: 1.14, margin: "22px 0 14px" }}>10% off your first order.</h2>
          <p style={{ fontSize: 15.5, lineHeight: 1.72, color: "rgba(59,54,45,0.76)", maxWidth: 460, margin: "0 auto 34px" }}>
            One short, useful note every few weeks — the food thinking we&apos;d send a friend. Join the house and we&apos;ll send your code.
          </p>
          {subState === "done" ? (
            <p style={{ ...serif, fontSize: "1.3rem", color: C.ink }}>{subMsg}</p>
          ) : (
            <form onSubmit={handleSubscribe} style={{ display: "flex", gap: 10, maxWidth: 460, margin: "0 auto", flexWrap: "wrap", justifyContent: "center" }}>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email address" aria-label="Email"
                style={{ flex: "1 1 230px", background: "rgba(255,255,255,0.5)", border: `1px solid rgba(59,54,45,0.2)`, borderRadius: 2, padding: "15px 18px", fontSize: 14.5, color: C.ink, outline: "none" }} />
              <button type="submit" disabled={subState === "loading"}
                style={{ fontSize: 11.5, letterSpacing: "0.14em", textTransform: "uppercase", color: C.cream, background: C.ink, border: "none", borderRadius: 2, padding: "15px 30px", cursor: "pointer" }}>
                {subState === "loading" ? "Sending…" : "Join"}
              </button>
            </form>
          )}
          {subState === "error" && <p style={{ marginTop: 14, fontSize: 13, color: "#8A3D24" }}>{subMsg}</p>}
        </section>

        {/* Footer */}
        <footer style={{ background: C.cream, padding: "clamp(52px,6vw,84px) clamp(28px,5vw,76px) 40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 40 }}>
            <div style={{ maxWidth: 300 }}>
              <div style={{ ...serif, fontSize: 26, fontWeight: 500, marginBottom: 14 }}>CitiGrove</div>
              <p style={{ fontSize: 13.5, color: C.soft, lineHeight: 1.65 }}>A food-first wellness house. Eat good, look good, feel good.</p>
            </div>
            <div style={{ display: "flex", gap: "clamp(36px,5vw,80px)", flexWrap: "wrap" }}>
              <FooterCol title="The House" links={[{ label: "Food Planning", href: GROVLI_HOME, ext: true }, { label: "Sparkling", href: "#sparkling", ext: false }, { label: "The House", href: "#house", ext: false }, { label: "The Journal", href: "/blog", ext: false }]} />
              <FooterCol title="Grovli" links={[{ label: "Open the app", href: GROVLI_HOME, ext: true }, { label: "Get it on iPhone", href: APP_STORE_URL, ext: true }]} />
              <FooterCol title="More" links={[{ label: "Instagram", href: "https://instagram.com/grovli", ext: true }, { label: "Privacy", href: "/privacy", ext: false }, { label: "Terms", href: "/terms", ext: false }]} />
            </div>
          </div>
          <div style={{ marginTop: "clamp(40px,5vw,64px)", paddingTop: 22, borderTop: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 12, color: C.faint }}>© {new Date().getFullYear()} CitiGrove</span>
            <span style={{ fontSize: 12, color: C.faint }}>Built by people, for people.</span>
          </div>
        </footer>
      </main>

      <style>{`.cg-main{margin-left:0}.cg-scroll::-webkit-scrollbar{display:none}@media(min-width:1024px){.cg-main{margin-left:${SIDEBAR}px}}`}</style>
    </div>
  );
}

/* ─────────────────────────── components ──────────────────────────────────── */
/* Grovli chapter — a full-bleed photo band when IMAGES, otherwise a clean
   tonal feature band with ink type. */
function Grovli() {
  const title = "Food planning,\nnot a project.";
  const body = "A personalized plan in under thirty seconds — across forty cuisines and a dozen ways of eating, with the grocery list already written and a garden you can plan from.";
  if (!IMAGES) {
    return (
      <section id="grovli" style={{ background: C.sage, borderBottom: `1px solid ${C.line}`, padding: "clamp(72px,9vw,140px) clamp(28px,5vw,76px)" }}>
        <div style={{ maxWidth: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <span style={label(true)}>Grovli</span>
            <span style={{ width: 22, height: 1, background: "rgba(59,54,45,0.3)" }} />
            <span style={label(true)}>Food planning</span>
          </div>
          <h2 style={{ ...serif, fontWeight: 400, fontSize: "clamp(2rem,4vw,3.4rem)", lineHeight: 1.08, letterSpacing: "-0.012em", margin: "0 0 22px", whiteSpace: "pre-line", color: C.ink }}>{title}</h2>
          <p style={{ fontSize: 16, lineHeight: 1.74, color: "rgba(59,54,45,0.82)", maxWidth: 460, margin: 0 }}>{body}</p>
          <a href={GROVLI_HOME} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 30, fontSize: 11.5, letterSpacing: "0.16em", textTransform: "uppercase", color: C.ink, textDecoration: "none", borderBottom: `1px solid ${C.ink}`, paddingBottom: 5 }}>
            Open Grovli ↗
          </a>
        </div>
      </section>
    );
  }
  return (
    <PhotoChapter
      id="grovli" slot="grovli" tone={C.clay} align="left" stamp="The app"
      kicker="Grovli" season="Food planning" title={title} body={body}
      cta="Open Grovli" href={GROVLI_HOME} external
    />
  );
}

/* Full-bleed photo band with a giant serif-caps stamp + one serif line. */
function Stamp({ slot, tone, stamp, line }: { slot: string; tone: string; stamp: string; line: string }) {
  return (
    <section style={{ position: "relative", minHeight: "clamp(320px,46vw,580px)", ...cover(slot, tone), borderBottom: `1px solid ${C.line}` }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(28,25,20,0.5) 0%, rgba(28,25,20,0.05) 50%, rgba(28,25,20,0.18) 100%)" }} />
      <div style={{ position: "relative", minHeight: "inherit", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "clamp(28px,4vw,56px)" }}>
        <div style={{ ...label(), color: "rgba(255,255,255,0.82)" }}>{stamp}</div>
        <div style={{ ...serif, fontWeight: 400, fontSize: "clamp(1.5rem,3vw,2.5rem)", lineHeight: 1.16, color: "#FBF7EF", maxWidth: 620, textShadow: "0 1px 24px rgba(28,25,20,0.35)" }}>{line}</div>
      </div>
    </section>
  );
}

/* Full-bleed photo chapter with an overlaid content block. */
function PhotoChapter({
  id, slot, tone, align, stamp, kicker, season, title, body, cta, href, external,
}: {
  id?: string; slot: string; tone: string; align: "left" | "right"; stamp: string;
  kicker: string; season: string; title: string; body: string; cta: string; href: string; external?: boolean;
}) {
  const left = align === "left";
  return (
    <section id={id} style={{ position: "relative", minHeight: "clamp(480px,62vw,720px)", ...cover(slot, tone), borderBottom: `1px solid ${C.line}` }}>
      <div style={{ position: "absolute", inset: 0, background: left
        ? "linear-gradient(90deg, rgba(28,25,20,0.66) 0%, rgba(28,25,20,0.3) 44%, rgba(28,25,20,0) 74%)"
        : "linear-gradient(270deg, rgba(28,25,20,0.66) 0%, rgba(28,25,20,0.3) 44%, rgba(28,25,20,0) 74%)" }} />
      <div style={{ position: "relative", minHeight: "inherit", display: "flex", alignItems: "flex-end", justifyContent: left ? "flex-start" : "flex-end", padding: "clamp(32px,5vw,72px)" }}>
        <div style={{ maxWidth: 480, color: "#FBF7EF" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <span style={{ ...label(), color: "rgba(255,255,255,0.82)" }}>{kicker}</span>
            <span style={{ width: 22, height: 1, background: "rgba(255,255,255,0.4)" }} />
            <span style={{ ...label(), color: "rgba(255,255,255,0.82)" }}>{season}</span>
          </div>
          <h2 style={{ ...serif, fontWeight: 400, fontSize: "clamp(2rem,3.8vw,3.3rem)", lineHeight: 1.08, letterSpacing: "-0.012em", margin: "0 0 20px", whiteSpace: "pre-line", textShadow: "0 1px 30px rgba(28,25,20,0.4)" }}>{title}</h2>
          <p style={{ fontSize: 15.5, lineHeight: 1.74, color: "rgba(251,247,239,0.9)", maxWidth: 420, margin: 0 }}>{body}</p>
          <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}
            style={{ display: "inline-block", marginTop: 28, fontSize: 11.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "#FBF7EF", textDecoration: "none", borderBottom: "1px solid rgba(251,247,239,0.7)", paddingBottom: 5 }}>
            {cta} ↗
          </a>
        </div>
      </div>
      <div aria-hidden style={{ position: "absolute", top: "clamp(28px,4vw,56px)", [left ? "right" : "left"]: "clamp(28px,4vw,56px)", ...serif, fontSize: "clamp(2.2rem,5vw,4.4rem)", color: "rgba(251,247,239,0.16)", letterSpacing: "0.04em", textTransform: "uppercase", pointerEvents: "none" } as CSSProperties}>{stamp}</div>
    </section>
  );
}

function CarouselBtn({ dir, onClick }: { dir: number; onClick: () => void }) {
  return (
    <button aria-label={dir < 0 ? "Previous" : "Next"} onClick={onClick}
      style={{ width: 42, height: 42, borderRadius: 999, border: `1px solid ${C.line}`, background: C.cream, color: C.ink, cursor: "pointer", fontSize: 16, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {dir < 0 ? "‹" : "›"}
    </button>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string; ext: boolean }[] }) {
  return (
    <div>
      <div style={{ ...label(), color: C.faint, marginBottom: 15 }}>{title}</div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 11 }}>
        {links.map((l) => (
          <li key={l.label}><a href={l.href} target={l.ext ? "_blank" : undefined} rel={l.ext ? "noopener noreferrer" : undefined} style={{ fontSize: 13.5, color: C.soft, textDecoration: "none" }}>{l.label}</a></li>
        ))}
      </ul>
    </div>
  );
}

function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }); } catch { return ""; }
}
