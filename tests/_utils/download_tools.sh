#!/usr/bin/env bash

# Download tools for running the integration test

set -euo pipefail

echo "+ Check tiup command"
if ! command -v tiup >/dev/null 2>&1; then
  echo "  - Download tiup"
  curl --proto '=https' --tlsv1.2 -sSf https://tiup-mirrors.pingcap.com/install.sh | sh

  # Update tiup bin path
  echo "  - Update bin path"
  shell=$(echo $SHELL | awk 'BEGIN {FS="/";} { print $NF }')
  configs=("${HOME}/.${shell}_profile" "${HOME}/.${shell}_login" "${HOME}/.${shell}rc" "${HOME}/.profile")
  for c in ${configs[@]}
  do
    if [ -f $c ]; then
      source $c
    fi
  done
fi
