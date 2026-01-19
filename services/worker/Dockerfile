FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/
COPY rules/ ./rules/

# Set Python path
ENV PYTHONPATH=/app

# Run worker
CMD ["python", "-m", "src.main"]
