#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-4173}"
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Starting Swampy Stories Explorer at http://localhost:${PORT}"
echo "Press Ctrl+C to stop."

cd "$ROOT_DIR"
python -m http.server "$PORT"
