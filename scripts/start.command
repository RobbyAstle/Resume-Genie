#!/bin/bash
# Resume Genie — Mac launcher
# Double-click this file to start the app.

DIR="$(cd "$(dirname "$0")" && pwd)"

export PUPPETEER_EXECUTABLE_PATH="$DIR/chrome/chrome"
export NODE_ENV=production
export PORT=3000
export HOSTNAME=localhost

echo "Starting Resume Genie..."
echo ""

# Open browser after a short delay (in background)
(sleep 3 && open "http://localhost:3000") &

# Start the server (blocks until closed)
"$DIR/node/bin/node" "$DIR/node_modules/next/dist/bin/next" start --port "$PORT" --hostname "$HOSTNAME"
