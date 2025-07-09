FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    libreoffice \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p temp_files

EXPOSE 8000

# 🔥 El cambio clave:
CMD ["python", "main.py"]
