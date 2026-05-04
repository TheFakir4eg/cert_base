#!/bin/bash
set -e

echo "Waiting for database..."

python3 -c "
import pymysql, os, time
from pymysql.err import OperationalError

for i in range(30):
    try:
        pymysql.connect(
            host=os.environ.get('DB_HOST'),
            user=os.environ.get('DB_USER'),
            password=os.environ.get('DB_PASSWORD'),
            database=os.environ.get('DB_NAME'),
            connect_timeout=3
        )
        print('DB ready')
        exit(0)
    except OperationalError:
        time.sleep(2)

raise Exception('DB not ready')
"

echo "Running migrations"
flask db upgrade

if [ \"${RUN_SEED:-true}\" = "true" ]; then
  echo "Running seed (idempotent)"
  python seed_core.py
  python seed_permissions.py
fi

echo "Starting gunicorn"
exec gunicorn wsgi:app \
  --bind 0.0.0.0:5000 \
  --workers 2 \
  --threads 4 \
  --timeout 120