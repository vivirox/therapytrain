#!/bin/bash

DB_PASSWORD=$(grep 'VIEW_DATABASE_PASS:' ../compose.yaml | awk '{print $2}' | tr -d "'")
DB_USERNAME=$(grep 'VIEW_DATABASE_USER:' ../compose.yaml | awk '{print $2}' | tr -d "'")

echo "Patching Accounts Table"
docker exec -it mysql mysql -u "$DB_USERNAME" -p"$DB_PASSWORD" view -e 'UPDATE accounts SET guid = "default" WHERE id > 0;' 2>/dev/null
echo "Patching Tenants Table"
docker exec -it mysql mysql -u "$DB_USERNAME" -p"$DB_PASSWORD" view -e 'UPDATE tenants SET guid = "default", accountguid = "default" WHERE id > 0;' 2>/dev/null
