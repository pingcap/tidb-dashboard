#!/usr/bin/env bash

# This script outputs distribution strings to json which is required for the frontend.

set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR=$(cd "$DIR/.."; pwd)
BUILD_TAG=""

echo "+ Write distro strings"
cd "$PROJECT_DIR"
go run cmd/distro/write_strings.go -o="${PROJECT_DIR}/ui/lib/distro_strings.json"

echo "  - Success! Distro strings:"
cat "${PROJECT_DIR}/ui/lib/distro_strings.json"

echo
