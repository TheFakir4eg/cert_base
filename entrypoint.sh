#!/bin/bash
set -e

echo "Waiting for database..."

for i in {1..30}; do
  if python3 - << END
import pymysql, os
pymysql.connect(
 host=os.environ.get("DB_HOST"),
 user=os.environ.get("DB_USER"),
 password=os.environ.get("DB_PASSWORD"),
 database=os.environ.get("DB_NAME")
)
END
  then
    echo "DB ready"
    break
  fi
  sleep 2
done

echo "Running migrations"
flask db upgrade

echo "Seeding data"
python create_user.py
python seed_permissions.py

echo "Starting gunicorn"
exec gunicorn wsgi:app \
  --bind 0.0.0.0:5000 \
  --workers 2 \
  --threads 4 \
  --timeout 120 \
  --graceful-timeout 30 \
  --keep-alive 5