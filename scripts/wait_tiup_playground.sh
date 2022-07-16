#!/usr/bin/env bash
# Wait unitl `tiup playground` command runs success

INTERVAL=$1
MAX_TIMES=$2

if ([ -z "${INTERVAL}" ] || [ -z "${MAX_TIMES}" ]); then
  echo "Usage: command <interval> <max_times>"
  exit 1
fi

source /home/runner/.profile

for ((i=0; i<${MAX_TIMES}; i++)); do
  tiup playground display
  if [ $? -eq 0 ]; then
    exit 0
  fi
  cat ~/start_tiup.log
  sleep ${INTERVAL}
done

exit 1
