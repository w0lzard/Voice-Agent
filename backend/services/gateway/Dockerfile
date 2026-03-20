FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Install system dependencies
RUN apt-get update && apt-get install -y gcc curl && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir uv
COPY backend/requirements.txt ./requirements.txt
RUN uv pip install --system -r requirements.txt

# Copy shared modules
COPY backend/shared ./shared

# Copy for backwards compatibility (old imports like 'from database.models')
COPY backend/shared/database ./database
COPY backend/shared/auth ./auth

# Copy all services (needed for imports)
COPY backend/services ./services

# Create logs directory
RUN mkdir -p /app/logs

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD sh -c "curl -fsS http://127.0.0.1:${PORT:-8000}/health || exit 1"

CMD ["python", "services/gateway/run_server.py"]
