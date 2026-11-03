#!/usr/bin/env bash
# Sync the code to the ThinkPad and install deps. Usage:
#   THINKPAD=user@thinkpad ./deploy.sh          # sync + npm ci
#   THINKPAD=user@thinkpad ./deploy.sh --setup  # first time: also install the timer + tailscale serve
set -euo pipefail
: "${THINKPAD:?set THINKPAD=user@host (Tailscale hostname)}"
REMOTE_DIR="${REMOTE_DIR:-nba-catchup}"

rsync -az --delete \
  --exclude node_modules --exclude out --exclude data --exclude .git --exclude .env \
  ./ "$THINKPAD:$REMOTE_DIR/"

ssh "$THINKPAD" "cd $REMOTE_DIR && npm ci --no-audit --no-fund"

if [[ "${1:-}" == "--setup" ]]; then
  ssh -t "$THINKPAD" "cd $REMOTE_DIR && bash deploy/setup-remote.sh"
fi
echo "Deployed to $THINKPAD:$REMOTE_DIR"
