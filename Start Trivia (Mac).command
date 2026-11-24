#!/bin/bash
# Double-click to start the trivia game on a Mac.
cd "$(dirname "$0")"
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  Node.js isn't installed yet."
  echo "  Get it from https://nodejs.org (the big LTS button), install it, then double-click this file again."
  echo ""
  read -p "  Press Enter to close."
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "  First time setup, one moment..."
  npm install --no-audit --no-fund || { read -p "  Setup failed. Are you online? Press Enter to close."; exit 1; }
fi
(sleep 2; open "http://localhost:3000/host") &
# caffeinate keeps the Mac from sleeping while the game runs
caffeinate -dimsu node server.js
