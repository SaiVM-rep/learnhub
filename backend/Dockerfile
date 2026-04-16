# ── LearnHub Backend Dockerfile ──────────────────────────────────
# Multi-stage build for Django REST API
# Uses gunicorn as the production WSGI server

# ---------- Stage 1: base ----------
FROM python:3.12-slim AS base

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# ---------- Stage 2: dependencies ----------
FROM base AS deps

# Install system dependencies needed for some Python packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies (including gunicorn for production)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir gunicorn>=22.0 psycopg2-binary>=2.9

# ---------- Stage 3: production ----------
FROM base AS production

# Copy installed packages from deps stage
COPY --from=deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

# Install runtime-only system library for PostgreSQL
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq5 && \
    rm -rf /var/lib/apt/lists/*

# Copy application source code
COPY . .

# Collect static files for production
RUN python manage.py collectstatic --noinput 2>/dev/null || true

# Expose the API port
EXPOSE 8000

# Run migrations and start gunicorn
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn backend.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 120"]
