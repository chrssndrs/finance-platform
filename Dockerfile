# Backend-image: gebruikt door zowel de 'pipeline'- als 'api'-service in
# docker-compose.yml (zelfde requirements.txt/src/, geen dubbele build).
FROM python:3.13-slim

WORKDIR /app

# TZ zorgt dat de crontab (03:00) en Python's lokale tijd overeenkomen met NL-tijd,
# in plaats van de UTC-default van het base image.
ENV TZ=Europe/Amsterdam
RUN apt-get update \
    && apt-get install -y --no-install-recommends cron tzdata \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .
COPY src/ src/

COPY docker/crontab /etc/cron.d/finance-pipeline
RUN chmod 0644 /etc/cron.d/finance-pipeline \
    && crontab /etc/cron.d/finance-pipeline \
    && touch /var/log/cron.log

EXPOSE 8000

# Default: de API-server. De 'pipeline'-service in docker-compose.yml
# overschrijft dit commando om in plaats daarvan cron te starten.
CMD ["python", "-m", "uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
