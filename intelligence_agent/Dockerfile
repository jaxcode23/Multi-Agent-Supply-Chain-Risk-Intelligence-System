FROM python:3.11-slim

RUN groupadd -r app && useradd -r -g app app

WORKDIR /app

COPY pyproject.toml .
COPY intelligence_agent/ intelligence_agent/
RUN pip install --no-cache-dir -e .

RUN chown -R app:app /app
USER app

EXPOSE 9100

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:9100/health')"]

CMD ["python", "-m", "intelligence_agent.cron.job"]
