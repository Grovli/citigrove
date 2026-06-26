"""Application settings — single source of truth for every env var.

Pydantic ``BaseSettings`` loaded from the process environment (and a local
``.env`` in dev). Exposes a cached ``settings`` singleton; every field below
maps to the UPPER_CASE env var named in its trailing comment. Money config is
never stored here — totals are computed server-side in integer cents.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ─────────────────────────────────────────────────────────────
    app_env: str = "development"                 # APP_ENV  (development|production)
    service_name: str = "citigrove-store-api"    # SERVICE_NAME

    # ── MongoDB ─────────────────────────────────────────────────────────
    mongo_uri: str = "mongodb://localhost:27017/citigrove"   # MONGO_URI
    mongo_db: str = "citigrove"                  # MONGO_DB

    # ── Redis (idempotency / dedup buckets; optional in v1) ─────────────
    redis_url: Optional[str] = None              # REDIS_URL
    redis_host: str = "redis"                    # REDIS_HOST
    redis_port: int = 6379                       # REDIS_PORT
    redis_password: Optional[str] = None         # REDIS_PASSWORD
    redis_db: int = 0                            # REDIS_DB

    # ── Auth0 ───────────────────────────────────────────────────────────
    auth0_domain: str = "dev-rw8ff6vxgb7t0i4c.us.auth0.com"          # AUTH0_DOMAIN
    auth0_audience: str = "https://grovli.citigrove.com/audience"     # AUTH0_AUDIENCE

    # ── Admin gating ────────────────────────────────────────────────────
    allowed_admin_domain: str = "citigrove.com"  # ALLOWED_ADMIN_DOMAIN  (email-claim domain check)

    # ── Internal services: Grovli Payments (Grovli Direct) ──────────────
    payments_base_url: str = "https://grovli-payments-uyply7jkca-uc.a.run.app"  # PAYMENTS_BASE_URL
    payments_internal_key: str = ""              # PAYMENTS_INTERNAL_KEY  (X-Internal-Key fail-closed; empty -> calls 503)
    payments_use_oidc: bool = True               # PAYMENTS_USE_OIDC  (attach Google OIDC token to internal-ingress payments)
    payments_oidc_audience: str = ""             # PAYMENTS_OIDC_AUDIENCE  (= payments_base_url when empty)

    # ── Stripe (PaymentIntents minted by grovli-payments; we hold Tax + webhook secret) ──
    stripe_secret_key: str = ""                  # STRIPE_SECRET_KEY  (used ONLY for Stripe Tax calc + webhook construct_event)
    stripe_webhook_secret: str = ""              # STRIPE_WEBHOOK_SECRET  (POST /webhook/stripe signature; fail-closed)
    stripe_tax_enabled: bool = True              # STRIPE_TAX_ENABLED  (false -> tax_cents=0 graceful-degrade in dev)

    # ── Shippo (live shipping rates + label + tracking) ─────────────────
    shippo_api_token: str = ""                   # SHIPPO_API_TOKEN
    shippo_webhook_secret: str = ""              # SHIPPO_WEBHOOK_SECRET  (POST /webhook/shippo; fail-closed)
    ship_from_name: str = "CitiGrove"            # SHIP_FROM_NAME
    ship_from_street1: str = ""                  # SHIP_FROM_STREET1
    ship_from_city: str = ""                     # SHIP_FROM_CITY
    ship_from_state: str = ""                    # SHIP_FROM_STATE
    ship_from_zip: str = ""                      # SHIP_FROM_ZIP
    ship_from_country: str = "US"               # SHIP_FROM_COUNTRY

    # ── APNs (24h RSVP reminder; enqueue is a stub in v1) ───────────────
    apns_key_id: str = ""                        # APNS_KEY_ID
    apns_team_id: str = ""                       # APNS_TEAM_ID
    apns_bundle_id: str = "com.citigrove.app"   # APNS_BUNDLE_ID
    apns_auth_key_base64: str = ""              # APNS_AUTH_KEY_BASE64
    apns_use_sandbox: bool = True               # APNS_USE_SANDBOX

    # ── Cloud Tasks (RSVP reminder enqueue) ─────────────────────────────
    gcp_project_id: str = "organic-spirit-488116-e2"   # GCP_PROJECT_ID
    cloud_tasks_location: str = "us-central1"           # CLOUD_TASKS_LOCATION
    task_invoker_sa_email: str = ""                     # TASK_INVOKER_SA_EMAIL  (OIDC signer; empty -> enqueue stub no-ops + WARN)
    cloud_tasks_target_base: str = ""                   # CLOUD_TASKS_TARGET_BASE  (this service's own base URL)
    rsvp_reminder_queue: str = "citigrove-tasks-rsvp-reminders"  # RSVP_REMINDER_QUEUE

    # ── Observability (OTel) ────────────────────────────────────────────
    otel_exporter_otlp_endpoint: Optional[str] = None   # OTEL_EXPORTER_OTLP_ENDPOINT
    otel_service_name: str = "citigrove-store-api"      # OTEL_SERVICE_NAME
    otel_resource_attributes: str = ""                  # OTEL_RESOURCE_ATTRIBUTES

    # ── GCP / region ────────────────────────────────────────────────────
    google_cloud_project: str = "organic-spirit-488116-e2"  # GOOGLE_CLOUD_PROJECT
    gcp_region: str = "us-central1"                          # GCP_REGION

    # ── Derived properties ──────────────────────────────────────────────
    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def is_development(self) -> bool:
        return self.app_env.lower() == "development"

    @property
    def auth0_issuer(self) -> str:
        """Auth0 issuer URL derived from the domain (trailing slash mandatory)."""
        return f"https://{(self.auth0_domain or '').strip()}/"

    @property
    def effective_redis_url(self) -> Optional[str]:
        """Explicit ``redis_url`` wins; otherwise build one from host/port/db.

        Returns None only when no host is configured (Redis fully disabled).
        Mirrors Grovli's host/port fallback so dev + Memorystore both work.
        """
        if self.redis_url:
            return self.redis_url
        if not self.redis_host:
            return None
        auth = f":{self.redis_password}@" if self.redis_password else ""
        return f"redis://{auth}{self.redis_host}:{self.redis_port}/{self.redis_db}"

    @property
    def allowed_admin_domains(self) -> set[str]:
        """Comma-list of admin email domains, lowercased and de-blanked."""
        return {
            d.strip().lower()
            for d in (self.allowed_admin_domain or "").split(",")
            if d.strip()
        }

    @property
    def effective_payments_oidc_audience(self) -> str:
        """OIDC audience for internal-ingress payments calls.

        Defaults to the payments base URL when ``payments_oidc_audience`` is
        unset — Cloud Run requires the receiving service URL as the audience.
        """
        return (self.payments_oidc_audience or "").strip() or self.payments_base_url


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
