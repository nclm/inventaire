#!/usr/bin/env bash
databases=$(./scripts/print_module_exports.ts server/db/couchdb/databases.ts databases | jq 'keys | join(" ")' -r)
dbHost=$(node -p "require('config').db.getOrigin()")
elasticOrigin=$(node -p "require('config').elasticsearch.origin")
leveldbPathBase=$(ts-node ./server/lib/absolute_path.ts root db/leveldb)
leveldbPath="${leveldbPathBase}*-tests"

for db in $databases
do
  echo "deleting ${db}-tests in couchdb... " &&
  curl -sXDELETE "${dbHost}/${db}-tests"
  echo "deleting ${db}-tests in elastic search... " &&
  curl -sXDELETE "${elasticOrigin}/${db}-tests"
done

echo "deleting ${leveldbPath}... " &&
rm -rf ${leveldbPath}
