#!/usr/bin/env bash

# This script writes distribution strings in json which is required for the frontend.

set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR=$(cd "$DIR/../.."; pwd)
BUILD_TAG=""

if [[ -f "${PROJECT_DIR}/internal/resource/distrores/strings.go" ]]; then
  echo "+ Existing distribution resource is detected, using it to write strings"
  BUILD_TAG=distro
fi

echo "+ Write resource strings"
go run -tags="${BUILD_TAG}" "${PROJECT_DIR}/scripts/distro/write_strings.go" -o="${PROJECT_DIR}/ui/lib/distribution.json"

echo "  - Success! Resource strings:"
cat "${PROJECT_DIR}/ui/lib/distribution.json"

echo
