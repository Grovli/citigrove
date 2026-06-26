# citigrove-store-api

FastAPI microservice powering the **CitiGrove** ecommerce app — physical
goods storefront + geo-discovered events with RSVP/waitlist. Peer to the
Grovli services; mirrors their conventions exactly (async, Cloud Run,
GCP `organic-spirit-488116-e2` / `us-central1`, `grovli-vpc`). **This
service self-deploys from the `citigrove` GitHub org** — it does not
depend on Grovli's reusable workflows.

## Non-negotiable invariants

1. **Money is always integer cents** (`*_cents: int`), currency `"usd"`.
   The **server is the pricing / inventory / RSVP authority** — clients
   send only `sku` + `qty` + `address` and **render** everything else;
   they never recompute totals, capacity, or waitlist state.
2. **No IAP, ever.** Physical goods + events are paid via **Apple Pay /
   Stripe only** (Apple Guideline 3.1.3(e)). No StoreKit, no receipt
   verification.
3. **Payments go through grovli-payments `/direct/*`** (Grovli-Direct)
   via the internal client. Settlement is **verified server-side** with
   an amount-match anti-underpay check — a client "paid" claim is never
   trusted.
4. **Auth:** Auth0 RS256 JWKS, `PyJWKClient(..., timeout=5)`. Identity is
   the verified `sub`. Admin requires `email_verified` + a
   `@citigrove.com` email domain.
5. **Inventory decrement is a single aggregation-pipeline update with an
   `inventory_version` filter** — atomic, oversell-safe. Conflicts emit a
   `WARNING` + `409`.
6. **Events RSVP capacity/waitlist is atomic;** `rsvpCount`,
   `waitlistCount`, `capacityFull`, `position`, and `status` are
   server-owned.

## Layout

```
app/
  main.py                 FastAPI app, lifespan (ensure_indexes), routers
  core/                   config, auth, timeutils, logging, observability,
                          google_oidc, cloud_tasks, database/
  models/                 products, orders, events, common (all *_cents int)
  clients/                payments_client, stripe_tax_client, shippo_client, http
  services/               pricing, inventory, products/orders/events services,
                          rsvp_reminders, webhooks_service
  api/                    health, store_products, store_orders, store_shipping,
                          events, admin, webhooks, internal_tasks
tests/                    health, auth, pricing, inventory, orders, events, webhooks
```

## Routes (prefixes)

| Prefix | Auth | Surface |
|---|---|---|
| `/health` | none | liveness |
| `/store` | `require_user` (reads public) | products, quote, orders, shipping |
| `/events` | `require_user` (reads public) | nearby, RSVP join/leave, mine |
| `/admin` | `require_admin` | product + event upserts |
| `/webhook` | signature only | stripe, shippo |
| `/internal/tasks` | OIDC invoker | RSVP-reminder dispatch (stub) |

## Local development

Local Python is **3.9** — you cannot run the full test suite or the app
locally against the pinned 3.13 deps. **AST-parse for syntax** and let CI
run `pytest`. The pure-Python unit tests (`tests/test_pricing.py`,
`tests/test_health.py`) are import-light and run in CI on 3.13.

```bash
cp .env.example .env          # fill in secrets
# deps (in a 3.13 venv):
uv pip compile requirements.in -o requirements.lock \
    --python-version 3.13 --python-platform linux --no-strip-extras
pip install -r requirements.lock
granian --interface asgi --workers 2 --host 0.0.0.0 --port 8000 app.main:app
```

## Dependencies

Edit **`requirements.in`** (floors/caps + rationale), then regenerate
**`requirements.lock`** with the `uv pip compile` command above. The image
and CI install from the lock — never add a dep without recompiling. OTel
bootstrap instrumentation is pinned in **`otel-constraints.txt`**
(`PIP_CONSTRAINT`).

## CI / Deploy

- **`.github/workflows/ci.yml`** — ruff lint + `compileall` AST gate +
  `pytest`, on push / PR. Self-contained in this repo.
- **`.github/workflows/deploy.yml`** — self-contained build → deploy to
  Cloud Run (`citigrove-store-api`) via `gcloud` + Buildpacks, on push to
  `main` (or manual dispatch). Requires the `GCP_SA_KEY` repo secret
  (service-account JSON). **All env vars are set on every deploy** so a
  deploy never wipes config.
