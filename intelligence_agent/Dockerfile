FROM python:3.11-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN groupadd -r app && useradd -r -g app app

WORKDIR /app

COPY intelligence_agent/ intelligence_agent/
RUN pip install --no-cache-dir --no-compile -r intelligence_agent/requirements.txt

RUN chown -R app:app /app
USER app

EXPOSE 9100

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:9100/health')"]

CMD ["python", "-m", "intelligence_agent.cron.job"]
