FROM pytorch/pytorch:2.0.0-cuda11.7-cudnn8-runtime

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3-pip \
    git \
    espeak-ng \
    && rm -rf /var/lib/apt/lists/*

# Install TTS and dependencies
RUN pip3 install --no-cache-dir \
    TTS==0.13.3 \
    numpy==1.23.5

# Create directories
RUN mkdir -p /app/voices /app/audio /app/scripts

# Copy the entire local directory into the container
COPY . /app/

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python3 -c "from TTS.api import TTS; print('Health check passed')" || exit 1

EXPOSE 8000
CMD ["python3", "-m", "http.server", "8000"]