FROM python:3.10-slim-bullseye

WORKDIR /app

# Cài dependency cơ bản
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*

# Copy file
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Chạy API FastAPI
CMD ["uvicorn", "detect:app", "--host", "0.0.0.0", "--port", "8000"]
