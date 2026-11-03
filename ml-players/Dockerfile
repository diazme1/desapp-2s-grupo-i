FROM python:3.12-slim

WORKDIR /app
COPY pyproject.toml ./
COPY src ./src
COPY test/fixtures ./test/fixtures
RUN pip install --no-cache-dir .
ENV PYTHONPATH=/app/src
