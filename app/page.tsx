"use client";

import { useState, useEffect, useRef } from "react";

/* ─────────────────────────────── data ────────────────────────────────────── */
const NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "Food Planning", href: "#food-planning" },
  { label: "Beverages", href: "#beverages" },
  { label: "Skincare", href: "#skincare" },
  { label: "Journal", href: "/blog" },
];

/* Grovli — the food planning app. Every primary CTA funnels here. */
const GROVLI_HOME =
  "https://grovli.citigrove.com/?utm_source=citigrove&utm_medium=web&utm_campaign=homepage";
const APP_STORE_URL = "https://apps.apple.com/us/app/grovli/id6760633541";
/* The onboarding "how to use" explainer — a portrait phone recording (443:960,
   ~26s), transcoded from the master .mov in GCS to Mux (public playback). The
   hero plays it as an ambient, blurred-fill background. */
const MUX_PLAYBACK_ID = "3Vt3C02UTX6sUC7Mlt9wsEZ4vRdZ6oYmmHsg01WAoGey8";
const HERO_VIDEO_MP4 = `https://stream.mux.com/${MUX_PLAYBACK_ID}/highest.mp4`;
const HERO_VIDEO_POSTER = `https://image.mux.com/${MUX_PLAYBACK_ID}/thumbnail.jpg`;

const DIET_TYPES = [
  { label: "Balanced", desc: "Complete nutrition across all food groups." },
  { label: "Vegan", desc: "100% plant-based, whole food approach." },
  { label: "Vegetarian", desc: "Plant-forward with flexibility." },
  { label: "Mediterranean", desc: "Heart-healthy, rich in omega-3s." },
  { label: "Keto", desc: "Low-carb, high-fat, steady energy." },
  { label: "Paleo", desc: "Whole foods, the way we used to eat." },
];

const DRINKS = [
  { name: "Cranberry Lemongrass Apple", price: "$25" },
  { name: "Lime Rosemary Grapefruit", price: "$25" },
  { name: "Mint Blueberry Lime", price: "$25" },
  { name: "Fennel Apple Spritz", price: "$18" },
  { name: "Peach Ginger Sparkler", price: "$25" },
  { name: "Cherry Basil Refresher", price: "$18" },
  { name: "Kiwi Lime Mint Refresher", price: "$25" },
];

/* Grovli's app flow — what happens after you tap "Start food planning". */
const PROCESS = [
  { n: "1", title: "Tell Grovli about you.", body: "A 60-second profile — your goals, your diet, your kitchen, and the food you actually like to eat." },
  { n: "2", title: "Your food plan, in seconds.", body: "Grovli's AI builds a personalized plan across 40+ cuisines and 12+ dietary modes, usually in under 30 seconds." },
  { n: "3", title: "Shop without thinking.", body: "Your grocery list builds itself, dedupes against your Pantry, and syncs straight to Instacart." },
  { n: "4", title: "Grow it, cook it, repeat.", body: "Track your garden in The Grove and feed your harvest back into next week's plan. Food planning, full circle." },
];

/* Reflects what grovli.citigrove.com is — the real feature set. */
const FEATURES = [
  { name: "Plan", body: "AI food plans in under 30 seconds — 40+ cuisines, 12+ dietary modes." },
  { name: "The Grove", body: "Garden-to-plate planning: grow it, track the harvest, cook it." },
  { name: "Pantry", body: "Know what you already have — scan a barcode or add it by hand." },
  { name: "Grocery", body: "A smart list that dedupes against your pantry and syncs to Instacart." },
  { name: "Nutrition Advisor", body: "An AI chat that refines your plan and answers the food questions." },
  { name: "Saved Meals", body: "Your library of the recipes you love, ready to drop into any week." },
  { name: "Macros", body: "Calorie and macro targets — automatic, or dialed in by hand." },
  { name: "Integrations", body: "Sync with Withings, WHOOP, and Garmin so your plan reads your body." },
];

const BELIEFS = [
  { label: "Built by people.", body: "Every plan, every flavor, every formula is shaped by real humans who care about how you feel." },
  { label: "For people.", body: "We exist for the person who wants to feel good — not just look healthy on a feed." },
  { label: "Powered by science.", body: "Food planning and AI working together, so the system gets smarter with every person it serves." },
];

const SERVICES = [
  { tag: "01 · Food Planning", title: "The Grovli\nApp", body: "AI food planning — personalized plans in seconds, a smart grocery list, a pantry, and The Grove for garden-to-plate. Food planning, not just meal planning.", accent: "#1E3328", textColor: "#FAFAF6", link: GROVLI_HOME, external: true },
  { tag: "02 · Beverages", title: "Sparkling\nBeverages", body: "Two ingredients. Sparkling water + natural extracts. No sugar. No additives. Seven flavors crafted to taste clean and feel good.", accent: "#FAFAF6", textColor: "#1A1916", link: "#beverages", external: false },
  { tag: "03 · Skincare", title: "Natural\nSkincare", body: "Thoughtfully formulated with quality ingredients for your natural radiance. Holistic wellness, inside and out.", accent: "#FAFAF6", textColor: "#1A1916", link: "#skincare", external: false },
  { tag: "04 · The Journal", title: "Stories &\nFood Planning", body: "Essays on gardening, hydroponics, grocery costs, and eating well in 2026 — the thinking behind everything we make.", accent: "#FAFAF6", textColor: "#1A1916", link: "/blog", external: false },
];

const GCS_BUCKET = process.env.NEXT_PUBLIC_GCS_BUCKET_URL ?? "";

/* hero image: use GCS URL in production, local fallback for dev */
const HERO_IMG = GCS_BUCKET ? `${GCS_BUCKET}/hero/hero-bg.jpg` : "/hero-bg.jpg";

/* ─────────────────────────── component ───────────────────────────────────── */
export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Hero ambient video: muted autoplay (browser policy) by default; the sound
  // toggle unmutes the sharp center copy on a user gesture.
  const [soundOn, setSoundOn] = useState(false);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  // Recent Journal posts for the homepage teaser, fetched client-side from the
  // public document-api (which CORS-allows citigrove.com). The section header +
  // "Read the Journal" button always render statically, so the blog is visible
  // even before/without this fetch.
  const [journalPosts, setJournalPosts] = useState<
    { title: string; summary: string; slug: string; published_at: string }[]
  >([]);

  // Homepage newsletter capture → /api/subscribe (Firebase Function proxy to
  // grovli-email-api). source="citigrove_homepage" fires the welcome email.
  const [email, setEmail] = useState("");
  const [subState, setSubState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [subMsg, setSubMsg] = useState("");

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const base =
      process.env.NEXT_PUBLIC_DOCUMENT_API_URL ||
      "https://grovli-document-api-public-uyply7jkca-uc.a.run.app";
    fetch(`${base}/public/categories/blog?limit=3`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setJournalPosts((d.items || []).slice(0, 3)))
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

  const S = {
    label: { fontSize: "0.6875rem", letterSpacing: "0.22em", textTransform: "uppercase" as const, color: "#5C7A5E", fontWeight: 600 },
    labelDark: { fontSize: "0.6875rem", letterSpacing: "0.22em", textTransform: "uppercase" as const, color: "rgba(250,250,246,0.4)", fontWeight: 600 },
    serif: { fontFamily: "var(--font-playfair), serif" },
  };

  return (
    <div style={{ background: "#FAFAF6", color: "#1A1916", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>

      {/* ══ NAV ═══════════════════════════════════════════════════════════════ */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        transition: "all 0.4s ease",
        background: scrolled ? "rgba(250,250,246,0.93)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid #E2DDD5" : "1px solid transparent",
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 clamp(20px,5vw,40px)", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>

          <span style={{ ...S.serif, fontSize: "1.25rem", fontWeight: 700, letterSpacing: "0.02em", color: "#1A1916" }}>
            Citi<span style={{ color: "#5C7A5E" }}>Grove</span>
          </span>

          <nav className="hidden md:flex" style={{ gap: 36 }}>
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href}
                style={{ fontSize: "0.8125rem", color: "#6B6660", letterSpacing: "0.01em", textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#1A1916")}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#6B6660")}>
                {l.label}
              </a>
            ))}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a href={GROVLI_HOME} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: "0.8125rem", padding: "10px 22px", borderRadius: 100, background: "#1E3328", color: "#FAFAF6", textDecoration: "none", letterSpacing: "0.02em", transition: "background 0.2s", whiteSpace: "nowrap" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#2A4A38")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#1E3328")}>
              Start food planning
            </a>

            <button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "8px", display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ display: "block", width: 22, height: 1.5, background: "#1A1916", transition: "all 0.3s", transform: mobileMenuOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
              <span style={{ display: "block", width: 22, height: 1.5, background: "#1A1916", transition: "all 0.3s", opacity: mobileMenuOpen ? 0 : 1 }} />
              <span style={{ display: "block", width: 22, height: 1.5, background: "#1A1916", transition: "all 0.3s", transform: mobileMenuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div style={{ background: "rgba(250,250,246,0.97)", backdropFilter: "blur(16px)", borderTop: "1px solid #E2DDD5", padding: "24px clamp(20px,5vw,40px)" }}>
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{ display: "block", padding: "12px 0", fontSize: "1rem", color: "#1A1916", textDecoration: "none", borderBottom: "1px solid #E2DDD5" }}>
                {l.label}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <section style={{ minHeight: "100svh", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: `0 clamp(20px,5vw,40px) clamp(60px,8vw,100px)`, position: "relative", overflow: "hidden", backgroundColor: "#F5F0E8", backgroundImage: `url(${HERO_IMG})`, backgroundSize: "cover", backgroundPosition: "center" }}>

        {/* Ambient backdrop: a heavily blurred, scaled copy of the app demo
            fills the whole hero behind the headline. The sharp, fully-visible
            copy lives in the right column below. Muted autoplay + loop; on
            reduced-motion this hides (CSS) and the section's HERO_IMG bg shows. */}
        <video aria-hidden className="hero-ambient-video" autoPlay muted loop playsInline preload="metadata" poster={HERO_VIDEO_POSTER}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.18)", filter: "blur(40px) saturate(1.15)", zIndex: 0 }}>
          <source src={HERO_VIDEO_MP4} type="video/mp4" />
        </video>

        <div style={{
          position: "absolute", inset: 0, zIndex: 1,
          background: "linear-gradient(160deg, rgba(245,240,232,0.30) 0%, rgba(245,240,232,0.54) 26%, rgba(245,240,232,0.88) 62%, #F5F0E8 100%)",
        }} />

        <div style={{ position: "absolute", top: "clamp(84px,12vh,108px)", left: "clamp(20px,5vw,40px)", zIndex: 3 }}>
          <span style={{ ...S.label, textShadow: "0 1px 12px rgba(245,240,232,0.6)" }}>Food Planning · Wellness · Community</span>
        </div>

        <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%", position: "relative", zIndex: 3, display: "flex", alignItems: "flex-end", gap: "clamp(28px,4vw,72px)", flexWrap: "wrap" }}>
          {/* Left column — headline, copy, CTAs */}
          <div style={{ flex: "1 1 440px", minWidth: 0 }}>
          <div style={{ marginBottom: "clamp(20px,3vw,28px)" }}>
            <span style={{ display: "inline-block", fontSize: "0.75rem", letterSpacing: "0.14em", border: "1px solid #C8C2BA", borderRadius: 100, padding: "7px 16px", color: "#6B6660" }}>
              Est. 2026 · Food Planning · AI‑Powered
            </span>
          </div>

          <h1 style={{ ...S.serif, fontSize: "clamp(3rem,10.5vw,10rem)", fontWeight: 800, lineHeight: 0.9, letterSpacing: "-0.02em", color: "#1A1916", marginBottom: "clamp(32px,5vw,56px)" }}>
            <span style={{ display: "block" }}>Eat Good.</span>
            <span style={{ display: "block", color: "#5C7A5E" }}>Look Good.</span>
            <span style={{ display: "block", WebkitTextStroke: "1.5px #C8C2BA", color: "transparent" }}>Feel Good.</span>
          </h1>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "clamp(20px,4vw,32px)" }}>
            <p style={{ maxWidth: 440, fontSize: "clamp(0.9375rem,1.5vw,1.0625rem)", color: "#6B6660", lineHeight: 1.75, flex: "1 1 280px" }}>
              A food-first wellness ecosystem built by humans, for humans. It starts with{" "}
              <strong style={{ color: "#1A1916", fontWeight: 600 }}>Grovli</strong>, our AI food planning
              app — then clean sparkling beverages and skincare. All connected, all yours.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", flexShrink: 0 }}>
              <a href="#about"
                style={{ fontSize: "0.875rem", padding: "13px 28px", borderRadius: 100, border: "1px solid #C8C2BA", color: "#1A1916", textDecoration: "none", transition: "all 0.2s", whiteSpace: "nowrap" }}>
                Explore the ecosystem
              </a>
              <a href={GROVLI_HOME} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: "0.875rem", padding: "13px 28px", borderRadius: 100, background: "#1E3328", color: "#FAFAF6", textDecoration: "none", transition: "background 0.2s", whiteSpace: "nowrap" }}>
                Start food planning
              </a>
            </div>
          </div>
          </div>
          {/* Right column — the app screen: neat + fully visible, above the
              gradient so it isn't dimmed. On reduced-motion the video hides
              (CSS) and the frame's poster background shows. */}
          <div style={{ flex: "1 1 300px", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div style={{ aspectRatio: "443 / 960", height: "clamp(320px, 52vh, 520px)", width: "auto", maxWidth: "100%", borderRadius: 32, overflow: "hidden", boxShadow: "0 30px 80px rgba(26,25,22,0.24)", border: "1px solid rgba(255,255,255,0.5)", background: `#1A1916 url(${HERO_VIDEO_POSTER}) center / cover` }}>
              <video ref={heroVideoRef} className="hero-ambient-video" autoPlay muted loop playsInline preload="auto" poster={HERO_VIDEO_POSTER}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}>
                <source src={HERO_VIDEO_MP4} type="video/mp4" />
              </video>
            </div>
          </div>
        </div>

        {/* Sound toggle — unmutes the sharp center video on a user gesture
            (autoplay must start muted). Top-right, mirroring the eyebrow label. */}
        <button type="button"
          onClick={() => { const v = heroVideoRef.current; if (!v) return; const next = !soundOn; v.muted = !next; if (next) v.play?.().catch(() => {}); setSoundOn(next); }}
          aria-pressed={soundOn}
          aria-label={soundOn ? "Mute the hero video" : "Play the hero video with sound"}
          style={{ position: "absolute", top: "clamp(92px,12vh,108px)", right: "clamp(20px,5vw,40px)", zIndex: 3, display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 100, cursor: "pointer", background: "rgba(26,25,22,0.5)", color: "#FAFAF6", border: "1px solid rgba(250,250,246,0.25)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", fontSize: "0.6875rem", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>
          {soundOn ? "🔊 Sound on" : "🔈 Watch with sound"}
        </button>
      </section>

      {/* ══ TICKER ════════════════════════════════════════════════════════════ */}
      <div style={{ background: "#1E3328", padding: "14px 0", overflow: "hidden" }}>
        <div className="animate-marquee" style={{ display: "flex", whiteSpace: "nowrap" }}>
          {Array.from({ length: 3 }, (_, bloc) =>
            ["FOOD PLANNING", "THE GROVE", "SPARKLING BEVERAGES", "SKINCARE", "AI POWERED",
             "GROCERY SYNC", "GROW YOUR OWN", "HOLISTIC WELLNESS"].map((t, i) => (
              <span key={`${bloc}-${i}`}
                style={{ display: "inline-flex", alignItems: "center", gap: 24, padding: "0 24px",
                  fontSize: "0.6875rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(250,250,246,0.5)", fontWeight: 600 }}>
                {t}
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(92,122,94,0.6)", flexShrink: 0 }} />
              </span>
            ))
          )}
        </div>
      </div>

      {/* ══ BELIEFS ═══════════════════════════════════════════════════════════ */}
      <section id="about" style={{ background: "#FAFAF6", padding: "clamp(72px,10vw,120px) clamp(20px,5vw,40px)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <p style={{ ...S.label, marginBottom: "clamp(36px,6vw,56px)" }}>Our Beliefs</p>

          <p style={{ ...S.serif, fontSize: "clamp(1.6rem,4vw,3.25rem)", fontWeight: 500, lineHeight: 1.35, color: "#1A1916", maxWidth: 800, borderTop: "1px solid #E2DDD5", paddingTop: 40, marginBottom: "clamp(56px,8vw,100px)" }}>
            &quot;We believe eating well shouldn&apos;t be a project. It&apos;s a practice — one that
            should be <em style={{ fontStyle: "italic", color: "#5C7A5E" }}>accessible, personal,</em> and
            deeply human.&quot;
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 1, background: "#E2DDD5" }}>
            {BELIEFS.map((b, i) => (
              <div key={i}
                style={{ background: "#FAFAF6", padding: "clamp(32px,4vw,48px) clamp(24px,3vw,36px)", transition: "background 0.25s" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#F0EBE1")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#FAFAF6")}>
                <span style={{ fontSize: "0.6875rem", letterSpacing: "0.2em", color: "#B89A72", fontWeight: 600, display: "block", marginBottom: 20 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 style={{ ...S.serif, fontSize: "clamp(1.25rem,2vw,1.5rem)", fontWeight: 600, marginBottom: 14, color: "#1A1916" }}>{b.label}</h3>
                <p style={{ fontSize: "0.9375rem", color: "#6B6660", lineHeight: 1.7 }}>{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ ECOSYSTEM ═════════════════════════════════════════════════════════ */}
      <section id="skincare" style={{ background: "#F0EBE1", padding: "clamp(72px,10vw,120px) clamp(20px,5vw,40px)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "clamp(16px,3vw,24px)", marginBottom: "clamp(48px,7vw,72px)" }}>
            <div>
              <p style={{ ...S.label, marginBottom: 16 }}>The Ecosystem</p>
              <h2 style={{ ...S.serif, fontSize: "clamp(2rem,5.5vw,4.25rem)", fontWeight: 700, lineHeight: 1.05, color: "#1A1916" }}>
                Everything you need,<br />
                <span style={{ color: "#5C7A5E" }}>in one place.</span>
              </h2>
            </div>
            <p style={{ maxWidth: 320, fontSize: "0.9375rem", color: "#6B6660", lineHeight: 1.7 }}>
              CitiGrove isn&apos;t a single product — it&apos;s a connected wellness system, anchored by the Grovli food planning app.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 14 }}>
            {SERVICES.map((card, i) => (
              <a key={i} href={card.link}
                target={card.external ? "_blank" : undefined}
                rel={card.external ? "noopener noreferrer" : undefined}
                style={{
                  display: "flex", flexDirection: "column", justifyContent: "space-between",
                  background: card.accent, borderRadius: 20,
                  padding: "clamp(28px,3.5vw,40px) clamp(24px,3vw,36px)",
                  minHeight: "clamp(260px,30vw,320px)", textDecoration: "none",
                  border: card.accent === "#FAFAF6" ? "1px solid #E2DDD5" : "none",
                  transition: "transform 0.25s, box-shadow 0.25s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 48px rgba(26,25,22,0.09)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
                <span style={{ fontSize: "0.6875rem", letterSpacing: "0.18em", textTransform: "uppercase", color: card.textColor, opacity: 0.45, fontWeight: 600 }}>{card.tag}</span>
                <div>
                  <h3 style={{ ...S.serif, fontSize: "clamp(1.5rem,2.5vw,1.75rem)", fontWeight: 700, lineHeight: 1.15, color: card.textColor, marginBottom: 14, whiteSpace: "pre-line" }}>{card.title}</h3>
                  <p style={{ fontSize: "0.875rem", color: card.textColor, opacity: 0.65, lineHeight: 1.7 }}>{card.body}</p>
                </div>
                <span style={{ fontSize: "1.25rem", color: card.textColor, opacity: 0.4, alignSelf: "flex-end" }}>→</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FOOD PLANNING (GROVLI) ════════════════════════════════════════════ */}
      <section id="food-planning" style={{ background: "#FAFAF6", padding: "clamp(72px,10vw,120px) clamp(20px,5vw,40px)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: "clamp(48px,7vw,80px)", alignItems: "start" }}>

            <div>
              <p style={{ ...S.label, marginBottom: 24 }}>Meet Grovli · Food Planning</p>
              <h2 style={{ ...S.serif, fontSize: "clamp(2rem,5vw,4rem)", fontWeight: 700, lineHeight: 1.08, color: "#1A1916", marginBottom: 24 }}>
                Food planning,<br />not just meal planning.
              </h2>
              <p style={{ fontSize: "clamp(0.9375rem,1.5vw,1.0625rem)", color: "#6B6660", lineHeight: 1.75, marginBottom: 16 }}>
                <a href={GROVLI_HOME} target="_blank" rel="noopener noreferrer" style={{ color: "#1A1916", fontWeight: 600, textDecoration: "none", borderBottom: "1px solid #C8C2BA" }}>Grovli</a> is the
                app at the center of CitiGrove. Meal planning picks recipes. Food planning is the
                whole arc — what you grow, what you buy, what&apos;s in the pantry, and what
                lands on the table tonight.
              </p>
              <p style={{ fontSize: "0.9375rem", color: "#6B6660", lineHeight: 1.75, marginBottom: 40, opacity: 0.85 }}>
                A licensed approach to nutrition, an AI that builds your plan in seconds, and a
                grocery list that&apos;s already done. The more you use it, the more it sounds like you.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 40 }}>
                {DIET_TYPES.map((d) => (
                  <button key={d.label} title={d.desc}
                    style={{ padding: "9px 20px", borderRadius: 100, fontSize: "0.8125rem", border: "1px solid #C8C2BA", background: "transparent", color: "#6B6660", cursor: "pointer", transition: "all 0.2s" }}
                    onMouseEnter={(e) => { const el = e.currentTarget; el.style.background = "#1E3328"; el.style.color = "#FAFAF6"; el.style.borderColor = "#1E3328"; }}
                    onMouseLeave={(e) => { const el = e.currentTarget; el.style.background = "transparent"; el.style.color = "#6B6660"; el.style.borderColor = "#C8C2BA"; }}>
                    {d.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a href={GROVLI_HOME} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "15px 32px", borderRadius: 100, background: "#1E3328", color: "#FAFAF6", textDecoration: "none", fontSize: "0.875rem", letterSpacing: "0.02em" }}>
                  Start my plan →
                </a>
                <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "15px 28px", borderRadius: 100, border: "1px solid #C8C2BA", color: "#1A1916", textDecoration: "none", fontSize: "0.875rem" }}>
                  Get the iPhone app
                </a>
              </div>
            </div>

            {/* App preview — a still from the walkthrough that now headlines the
                hero, so the section keeps its two-column balance without
                re-embedding the video. */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 4 }}>
              <img
                src={`${HERO_VIDEO_POSTER}?width=560`}
                alt="The Grovli app — a personalized food plan in seconds"
                loading="lazy"
                style={{ width: "min(280px, 80%)", height: "auto", display: "block", borderRadius: 30, border: "1px solid #E2DDD5", boxShadow: "0 26px 70px rgba(26,25,22,0.18)", background: "#1A1916" }}
              />
              <p style={{ fontSize: "0.8125rem", color: "#6B6660", lineHeight: 1.6, marginTop: 16, textAlign: "center", maxWidth: 300 }}>
                Food planning in your pocket — the full walkthrough plays up top.
              </p>
            </div>
          </div>

          {/* Steps */}
          <div style={{ marginTop: "clamp(56px,8vw,88px)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 1, background: "#E2DDD5" }}>
            {PROCESS.map((step, i) => (
              <div key={i} style={{ background: "#FAFAF6", padding: "clamp(28px,3vw,36px) clamp(22px,2.5vw,30px)" }}>
                <span style={{ ...S.serif, fontSize: "1rem", fontWeight: 500, color: "#C8C2BA", display: "block", marginBottom: 14 }}>0{step.n}</span>
                <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "#1A1916", marginBottom: 8 }}>{step.title}</h4>
                <p style={{ fontSize: "0.875rem", color: "#6B6660", lineHeight: 1.7 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ GROVLI FEATURE GRID ═══════════════════════════════════════════════ */}
      <section style={{ background: "#1E3328", padding: "clamp(72px,10vw,110px) clamp(20px,5vw,40px)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 24, marginBottom: "clamp(40px,6vw,64px)" }}>
            <div>
              <p style={{ ...S.labelDark, marginBottom: 16 }}>Inside the App</p>
              <h2 style={{ ...S.serif, fontSize: "clamp(2rem,5vw,3.75rem)", fontWeight: 700, lineHeight: 1.08, color: "#FAFAF6" }}>
                One app for the<br /><span style={{ color: "#90B896" }}>whole food journey.</span>
              </h2>
            </div>
            <a href={GROVLI_HOME} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: "0.875rem", padding: "14px 30px", borderRadius: 100, background: "#FAFAF6", color: "#1E3328", textDecoration: "none", fontWeight: 600, whiteSpace: "nowrap" }}>
              Open Grovli →
            </a>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 250px), 1fr))", gap: 1, background: "rgba(250,250,246,0.08)" }}>
            {FEATURES.map((f) => (
              <div key={f.name} style={{ background: "#1E3328", padding: "clamp(26px,3vw,34px) clamp(22px,2.5vw,28px)" }}>
                <h3 style={{ fontSize: "1.0625rem", fontWeight: 600, color: "#FAFAF6", marginBottom: 10 }}>{f.name}</h3>
                <p style={{ fontSize: "0.875rem", color: "rgba(250,250,246,0.6)", lineHeight: 1.65 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FROM THE JOURNAL ══════════════════════════════════════════════════ */}
      <section id="journal" style={{ background: "#FAFAF6", padding: "clamp(72px,10vw,120px) clamp(20px,5vw,40px)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "clamp(16px,3vw,24px)", marginBottom: "clamp(40px,6vw,64px)" }}>
            <div>
              <p style={{ ...S.label, marginBottom: 16 }}>The Journal</p>
              <h2 style={{ ...S.serif, fontSize: "clamp(2rem,5vw,4rem)", fontWeight: 700, lineHeight: 1.08, color: "#1A1916" }}>
                Stories from<br />the table.
              </h2>
            </div>
            <a href="/blog"
              style={{ fontSize: "0.875rem", padding: "14px 30px", borderRadius: 100, background: "#1E3328", color: "#FAFAF6", textDecoration: "none", fontWeight: 500, whiteSpace: "nowrap" }}>
              Read the Journal →
            </a>
          </div>

          {journalPosts.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 14 }}>
              {journalPosts.map((post) => (
                <a key={post.slug} href={`/blog/${post.slug}`}
                  style={{ display: "flex", flexDirection: "column", gap: 12, background: "#F0EBE1", borderRadius: 20, padding: "clamp(28px,3.5vw,36px) clamp(24px,3vw,32px)", textDecoration: "none", border: "1px solid #E2DDD5", transition: "transform 0.25s, box-shadow 0.25s" }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-4px)"; el.style.boxShadow = "0 12px 48px rgba(26,25,22,0.09)"; }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(0)"; el.style.boxShadow = "none"; }}>
                  <span style={{ fontSize: "0.6875rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#5C7A5E", fontWeight: 600 }}>
                    {new Date(post.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </span>
                  <h3 style={{ ...S.serif, fontSize: "clamp(1.25rem,2vw,1.5rem)", fontWeight: 600, lineHeight: 1.2, color: "#1A1916" }}>{post.title}</h3>
                  <p style={{ fontSize: "0.875rem", color: "#6B6660", lineHeight: 1.65, flex: 1 }}>{post.summary}</p>
                  <span style={{ fontSize: "0.75rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#5C7A5E", fontWeight: 600 }}>Read essay →</span>
                </a>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "clamp(0.9375rem,1.5vw,1.0625rem)", color: "#6B6660", lineHeight: 1.75, maxWidth: 560 }}>
              Essays on food planning, gardening, hydroponics, grocery costs, and eating
              well in 2026 — the thinking behind everything we make.{" "}
              <a href="/blog" style={{ color: "#5C7A5E", textDecoration: "underline" }}>Read the Journal →</a>
            </p>
          )}
        </div>
      </section>

      {/* ══ BEVERAGES ═════════════════════════════════════════════════════════ */}
      <section id="beverages" style={{ background: "#F0EBE1", padding: "clamp(72px,10vw,120px) clamp(20px,5vw,40px)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "clamp(16px,3vw,24px)", marginBottom: "clamp(48px,7vw,72px)" }}>
            <div>
              <p style={{ ...S.label, marginBottom: 16 }}>Sparkling Beverages</p>
              <h2 style={{ ...S.serif, fontSize: "clamp(2rem,5vw,4rem)", fontWeight: 700, lineHeight: 1.08, color: "#1A1916" }}>
                Two ingredients.<br />Nothing to hide.
              </h2>
            </div>
            <p style={{ maxWidth: 340, fontSize: "0.9375rem", color: "#6B6660", lineHeight: 1.7 }}>
              Sparkling water and natural flavor extracts. No sugar, no artificial additives —
              just clean, honest refreshment.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))", gap: 12 }}>
            {DRINKS.map((d, i) => (
              <div key={i}
                style={{ background: "#FAFAF6", borderRadius: 16, padding: "clamp(20px,2.5vw,28px) clamp(16px,2vw,24px)", border: "1px solid transparent", display: "flex", flexDirection: "column", gap: 12, transition: "all 0.2s", cursor: "pointer" }}
                onMouseEnter={(e) => { const el = e.currentTarget; el.style.borderColor = "#C8C2BA"; el.style.boxShadow = "0 4px 24px rgba(26,25,22,0.05)"; }}
                onMouseLeave={(e) => { const el = e.currentTarget; el.style.borderColor = "transparent"; el.style.boxShadow = "none"; }}>
                <div style={{ height: 64, borderRadius: 10, background: `hsl(${(i * 37 + 100) % 360}, 28%, 88%)` }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#1A1916", lineHeight: 1.4 }}>{d.name}</span>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#5C7A5E", flexShrink: 0 }}>{d.price}</span>
                </div>
                <button
                  style={{ marginTop: 4, padding: "9px 0", borderRadius: 100, border: "1px solid #C8C2BA", background: "transparent", fontSize: "0.8rem", color: "#6B6660", cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={(e) => { const el = e.currentTarget; el.style.background = "#1E3328"; el.style.color = "#FAFAF6"; el.style.borderColor = "#1E3328"; }}
                  onMouseLeave={(e) => { const el = e.currentTarget; el.style.background = "transparent"; el.style.color = "#6B6660"; el.style.borderColor = "#C8C2BA"; }}>
                  Add to cart
                </button>
              </div>
            ))}
            <div
              style={{ borderRadius: 16, padding: "clamp(20px,2.5vw,28px)", border: "1px dashed #C8C2BA", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", transition: "background 0.2s", minHeight: 160 }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#FAFAF6")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}>
              <span style={{ fontSize: "1.5rem", color: "#C8C2BA" }}>+</span>
              <span style={{ fontSize: "0.8125rem", color: "#6B6660", textAlign: "center" }}>View all<br />flavors</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══ NEWSLETTER ════════════════════════════════════════════════════════ */}
      <section style={{ background: "#FAFAF6", padding: "clamp(72px,10vw,120px) clamp(20px,5vw,40px)", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <p style={{ ...S.label, marginBottom: 24 }}>Join the Community</p>
          <h2 style={{ ...S.serif, fontSize: "clamp(2rem,6vw,4.5rem)", fontWeight: 700, lineHeight: 1.1, color: "#1A1916", marginBottom: 16 }}>
            10% off your<br />first order.
          </h2>
          <p style={{ fontSize: "clamp(0.9375rem,1.5vw,1rem)", color: "#6B6660", lineHeight: 1.75, marginBottom: 40 }}>
            Join the CitiGrove community for new flavors, food planning tips, and
            early access to everything we&apos;re building.
          </p>
          {subState === "done" ? (
            <p style={{ fontSize: "1.0625rem", color: "#1E3328", fontWeight: 500 }}>{subMsg}</p>
          ) : (
            <form onSubmit={handleSubscribe}
              style={{ display: "flex", gap: 10, maxWidth: 420, margin: "0 auto 16px", flexWrap: "wrap" }}>
              <input type="email" required placeholder="your@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                style={{ flex: "1 1 200px", padding: "14px 20px", borderRadius: 100, border: "1px solid #C8C2BA", background: "#FAFAF6", fontSize: "0.875rem", color: "#1A1916", outline: "none", minWidth: 0 }} />
              <button type="submit" disabled={subState === "loading"}
                style={{ padding: "14px 24px", borderRadius: 100, background: "#1E3328", color: "#FAFAF6", border: "none", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer", flexShrink: 0, opacity: subState === "loading" ? 0.6 : 1 }}>
                {subState === "loading" ? "…" : "Subscribe"}
              </button>
            </form>
          )}
          {subState === "error" && (
            <p style={{ fontSize: "0.8125rem", color: "#B0563B", marginBottom: 8 }}>{subMsg}</p>
          )}
          <p style={{ fontSize: "0.75rem", color: "#C8C2BA" }}>No spam. Unsubscribe any time.</p>
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════════════════════ */}
      <footer id="contact" style={{ background: "#1A1916", padding: "clamp(56px,8vw,80px) clamp(20px,5vw,40px) 36px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: "clamp(36px,5vw,48px)", marginBottom: "clamp(48px,7vw,80px)" }}>
            <div style={{ gridColumn: "span 1" }}>
              <div style={{ ...S.serif, fontSize: "1.5rem", fontWeight: 700, color: "#FAFAF6", marginBottom: 20, letterSpacing: "0.02em" }}>
                Citi<span style={{ color: "#5C7A5E" }}>Grove</span>
              </div>
              <p style={{ fontSize: "0.875rem", color: "rgba(250,250,246,0.38)", lineHeight: 1.75, maxWidth: 280, marginBottom: 20 }}>
                A food-first wellness ecosystem built by humans, for humans. Every product and
                service is designed to help you live vibrantly.
              </p>
              <p style={{ fontSize: "0.8125rem", color: "rgba(250,250,246,0.3)", lineHeight: 1.8 }}>
                123 Bang Street Leviko, CA 8034<br />
                <a href="mailto:info@citigrove.com"
                  style={{ color: "rgba(250,250,246,0.3)", textDecoration: "none", transition: "color 0.2s" }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#5C7A5E")}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "rgba(250,250,246,0.3)")}>
                  info@citigrove.com
                </a>
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: "0.6875rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(250,250,246,0.3)", fontWeight: 600, marginBottom: 24 }}>Pages</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {[["Home", "/"], ["About", "#about"], ["Food Planning", "#food-planning"], ["The Journal", "/blog"], ["Beverages", "#beverages"], ["Contact", "#contact"]].map(([p, href]) => (
                  <li key={p}>
                    <a href={href} style={{ fontSize: "0.875rem", color: "rgba(250,250,246,0.4)", textDecoration: "none", transition: "color 0.2s" }}
                      onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#FAFAF6")}
                      onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "rgba(250,250,246,0.4)")}>
                      {p}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ fontSize: "0.6875rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(250,250,246,0.3)", fontWeight: 600, marginBottom: 24 }}>Food Planning</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {[["Grovli app", GROVLI_HOME], ["The Grove", GROVLI_HOME], ["Grocery sync", GROVLI_HOME], ["Pantry", GROVLI_HOME], ["iPhone app", APP_STORE_URL]].map(([s, href]) => (
                  <li key={s}>
                    <a href={href} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.875rem", color: "rgba(250,250,246,0.4)", textDecoration: "none", transition: "color 0.2s" }}
                      onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#FAFAF6")}
                      onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "rgba(250,250,246,0.4)")}>
                      {s}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(250,250,246,0.06)", paddingTop: 28, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <p style={{ fontSize: "0.75rem", color: "rgba(250,250,246,0.2)" }}>© 2026 CitiGrove. All rights reserved.</p>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {[["Instagram", "https://instagram.com/grovli"], ["Facebook", "https://facebook.com"], ["Twitter", "https://twitter.com"]].map(([label, href]) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: "0.75rem", color: "rgba(250,250,246,0.2)", textDecoration: "none", transition: "color 0.2s" }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "rgba(250,250,246,0.6)")}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "rgba(250,250,246,0.2)")}>
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
