#!/usr/bin/env bash

set -euo pipefail

source tests/util/download_tools.sh >/dev/null
source tests/util/run_services.sh >/dev/null

download_tools
dump_test_data $@
