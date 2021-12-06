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
  if [ -f "${HOME}/.${shell}_profile" ]; then
      PROFILE=${HOME}/.${shell}_profile
  elif [ -f "${HOME}/.${shell}_login" ]; then
      PROFILE=${HOME}/.${shell}_login
  elif [ -f "${HOME}/.${shell}rc" ]; then
      PROFILE=${HOME}/.${shell}rc
  else
      PROFILE=${HOME}/.profile
  fi

  source $PROFILE
fi
