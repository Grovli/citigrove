# citigrove-store-api — 2-stage build.
#
# Builder compiles deps from the committed lockfile; the slim runtime
# copies the installed site-packages and runs the ASGI app under granian.
# OTel auto-instrumentation is wired by opentelemetry-bootstrap at build
# time (under the PIP_CONSTRAINT pin set) so no in-code SDK init is needed.

# ───────────────────────────── builder ──────────────────────────────
FROM python:3.13-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Build toolchain for any source-built wheels (pyjwt[crypto] -> cryptography).
RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential \
 && rm -rf /var/lib/apt/lists/*

# Install from the committed lock ONLY (reproducible). otel-constraints.txt
# pins the bootstrap-installed instrumentation (the lock can't reach
# bootstrap's pip subprocesses).
COPY requirements.lock otel-constraints.txt ./
ENV PIP_CONSTRAINT=/app/otel-constraints.txt

RUN pip install --upgrade pip \
 && pip install -r requirements.lock \
 && opentelemetry-bootstrap -a install

# ───────────────────────────── runtime ──────────────────────────────
FROM python:3.13-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    WORKERS=2

WORKDIR /app

# Carry over the resolved environment from the builder.
COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Application source.
COPY . .

# Byte-compile to surface syntax errors at build time, not first request.
RUN python -m compileall -q /app

# Non-root runtime user.
RUN useradd --create-home --uid 10001 appuser \
 && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# granian ASGI server. PORT is honored by Cloud Run; default 8000 locally.
# No access log (telemetry comes from OTel spans + structured app logs).
CMD ["sh", "-c", "granian --interface asgi --no-access-log --workers ${WORKERS:-2} --host 0.0.0.0 --port ${PORT:-8000} app.main:app"]
