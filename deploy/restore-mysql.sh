#!/bin/sh
set -eu
export MYSQL_PWD="${MYSQL_ROOT_PASSWORD:?Root password required in production}"
tables=$(mysql --user=root --batch --skip-column-names -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='ocorrencias';")
test "$tables" = "0" || { echo 'Refusing restore: target database is not empty.' >&2; exit 1; }
mysql --user=root --database=ocorrencias < "$1"
