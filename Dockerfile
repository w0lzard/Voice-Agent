FROM python:3.11-slim

WORKDIR /opt/voice-agent

# System deps: gcc for native extensions, libglib2.0-0 for silero VAD
RUN apt-get update && apt-get install -y gcc libglib2.0-0 && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv

COPY requirements.txt ./
RUN uv pip install --system -r requirements.txt

# Copy the entire app package
COPY app ./app

# Build-time verification: fail fast if app package is missing
RUN python -c "import importlib.util; spec = importlib.util.find_spec('app'); assert spec, 'app package not found at build time'"

# Ensure python can resolve "app.*" modules
ENV PYTHONPATH=/opt/voice-agent

# Use shell form so $PYTHONPATH is expanded at runtime
CMD ["sh", "-c", "python -m app.agent start"]
