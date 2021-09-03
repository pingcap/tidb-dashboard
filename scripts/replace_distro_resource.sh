#!/usr/bin/env bash

# This script replaces the resources in the project with specific distribution resources.
#
# Required params:
# DISTRIBUTION_DIR
#   Specify the resource directory to be used for replacement.

set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR="$(dirname "$DIR")"

cd $PROJECT_DIR

echo "+ Preflight check"
if [ -z "${DISTRIBUTION_DIR}" ] || [ ! -d "${DISTRIBUTION_DIR}" ]; then
  echo "  - Error: DISTRIBUTION_DIR must be specified"
  exit 1
fi

echo "+ Replace distro resource"

\cp -f "${DISTRIBUTION_DIR}/logo.svg" "${PROJECT_DIR}/ui/dashboardApp/layout/signin/logo.svg" || true
\cp -f "${DISTRIBUTION_DIR}/landing.svg" "${PROJECT_DIR}/ui/dashboardApp/layout/signin/landing.svg" || true
\cp -f "${DISTRIBUTION_DIR}/logo-icon-light.svg" "${PROJECT_DIR}/ui/dashboardApp/layout/main/Sider/logo-icon-light.svg" || true
\cp -f "${DISTRIBUTION_DIR}/favicon.ico" "${PROJECT_DIR}/ui/public/favicon.ico" || true
\cp -f "${DISTRIBUTION_DIR}/distro_info.go" "${PROJECT_DIR}/pkg/utils/distro/distro_info.go"

echo "  - Success!"
