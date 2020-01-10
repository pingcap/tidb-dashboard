#!/usr/bin/env bash
set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

cd ${DIR}

if [[ ! -f "dummydata.json" ]]; then
  echo '+ Download dummydata for KeyVis'
  DOWNLOAD_URL="https://github.com/pingcap/pd-web/raw/master/src/fixtures/dummydata.json"
  curl -L "${DOWNLOAD_URL}" > dummydata.json.download
  mv dummydata.json.download dummydata.json
fi
