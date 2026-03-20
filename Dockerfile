FROM python:3.11-slim

WORKDIR /opt/voice-agent

# System deps: gcc for native extensions, libglib2.0-0 for silero VAD
RUN apt-get update && apt-get install -y gcc libglib2.0-0 && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv

COPY requirements.txt ./
RUN uv pip install --system -r requirements.txt

# Copy the entire app package
COPY app ./app

# DEBUG: Verify file structure
RUN ls -R /opt/voice-agent

# Ensure python can resolve "app.*" modules
ENV PYTHONPATH=/opt/voice-agent

CMD ["python", "-m", "app.agent", "start"]
