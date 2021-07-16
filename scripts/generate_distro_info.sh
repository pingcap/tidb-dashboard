#!/usr/bin/env bash

# This script generate distribution info from the unified yaml to Golang code.
#
# Available flags:
# NO_DISTRO_BUILD_TAG=1
#   No build tags will be included in the generated source code.
# DISTRO_BUILD_TAG=X
#   Customize the build tag of the generated source code. If unspecified, build tag will be "distro".

set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR="$(dirname "$DIR")"

if [ "${NO_DISTRO_BUILD_TAG:-}" = "1" ]; then
  BUILD_TAG_PARAMETER=""
else
  BUILD_TAG_PARAMETER=${DISTRO_BUILD_TAG:-distro}
fi

echo "+ Generate distro info"
DISTRO_FILENAME=distro_info.go

go run tools/distro_info_generate/main.go -buildTag=$BUILD_TAG_PARAMETER ${PROJECT_DIR}/ui/lib/distribution.yaml

DISTRO_PATH=pkg/utils/distro/${DISTRO_FILENAME}
mv $DISTRO_FILENAME $DISTRO_PATH
echo "  - Distro info written to $DISTRO_PATH"
