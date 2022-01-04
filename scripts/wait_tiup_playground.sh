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
  sleep ${INTERVAL}
  ps ef|grep tiup
  ls /home/runner/.tiup/components/playground/
  DATA_PATH=$(ls /home/runner/.tiup/data/)
  echo $DATA_PATH
  echo "==== TiDB Log ===="
  tail -n 3 /home/runner/.tiup/data/$DATA_PATH/tidb-0/tidb.log
  echo "==== TiKV Log ===="
  tail -n 3 /home/runner/.tiup/data/$DATA_PATH/tikv-0/tikv.log
  echo "==== PD Log ===="
  tail -n 3 /home/runner/.tiup/data/$DATA_PATH/pd-0/pd.log
done

exit 0
