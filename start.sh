#!/usr/bin/env bash
# Start Sahi Company dev server on port 3001

cd "$(dirname "$0")"

if ! command -v npm &> /dev/null; then
  echo "npm not found. Please install Node.js and npm first."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Stop any existing dev server on port 3001
if lsof -ti:3001 >/dev/null 2>&1; then
  echo "Stopping existing server on port 3001..."
  lsof -ti:3001 | xargs kill -9 2>/dev/null || true
  sleep 1
fi

echo "Starting dev server at http://localhost:3001"
npm run dev
