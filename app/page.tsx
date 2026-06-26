"use client";

import { useState, useEffect } from "react";
import type { CSSProperties } from "react";

/* ───────────────────────────── data ─────────────────────────────────────── */
const NAV_LINKS = [
  { label: "Food Planning", href: "#food-planning" },
  { label: "Beverages", href: "#beverages" },
  { label: "Skincare", href: "#skincare" },
  { label: "The Journal", href: "/blog" },
];

const GROVLI_HOME =
  "https://grovli.citigrove.com/?utm_source=citigrove&utm_medium=web&utm_campaign=homepage";
const APP_STORE_URL = "https://apps.apple.com/us/app/grovli/id6760633541";
const GCS_BUCKET = process.env.NEXT_PUBLIC_GCS_BUCKET_URL ?? "";
const HERO_IMG = GCS_BUCKET ? `${GCS_BUCKET}/hero/hero-bg.jpg` : "/hero-bg.jpg";

const STATUS = [
  { label: "Current season", value: "Summer" },
  { label: "New this week", value: "Peach Ginger" },
  { label: "Membership", value: "Open" },
];

const STEPS = [
  { n: "1", body: "Plan your food with Grovli — a personalized plan in under thirty seconds, with the grocery list already written." },
  { n: "2", body: "Pour something good — two-ingredient sparkling water, made in small batches, no sugar and nothing to hide." },
  { n: "3", body: "Care for your skin — seasonal botanicals, formulated with the same patience we bring to the table." },
];

const DRINKS = [
  { name: "Cranberry Lemongrass Apple", note: "Crisp · tart · barely sweet", price: "$25", tone: "#E2B79E" },
  { name: "Lime Rosemary Grapefruit", note: "Bittersweet · herbal", price: "$25", tone: "#C2C6B2" },
  { name: "Mint Blueberry Lime", note: "Cool · bright · clean", price: "$25", tone: "#BFC9CB" },
  { name: "Fennel Apple Spritz", note: "Anise · orchard", price: "$18", tone: "#D8C7AE" },
  { name: "Peach Ginger Sparkler", note: "Warm · golden", price: "$25", tone: "#E6C19A" },
  { name: "Cherry Basil Refresher", note: "Dark fruit · garden", price: "$18", tone: "#CBB3B0" },
];

const CHAPTERS = [
  {
    kicker: "The App", season: "Food Planning", title: "Grovli",
    body: "Our food planning app. A personalized plan in under thirty seconds — across forty cuisines and a dozen ways of eating — with the grocery list already written and a garden you can plan from. Food planning, not just meal planning.",
    cta: "Start food planning", href: GROVLI_HOME, external: true, tone: "#E2B79E",
  },
  {
    kicker: "Skincare", season: "For the season", title: "Made for skin,\nand for the season.",
    body: "Thoughtfully formulated with quality botanicals for your natural radiance — wellness inside and out. The same care we bring to the table, brought to your skin. Seasonal, small-batch, made by people.",
    cta: "Explore skincare", href: "#skincare", external: false, tone: "#C2C6B2",
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
      offers: { "@type": "Offer", price: d.price.replace("$", ""), priceCurrency: "USD", availability: "https://schema.org/InStock" },
    },
  })),
};

/* ── Ffern-register palette: warm, muted, cream/peach/sage + soft ink + coral ── */
const C = {
  cream: "#F1ECE1",
  panel: "#E9E2D3",
  peach: "#E2B79E",
  sage: "#C2C6B2",
  ink: "#3B362D",
  soft: "#7A7263",
  faint: "rgba(59,54,45,0.45)",
  coral: "#C2703E",
  line: "#DAD3C4",
};
const serif: CSSProperties = { fontFamily: "var(--font-playfair), serif" };
const SIDEBAR = 268;

function label(dark = false): CSSProperties {
  return { fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase", color: dark ? "rgba(59,54,45,0.5)" : C.soft };
}
function Dot() {
  return <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 999, background: C.coral, verticalAlign: "middle", marginLeft: 9 }} />;
}

/* ─────────────────────────────── page ───────────────────────────────────── */
export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [posts, setPosts] = useState<{ title: string; summary: string; slug: string; published_at: string }[]>([]);
  const [email, setEmail] = useState("");
  const [subState, setSubState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [subMsg, setSubMsg] = useState("");

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_DOCUMENT_API_URL || "https://grovli-document-api-public-uyply7jkca-uc.a.run.app";
    fetch(`${base}/public/categories/blog?limit=3`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setPosts((d.items || []).slice(0, 3)))
      .catch(() => {});
  }, []);

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
        <a href="#top" style={{ ...serif, fontSize: 27, color: C.ink, textDecoration: "none", letterSpacing: "0.01em" }}>CitiGrove</a>
        <div style={{ marginTop: 38, display: "flex", flexDirection: "column", gap: 18 }}>
          {STATUS.map((s) => (
            <div key={s.label}>
              <div style={label()}>{s.label}</div>
              <div style={{ marginTop: 6, display: "inline-block", fontSize: 12, letterSpacing: "0.04em", color: C.ink, background: C.panel, borderRadius: 4, padding: "5px 11px" }}>
                {s.value}{s.value === "Open" ? <Dot /> : null}
              </div>
            </div>
          ))}
        </div>
        <nav style={{ marginTop: 44, display: "flex", flexDirection: "column", gap: 13 }}>
          {NAV_LINKS.map((l) => (
            <a key={l.label} href={l.href} style={{ fontSize: 13.5, color: C.ink, textDecoration: "none" }}>{l.label}</a>
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
          <a href="#top" style={{ ...serif, fontSize: 22, color: C.ink, textDecoration: "none" }}>CitiGrove</a>
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
          Free shipping over $50 · Made in small batches
        </div>

        {/* Hero — warm peach panel + the concierge steps */}
        <section style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", borderBottom: `1px solid ${C.line}` }}>
          <div className="cg-hero" style={{ background: C.peach }}>
            <div style={{ padding: "clamp(56px,8vw,108px) clamp(28px,5vw,72px)" }}>
              <div style={label()}>The CitiGrove House</div>
              <h1 style={{ ...serif, fontWeight: 400, fontSize: "clamp(2rem,3.6vw,3.4rem)", lineHeight: 1.16, letterSpacing: "-0.01em", margin: "20px 0 0", maxWidth: 620 }}>
                A food-first wellness house — small-batch, seasonal, and made by people.
              </h1>
              <p style={{ marginTop: 22, maxWidth: 440, fontSize: 15.5, lineHeight: 1.7, color: "rgba(59,54,45,0.78)" }}>
                It begins with Grovli, our food planning app, and grows into sparkling drinks and skincare. Three small good things, in season, all year.
              </p>
            </div>
          </div>
          <div style={{ background: C.cream, padding: "clamp(40px,5vw,64px) clamp(28px,5vw,72px)" }}>
            <div style={label()}>How the house works</div>
            <ol style={{ listStyle: "none", margin: "26px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 22, maxWidth: 560 }}>
              {STEPS.map((s) => (
                <li key={s.n} style={{ display: "flex", gap: 18 }}>
                  <span style={{ ...serif, fontSize: 17, color: C.coral, lineHeight: 1.4 }}>{s.n}</span>
                  <span style={{ fontSize: 15, lineHeight: 1.65, color: C.ink }}>{s.body}</span>
                </li>
              ))}
            </ol>
            <a href={GROVLI_HOME} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 34, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: C.cream, background: C.ink, padding: "15px 30px", borderRadius: 2, textDecoration: "none" }}>
              Start food planning<Dot />
            </a>
          </div>
        </section>

        {/* Full-bleed lifestyle band */}
        <div role="img" aria-label="CitiGrove" style={{ height: "clamp(280px,42vw,520px)", background: `${C.sage} url(${HERO_IMG}) center / cover no-repeat`, borderBottom: `1px solid ${C.line}` }} />

        {/* Manifesto */}
        <section style={{ padding: "clamp(80px,10vw,150px) clamp(28px,6vw,96px)", borderBottom: `1px solid ${C.line}`, textAlign: "center" }}>
          <div style={label()}>Our belief</div>
          <p style={{ ...serif, fontWeight: 400, fontSize: "clamp(1.5rem,2.8vw,2.5rem)", lineHeight: 1.36, letterSpacing: "-0.005em", margin: "26px auto 0", maxWidth: 880 }}>
            Eating well shouldn&apos;t be a project. It should be the most natural thing — accessible, personal, and
            deeply human. So we make the tools, the rituals, and the small good things that let it feel that way.
          </p>
        </section>

        {/* Chapter — Grovli */}
        <div id="food-planning"><Chapter chapter={CHAPTERS[0]} /></div>

        {/* Seasonal beverages — full-bleed-tone cards */}
        <section id="beverages" style={{ padding: "clamp(70px,8vw,120px) clamp(28px,5vw,72px)", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: "clamp(34px,4vw,52px)" }}>
            <div>
              <div style={label()}>In season · Beverages</div>
              <h2 style={{ ...serif, fontWeight: 400, fontSize: "clamp(1.7rem,3.2vw,2.7rem)", lineHeight: 1.1, margin: "16px 0 0" }}>Two ingredients, nothing to hide.</h2>
            </div>
            <a href="#beverages" style={{ ...label(), color: C.coral, textDecoration: "none", whiteSpace: "nowrap" }}>Shop all flavours ↗</a>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(248px,1fr))", gap: "clamp(16px,1.6vw,26px)" }}>
            {DRINKS.map((d) => (
              <a key={d.name} href="#beverages" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                <div style={{ aspectRatio: "4 / 5", background: d.tone, borderRadius: 3, display: "flex", alignItems: "flex-end", padding: 20 }}>
                  <span style={{ ...label(), color: "rgba(59,54,45,0.55)" }}>Sparkling</span>
                </div>
                <div style={{ ...serif, fontSize: 17, lineHeight: 1.25, marginTop: 16 }}>{d.name}</div>
                <div style={{ fontSize: 12.5, color: C.soft, marginTop: 5 }}>{d.note}</div>
                <div style={{ fontSize: 13.5, marginTop: 9 }}>{d.price}</div>
              </a>
            ))}
          </div>
        </section>

        {/* Chapter — Skincare */}
        <div id="skincare"><Chapter chapter={CHAPTERS[1]} flip /></div>

        {/* Journal */}
        <section style={{ padding: "clamp(70px,8vw,120px) clamp(28px,5vw,72px)", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: "clamp(34px,4vw,52px)" }}>
            <div>
              <div style={label()}>The Journal</div>
              <h2 style={{ ...serif, fontWeight: 400, fontSize: "clamp(1.7rem,3.2vw,2.7rem)", lineHeight: 1.1, margin: "16px 0 0" }}>Notes from the table.</h2>
            </div>
            <a href="/blog" style={{ ...label(), color: C.coral, textDecoration: "none", whiteSpace: "nowrap" }}>Read the Journal ↗</a>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))", gap: "clamp(26px,3vw,44px)" }}>
            {(posts.length ? posts : ([null, null, null] as null[])).map((p, i) =>
              p ? (
                <a key={p.slug} href={`/blog/${p.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ aspectRatio: "3 / 2", background: i % 2 ? C.sage : C.peach, borderRadius: 3, marginBottom: 18 }} />
                  <div style={{ ...label(), color: C.faint }}>{fmtDate(p.published_at)}</div>
                  <div style={{ ...serif, fontSize: 20, lineHeight: 1.25, margin: "12px 0 10px" }}>{p.title}</div>
                  <div style={{ fontSize: 14, color: C.soft, lineHeight: 1.6 }}>{p.summary}</div>
                </a>
              ) : (
                <div key={i} style={{ opacity: 0.5 }}>
                  <div style={{ aspectRatio: "3 / 2", background: C.panel, borderRadius: 3, marginBottom: 18 }} />
                  <div style={{ height: 10, width: 90, background: C.line, marginBottom: 12 }} />
                  <div style={{ height: 18, background: C.line, width: "80%" }} />
                </div>
              )
            )}
          </div>
        </section>

        {/* Membership / first order */}
        <section style={{ background: C.peach, padding: "clamp(80px,9vw,140px) clamp(28px,6vw,96px)", textAlign: "center" }}>
          <div style={label()}>Pull up a chair</div>
          <h2 style={{ ...serif, fontWeight: 400, fontSize: "clamp(1.8rem,3.4vw,2.9rem)", lineHeight: 1.16, margin: "20px 0 14px" }}>10% off your first order.</h2>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(59,54,45,0.74)", maxWidth: 440, margin: "0 auto 32px" }}>
            One short, useful note every few weeks — the food thinking we&apos;d send a friend. Join the house and we&apos;ll send your code.
          </p>
          {subState === "done" ? (
            <p style={{ ...serif, fontSize: "1.2rem", color: C.ink }}>{subMsg}</p>
          ) : (
            <form onSubmit={handleSubscribe} style={{ display: "flex", gap: 10, maxWidth: 460, margin: "0 auto", flexWrap: "wrap", justifyContent: "center" }}>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email address" aria-label="Email"
                style={{ flex: "1 1 230px", background: "rgba(255,255,255,0.5)", border: `1px solid rgba(59,54,45,0.2)`, borderRadius: 2, padding: "14px 18px", fontSize: 14.5, color: C.ink, outline: "none" }} />
              <button type="submit" disabled={subState === "loading"}
                style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: C.cream, background: C.ink, border: "none", borderRadius: 2, padding: "14px 28px", cursor: "pointer" }}>
                {subState === "loading" ? "Sending…" : "Join"}
              </button>
            </form>
          )}
          {subState === "error" && <p style={{ marginTop: 14, fontSize: 13, color: "#8A3D24" }}>{subMsg}</p>}
        </section>

        {/* Footer */}
        <footer style={{ background: C.cream, padding: "clamp(48px,6vw,80px) clamp(28px,5vw,72px) 40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 40 }}>
            <div style={{ maxWidth: 300 }}>
              <div style={{ ...serif, fontSize: 24, marginBottom: 14 }}>CitiGrove</div>
              <p style={{ fontSize: 13.5, color: C.soft, lineHeight: 1.65 }}>A food-first wellness house. Eat good, look good, feel good.</p>
            </div>
            <div style={{ display: "flex", gap: "clamp(36px,5vw,80px)", flexWrap: "wrap" }}>
              <FooterCol title="The House" links={[{ label: "Food Planning", href: GROVLI_HOME, ext: true }, { label: "Beverages", href: "#beverages", ext: false }, { label: "Skincare", href: "#skincare", ext: false }, { label: "The Journal", href: "/blog", ext: false }]} />
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

      <style>{`.cg-main{margin-left:0}@media(min-width:1024px){.cg-main{margin-left:${SIDEBAR}px}.cg-hero{min-height:clamp(360px,46vw,560px);display:flex;align-items:center}}`}</style>
    </div>
  );
}

/* ─────────────────────────── components ──────────────────────────────────── */
function Chapter({ chapter, flip }: { chapter: (typeof CHAPTERS)[number]; flip?: boolean }) {
  const text = (
    <div style={{ flex: "1 1 380px", minWidth: 0, padding: "clamp(56px,7vw,110px) clamp(28px,4vw,64px)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
        <span style={label()}>{chapter.kicker}</span>
        <span style={{ width: 22, height: 1, background: C.line }} />
        <span style={label()}>{chapter.season}</span>
      </div>
      <h2 style={{ ...serif, fontWeight: 400, fontSize: "clamp(1.9rem,3.6vw,3.1rem)", lineHeight: 1.1, letterSpacing: "-0.01em", margin: "0 0 22px", whiteSpace: "pre-line" }}>{chapter.title}</h2>
      <p style={{ fontSize: 15.5, lineHeight: 1.75, color: C.soft, maxWidth: 460, margin: 0 }}>{chapter.body}</p>
      <a href={chapter.href} target={chapter.external ? "_blank" : undefined} rel={chapter.external ? "noopener noreferrer" : undefined}
        style={{ display: "inline-block", marginTop: 30, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: C.ink, textDecoration: "none", borderBottom: `1px solid ${C.ink}`, paddingBottom: 5 }}>
        {chapter.cta} ↗
      </a>
    </div>
  );
  const visual = <div style={{ flex: "1 1 360px", minHeight: "clamp(300px,34vw,500px)", background: chapter.tone }} />;
  return (
    <section style={{ borderBottom: `1px solid ${C.line}` }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", flexDirection: flip ? "row-reverse" : "row" }}>
        {text}
        {visual}
      </div>
    </section>
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
