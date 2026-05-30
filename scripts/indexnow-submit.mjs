#!/usr/bin/env node
/**
 * Submit every citigrove.com URL to IndexNow (Bing, Yandex, Seznam, Naver, …)
 * for near-instant indexing. Run AFTER a deploy, once the sitemap + key file
 * are live:
 *
 *   node scripts/indexnow-submit.mjs
 *
 * The key file (public/<key>.txt) must be reachable at
 * https://citigrove.com/<key>.txt — it ships automatically with the export.
 * Google does not use IndexNow; submit the sitemap in Search Console instead
 * (see PUBLISH_RUNBOOK.md).
 */

const HOST = process.env.INDEXNOW_HOST || "citigrove.com";
const KEY = process.env.INDEXNOW_KEY || "d37a328b7f30c94513cd035bec849bb0";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const SITEMAP = `https://${HOST}/sitemap.xml`;

async function main() {
  const res = await fetch(SITEMAP);
  if (!res.ok) throw new Error(`Could not fetch ${SITEMAP}: ${res.status}`);
  const xml = await res.text();
  const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
    m[1].trim()
  );
  if (!urlList.length) {
    console.error("No <loc> URLs found in sitemap — nothing to submit.");
    process.exit(1);
  }

  const submit = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: KEY_LOCATION,
      urlList,
    }),
  });

  console.log(
    `IndexNow → ${submit.status} ${submit.statusText} · submitted ${urlList.length} URLs`
  );
  if (submit.status >= 400) {
    console.error(await submit.text().catch(() => ""));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
