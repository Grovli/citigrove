/**
 * /api/subscribe — server proxy to grovli-email-api.
 *
 * Mirrors the pattern grovli.citigrove.com uses (frontend
 * /api/marketing-subscribe). Server-side so the inline blog form
 * doesn't trip CORS hitting the email-api directly, and so the
 * email-api URL never leaks to the client bundle.
 *
 * source/campaign tags carry into the welcome-email + lead_events
 * attribution stream so blog → app conversion is measurable.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const EMAIL_API_URL =
  process.env.EMAIL_API_URL ||
  "https://grovli-email-api-uyply7jkca-uc.a.run.app";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || "").toString().trim().toLowerCase();
    if (!email || !email.includes("@") || !email.includes(".")) {
      return NextResponse.json(
        { error: "Valid email required" },
        { status: 400 }
      );
    }

    const upstream = await fetch(`${EMAIL_API_URL}/marketing/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        source: body.source || "citigrove_blog",
        campaign: body.campaign || null,
        referrer: req.headers.get("referer") || null,
        user_agent: req.headers.get("user-agent") || null,
      }),
    });

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      // eslint-disable-next-line no-console
      console.error("[citigrove subscribe] upstream", upstream.status, data);
      return NextResponse.json(
        { error: "Could not subscribe right now. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[citigrove subscribe] crashed", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
