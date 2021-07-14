#!/usr/bin/env bash

# This script generate distribution info from the unified yaml to Golang code.

set -euo pipefail

echo "+ Generate distro info"
DISTRO_FILENAME=distro_info.go

go run tools/distro_info_generate/main.go

DISTRO_PATH=pkg/utils/distro/${DISTRO_FILENAME}
mv $DISTRO_FILENAME $DISTRO_PATH
echo "  - Distro info written to $DISTRO_PATH"
