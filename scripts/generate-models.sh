#!/bin/bash
# Generate all character models via Blender Python scripts.
# Outputs GLB files to public/models/

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Generating character models ==="
echo "Project dir: $PROJECT_DIR"

mkdir -p "$PROJECT_DIR/public/models"

echo ""
echo "--- Generating mage model ---"
blender --background --python "$SCRIPT_DIR/blender/generate_mage.py" 2>&1 | tail -5

echo ""
echo "--- Generating enemy models ---"
blender --background --python "$SCRIPT_DIR/blender/generate_enemies.py" 2>&1 | tail -5

echo ""
echo "=== Model generation complete ==="
ls -la "$PROJECT_DIR/public/models/"
