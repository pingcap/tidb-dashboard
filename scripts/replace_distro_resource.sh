#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR="$(dirname "$DIR")"

echo "+ Preflight check"
if [ -z "${DISTRIBUTION_DIR}" ] || [ ! -d ${DISTRIBUTION_DIR} ]; then
  echo "  - Error: Requires specified distribution resource"
  exit 1
fi

cp -f "${DISTRIBUTION_DIR}/logo.svg" "${PROJECT_DIR}/ui/dashboardApp/layout/signin/logo.svg"
cp -f "${DISTRIBUTION_DIR}/favicon.ico" "${PROJECT_DIR}/ui/public/favicon.ico"
cp -f "${DISTRIBUTION_DIR}/distribution.yaml" "${PROJECT_DIR}/ui/lib/utils/distribution.yaml"
