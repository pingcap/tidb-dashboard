#!/usr/bin/env bash

set -euo pipefail

echo "+ Create test tables"
cat tests/schema/*.sql | mysql --host 127.0.0.1 --port 4000 -u root test || true

echo "  - Success!"
