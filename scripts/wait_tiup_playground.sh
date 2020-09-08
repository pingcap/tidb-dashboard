#!/usr/bin/env bash
# Wait unitl `tiup playground` command run success

source /home/runner/.profile

INTERVAL=$1
MAX_TIMES=$2

for ((i=0; i<${MAX_TIMES}; i++))
do
  tiup playground display
  if [ $? -eq 0 ]
  then
    exit 0
  fi
  sleep ${INTERVAL}
done

exit 1
