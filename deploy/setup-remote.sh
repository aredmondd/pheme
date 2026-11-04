#!/usr/bin/env bash
# One-time setup, run ON the ThinkPad from the project dir (deploy.sh --setup does this).
set -euo pipefail
DIR="$(pwd)"
USER_NAME="$(id -un)"

node_major=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
if (( node_major < 20 )); then
  echo "Node >= 20 required (found: $(node -v 2>/dev/null || echo none))." >&2
  echo "Install e.g.: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs" >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Missing $DIR/.env — create it from .env.example first." >&2
  exit 1
fi

# First build so there's something to serve. Load .env like the systemd unit does.
set -a; source .env; set +a
npm run daily

sed -e "s#__USER__#$USER_NAME#" -e "s#__DIR__#$DIR#" deploy/nba-catchup.service \
  | sudo tee /etc/systemd/system/nba-catchup.service >/dev/null
sudo cp deploy/nba-catchup.timer /etc/systemd/system/nba-catchup.timer
sudo systemctl daemon-reload
sudo systemctl enable --now nba-catchup.timer

sudo tailscale serve --bg "$DIR/out"

echo
systemctl list-timers nba-catchup.timer --no-pager
tailscale serve status
