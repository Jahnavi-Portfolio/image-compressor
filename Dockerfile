FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y libjpeg-dev zlib1g-dev libpq-dev && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/src/ ./src/
COPY frontend/ /frontend/

EXPOSE 8000
CMD ["sh", "-c", "python -c 'from src.database import init_db; init_db()' && gunicorn src.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 10"]
