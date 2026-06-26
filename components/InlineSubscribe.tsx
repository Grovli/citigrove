"use client";

/**
 * InlineSubscribe — mid-article email capture block for CitiGrove blog posts.
 *
 * Q10 lock (.claude/funnel-alignment.md in the Grovli repo): "Both
 * sticky CTA + inline email capture". The chat overlay lives on
 * grovli.citigrove.com; from citigrove.com we use a lighter email
 * form because there's no chat infrastructure on this domain yet.
 *
 * POST goes to /api/subscribe (the citigroveSubscribe Firebase Function,
 * since the site is a static export with no Next server runtime), which
 * proxies to grovli-email-api /marketing/subscribe with
 * source="blog_<slug>". That per-post source routes the subscriber to the
 * essay's email mirror + matching marketing workflow
 * (marketing_subscribe._family_for_source) and carries the blog touchpoint
 * into lead_event attribution.
 */

import { useState } from "react";

interface InlineSubscribeProps {
  /** The post slug — embedded as utm_campaign + source metadata so
   *  funnel analysis can see which essay converted. */
  slug: string;
}

type State = "idle" | "submitting" | "success" | "already-subscribed" | "error";

export function InlineSubscribe({ slug }: InlineSubscribeProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "submitting") return;

    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@") || !trimmed.includes(".")) {
      setError("Enter a valid email");
      return;
    }
    setError("");
    setState("submitting");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          // source=blog_<slug> routes the subscriber to this post's email mirror
          // + workflow in email-api (marketing_subscribe._family_for_source).
          source: `blog_${slug.replace(/-/g, "_")}`,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        status?: string;
        message?: string;
      };
      if (data.status === "already_subscribed") {
        setState("already-subscribed");
        setMessage(data.message || "You're already on the list.");
        return;
      }
      if (!res.ok) {
        setState("error");
        setMessage("Something went wrong. Try again?");
        return;
      }
      setState("success");
      setMessage(
        data.message || "Check your inbox — we sent you the first essay."
      );
    } catch {
      setState("error");
      setMessage("Couldn't reach the server. Try again?");
    }
  }

  if (state === "success" || state === "already-subscribed") {
    return (
      <div
        className="rounded-2xl px-7 py-8 text-center"
        style={{ backgroundColor: "#28332C", color: "#F4F2EA" }}
      >
        <div
          className="text-[11px] tracking-[0.22em] uppercase font-semibold mb-3"
          style={{ color: "rgba(244,242,234,0.55)" }}
        >
          You&apos;re in
        </div>
        <p className="text-[17px] leading-[1.5]">{message}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl px-7 py-8"
      style={{ backgroundColor: "#28332C", color: "#F4F2EA" }}
    >
      <div
        className="text-[11px] tracking-[0.22em] uppercase font-semibold mb-3"
        style={{ color: "rgba(244,242,234,0.55)" }}
      >
        Pull up a chair
      </div>
      <h3
        className="text-[clamp(1.4rem,2vw,1.875rem)] leading-[1.2] tracking-[-0.015em] mb-3"
        style={{ fontFamily: "var(--font-playfair), serif" }}
      >
        Get the next essay in your inbox.
      </h3>
      <p
        className="text-[15px] leading-[1.6] mb-6"
        style={{ color: "rgba(244,242,234,0.7)" }}
      >
        One short, useful read every few weeks — the food thinking we&apos;d
        send a friend. No noise, no spam.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          aria-label="Email"
          className="flex-1 rounded-full px-5 py-3 text-[15px] outline-none"
          style={{
            backgroundColor: "rgba(244,242,234,0.10)",
            color: "#F4F2EA",
            border: "1px solid rgba(244,242,234,0.20)",
          }}
        />
        <button
          type="submit"
          disabled={state === "submitting"}
          className="rounded-full px-7 py-3 text-[13px] font-bold tracking-[0.04em] uppercase disabled:opacity-50"
          style={{
            backgroundColor: "#F4F2EA",
            color: "#211F1A",
          }}
        >
          {state === "submitting" ? "Sending…" : "Subscribe"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-[13px]" style={{ color: "#F4B393" }}>
          {error}
        </p>
      )}
      {state === "error" && (
        <p className="mt-3 text-[13px]" style={{ color: "#F4B393" }}>
          {message}
        </p>
      )}

      <p
        className="mt-5 text-[11px] tracking-[0.04em]"
        style={{ color: "rgba(244,242,234,0.45)" }}
      >
        Your address goes to info@citigrove.com. One-click unsubscribe in
        every email.
      </p>
    </form>
  );
}
