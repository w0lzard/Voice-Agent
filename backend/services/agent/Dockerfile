FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y gcc curl libglib2.0-0 && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir uv
COPY backend/requirements.txt ./requirements.txt
RUN uv pip install --system -r requirements.txt

# Copy shared modules
COPY backend/shared ./shared

# Copy for backwards compatibility (old imports like 'from database.models')
COPY backend/shared/database ./database
COPY backend/shared/auth ./auth

# Copy services (needed for imports)
COPY backend/services ./services

# Create logs directory
RUN mkdir -p /app/logs

# Build-time verification: fail fast if critical modules are missing
RUN python -c "import importlib.util; assert importlib.util.find_spec('services.agent.worker'), 'services.agent.worker not found at build time'"

# Expose no ports - agent connects outbound to LiveKit

# Health check via process
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD pgrep -f "run_agent" || exit 1

# Run agent
CMD ["python", "services/agent/run_agent.py", "start"]
