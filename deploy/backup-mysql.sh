#!/bin/sh
set -eu
export MYSQL_PWD="${MYSQL_ROOT_PASSWORD:-}"
mysqldump --user=root --single-transaction --no-tablespaces --routines --triggers --set-gtid-purged=OFF --result-file="$1" ocorrencias
test -s "$1"
