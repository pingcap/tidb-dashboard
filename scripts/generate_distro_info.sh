#!/usr/bin/env bash

# This script generate distribution info from the unified yaml to Golang code.

set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR="$(dirname "$DIR")"

echo "+ Generate distro info"
DISTRO_FILENAME=distro_info.go

go run tools/distro_info_generate/main.go ${PROJECT_DIR}/ui/lib/distribution.yaml

DISTRO_PATH=pkg/utils/distro/${DISTRO_FILENAME}
mv $DISTRO_FILENAME $DISTRO_PATH
echo "  - Distro info written to $DISTRO_PATH"
