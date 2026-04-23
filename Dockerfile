FROM python:3.12-slim

WORKDIR /app

# системные зависимости для pymysql/mysqlclient
RUN apt-get update && apt-get install -y \
    gcc \
    default-libmysqlclient-dev \
    && rm -rf /var/lib/apt/lists/*

# python зависимости
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# копируем проект
COPY . .

ENV PYTHONUNBUFFERED=1

# entrypoint
RUN echo '#!/bin/bash\n\
set -e\n\
echo "Waiting for database..."\n\
\n\
for i in {1..30}; do\n\
  if python3 - << END\n\
import pymysql, os\n\
pymysql.connect(\n\
 host=os.environ.get("DB_HOST"),\n\
 user=os.environ.get("DB_USER"),\n\
 password=os.environ.get("DB_PASSWORD"),\n\
 database=os.environ.get("DB_NAME")\n\
)\n\
END\n\
  then\n\
    echo "DB ready"\n\
    break\n\
  fi\n\
  sleep 2\n\
done\n\
\n\
echo "Running migrations"\n\
flask db upgrade\n\
\n\
echo "Seeding data"\n\
python create_user.py\n\
python seed_permissions.py\n\
\n\
echo "Starting gunicorn"\n\
exec gunicorn -b 0.0.0.0:5000 wsgi:app\n\
' > /entrypoint.sh && chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]