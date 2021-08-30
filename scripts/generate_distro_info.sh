#!/usr/bin/env bash

# This script generate distribution info resource for fe from Golang code.
#
# Available flags:
# DISTRO_BUILD_TAG=1
#   Will use distro build tag source code.

set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR="$(dirname "$DIR")"

if [ "${DISTRO_BUILD_TAG:-}" = "1" ]; then
  BUILD_TAG_PARAMETER=dashboard_distro
else
  BUILD_TAG_PARAMETER=""
fi

echo "+ Generate distro info resource"

go run -tags=$BUILD_TAG_PARAMETER ${PROJECT_DIR}/tools/distro_info_generate/main.go -o=${PROJECT_DIR}/ui/lib/distribution.json

echo "  - Success!"
