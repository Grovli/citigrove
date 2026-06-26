# citigrove-store-api — Agent Operating Manual

## Mission

This service powers the **CitiGrove** ecommerce app: a physical-goods
storefront plus geo-discovered community events with RSVP/waitlist.
Approach every decision as if a million dollars is at stake — this peer
handles **real money and real inventory**, so correctness and
server-authority are non-negotiable.

## What this service is

A NEW peer FastAPI microservice (Python 3.13, async, Cloud Run) in the
Grovli ecosystem, mirroring Grovli backend conventions. GCP project
`organic-spirit-488116-e2`, region `us-central1`, same `grovli-vpc`.
**It self-deploys from the `citigrove` GitHub org** and owns its own
Cloud Run service — it does NOT depend on Grovli's reusable workflows.

## Hard Rules — Money & Payments

- **Money is ALWAYS integer cents** (`*_cents: int`), currency `"usd"`
  lowercase. **NEVER floats for money.** Tax, shipping, and totals are
  computed server-side only.
- **Server is the pricing / inventory / RSVP authority.** Clients send
  only `sku` + `qty` + `address` and **render** server-derived fields
  (`unit_price_cents`, all totals, `status`, `payment_state`,
  `rsvpCount`, `waitlistCount`, `capacityFull`, `position`). Clients
  **never** recompute them.
- **No IAP, EVER.** Physical goods + events are paid via **Apple Pay /
  Stripe only** (Apple Guideline 3.1.3(e)). No StoreKit, no receipt
  verification, no `IAP`/`StoreKit` code paths. PaymentIntents are minted
  by **grovli-payments `/direct/*`**; this service only holds Stripe Tax
  + webhook secrets.
- **Verify settlement server-side.** Accept a payment as settled iff the
  verified state ∈ {`captured`,`succeeded`,`paid`} AND
  `verify.amount_cents == order.total_cents` AND `currency == "usd"`.
  Any mismatch → `AppError(402, AMOUNT_MISMATCH)` + WARNING. Never trust
  a client "paid" claim.

## Hard Rules — Data integrity

- **Inventory decrement = a single aggregation-pipeline update with an
  `inventory_version` filter.** Never read-modify-write. Oversell /
  version conflict → WARNING (`event=store.inventory.conflict`) + `409`,
  retry on stock-available, else fail closed.
- **RSVP capacity/waitlist is atomic** via `find_one_and_update` on
  `events`; the unique `(eventId,userId)` index is the durable dedup
  gate (DuplicateKey → `ALREADY_RSVPD`, handled idempotently). The
  unique-sparse `idempotencyKey` on `store_orders` gates double-charge.
- **Every race/conflict/dedup/409/capacity-loss path MUST emit a
  `WARNING` with an `event=` tag.** Silent recovery hides the rate
  signal.

## Hard Rules — Auth

- Auth0 RS256 JWKS, `PyJWKClient(..., timeout=5)` (MANDATORY — default
  urllib hangs ~75s → worker SIGABRT). Identity is the **verified `sub`**
  — never trust a `user-id`/`x-user-id` header. An order/rsvp is owned by
  `sub`; `/mine` filters `{"userId": sub}` (IDOR rule).
- Admin = verified JWT + `email_verified is True` + email domain in
  `ALLOWED_ADMIN_DOMAIN` (`@citigrove.com`). Fail closed (403).
- Webhooks use **signature verification only** (no JWT dep); fail closed
  (400 bad signature, 503 if the secret is unset).

## Hard Rules — Source Control & Deploy

- NO PR, NO commit, NO merge, NO push unless explicitly asked — local
  edits only.
- **This service self-deploys.** Its own `deploy.yml` owns its Cloud Run
  service; keep ALL env vars set in the deploy step so a deploy never
  wipes config. (Grovli's hard-rule against `gcloud run deploy` applies
  to GROVLI services — this peer owns its deploy workflow.)
- Infra/env changes live in this repo's deploy workflow (and, where
  applicable, the shared infra repo) — not hand-applied via CLI to a
  live service.

## Pre-Implementation Gate (MANDATORY)

Before writing ANY new feature, service, or architectural change:

1. **Research** — how do 3+ production companies solve the same problem?
   Find the industry-standard approach (cite sources, within 1 year).
2. **Present** — show findings, the standard pattern, and alternatives.
3. **Align** — get explicit user alignment before writing code.
4. **Implement** — only then write code, using the aligned approach.

Applies to: payment flows, auth changes, search/ranking, new data
pipelines, infra additions. Does NOT apply to: clear-root-cause bug
fixes, styling, config updates, refactors of existing patterns.

## Development conventions

- **Module header:** every `.py` opens with a triple-quoted docstring,
  then `from __future__ import annotations`. Imports stdlib → third-party
  → `app.*`, blank-line separated, always absolute.
- **Logger:** `logger = logging.getLogger(__name__)` at module top.
  Structured events via `_logfmt({...})` with a MANDATORY
  `event=<dotted.name>` token. Severity rubric: INFO = expected (incl.
  handled failures); WARNING = ticket-tier (every race/conflict path);
  ERROR = page-eligible at high rate; CRITICAL = reserve.
- **Time:** always `app.core.timeutils.utc_now()` (tz-aware UTC); never
  bare `datetime.utcnow()`.
- **Telemetry is best-effort:** lazy OTel meters/counters wrapped in
  `try/except Exception: pass` — a telemetry failure NEVER breaks a
  request.
- **Fix the root cause** — no bridges, fallbacks, or temporary
  workarounds unless explicitly asked. Fail closed on missing
  secrets/credentials.

## Build & Test Commands

- **Local Python is 3.9** — you cannot run the full suite or the app
  locally. **AST-parse for syntax** (`python -m compileall` /
  `ast.parse`); `pytest` runs in CI on 3.13.
- **Deps:** locked. Edit `requirements.in` (floors/caps + rationale),
  then regenerate `requirements.lock` with
  `uv pip compile requirements.in -o requirements.lock --python-version
  3.13 --python-platform linux --no-strip-extras`. The image + CI install
  from the lock — never add a dep without recompiling. OTel bootstrap
  instrumentation is pinned separately in `otel-constraints.txt`
  (`PIP_CONSTRAINT`).
- **Runtime:** granian (`--interface asgi`), `app.main:app`, port from
  `$PORT`.

## Blast radius / cross-service notes

- Calls **grovli-payments** (internal ingress) — changes to the
  `/direct/*` contract must be validated against that peer.
- Reads Auth0 with the **Grovli audience** — token issuance is shared;
  do not diverge the audience without coordinating Auth0 config.
- Webhooks (Stripe, Shippo) mutate order state — signature verification
  is the only trust boundary; never accept unsigned webhooks.
