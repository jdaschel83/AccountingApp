#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "==> Building frontend..."
cd "$ROOT_DIR/frontend"
npm install
npm run build

echo "==> Copying frontend build to backend/public..."
rm -rf "$ROOT_DIR/backend/public"
cp -r "$ROOT_DIR/frontend/dist" "$ROOT_DIR/backend/public"

echo "==> Building backend..."
cd "$ROOT_DIR/backend"
npm install
npx tsc

echo "==> Installing Electron dependencies..."
cd "$SCRIPT_DIR"
npm install

echo "==> Rebuilding native modules for Electron..."
npx electron-rebuild -m "$ROOT_DIR/backend"

echo "==> Packaging app..."
npx electron-builder

echo "==> Done! Check electron/dist/ for the .app and .dmg"
