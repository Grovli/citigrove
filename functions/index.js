"use strict";

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { Storage } = require("@google-cloud/storage");

// CITIGROVE_GCS_PRIVATE_KEY stored in Firebase Secret Manager
// GCS_CLIENT_EMAIL and GCS_BUCKET_NAME are set via functions/.env
const citigroveGcsPrivateKey = defineSecret("CITIGROVE_GCS_PRIVATE_KEY");

const EXPIRY_MS = 15 * 60 * 1000;

exports.citigroveMedia = onRequest(
  {
    region: "us-east1",
    memory: "256MiB",
    timeoutSeconds: 30,
    concurrency: 80,
    secrets: [citigroveGcsPrivateKey],
  },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const key = req.query.key;
    if (!key) {
      res.status(400).json({ error: "Missing ?key param" });
      return;
    }

    const sanitized = String(key).replace(/\.\./g, "").replace(/^\/+/, "");
    if (!sanitized) {
      res.status(400).json({ error: "Invalid key" });
      return;
    }

    try {
      const storage = new Storage({
        projectId: "organic-spirit-488116-e2",
        credentials: {
          client_email: process.env.GCS_CLIENT_EMAIL,
          private_key: (citigroveGcsPrivateKey.value() || "").replace(/\\n/g, "\n"),
        },
      });

      const bucket = process.env.GCS_BUCKET_NAME || "citigrove-images";
      const [url] = await storage
        .bucket(bucket)
        .file(sanitized)
        .getSignedUrl({
          version: "v4",
          action: "read",
          expires: Date.now() + EXPIRY_MS,
        });

      res.json({ url });
    } catch (err) {
      console.error("Signed URL error:", err);
      res.status(500).json({ error: "Failed to generate signed URL" });
    }
  }
);

// EMAIL_API_URL is set via functions/.env (non-sensitive Cloud Run URL).
const EMAIL_API_URL =
  process.env.EMAIL_API_URL ||
  "https://grovli-email-api-uyply7jkca-uc.a.run.app";

// citigroveSubscribe — server proxy from the citigrove.com blog + newsletter
// forms to grovli-email-api's /marketing/subscribe. Lives as a Firebase
// Function (not a Next API route) because the site is a static export with no
// SSR runtime. Keeps the email-api URL out of the client bundle. The `source`
// tag (e.g. "blog_<slug>") routes the subscriber to that post's email mirror +
// the matching marketing workflow.
exports.citigroveSubscribe = onRequest(
  {
    region: "us-east1",
    memory: "256MiB",
    timeoutSeconds: 30,
    concurrency: 80,
  },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const body = req.body || {};
      const email = (body.email || "").toString().trim().toLowerCase();
      if (!email || !email.includes("@") || !email.includes(".")) {
        res.status(400).json({ error: "Valid email required" });
        return;
      }

      const upstream = await fetch(`${EMAIL_API_URL}/marketing/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          first_name: body.first_name || null,
          source: body.source || "citigrove_blog",
          referrer: req.get("referer") || null,
          user_agent: req.get("user-agent") || null,
        }),
      });

      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        console.error("[citigroveSubscribe] upstream", upstream.status, data);
        res.status(502).json({
          error: "Could not subscribe right now. Please try again.",
        });
        return;
      }
      res.status(upstream.status).json(data);
    } catch (err) {
      console.error("[citigroveSubscribe] crashed", err);
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  }
);
