#!/bin/bash
# Syncs code (no media/audio/caches) to the private GitHub backup repo.
# Usage: ./scripts/backup-private.sh [optional commit message]

set -e

REPO_URL="https://github.com/magmacrunchmedia/magma-ops-backup.git"
SOURCE="$(cd "$(dirname "$0")/.." && pwd)"
TMPDIR=$(mktemp -d)
MSG="${1:-Backup $(date +%Y-%m-%d)}"

cleanup() { rm -rf "$TMPDIR"; }
trap cleanup EXIT

git init "$TMPDIR" -q
git -C "$TMPDIR" remote add origin "$REPO_URL"

rsync -a "$SOURCE/" "$TMPDIR/" \
  --exclude='*.png' \
  --exclude='*.jpg' \
  --exclude='*.JPG' \
  --exclude='*.jpeg' \
  --exclude='*.gif' \
  --exclude='*.webp' \
  --exclude='*.bmp' \
  --exclude='*.ico' \
  --exclude='*.svg' \
  --exclude='*.ogg' \
  --exclude='*.mp3' \
  --exclude='*.wav' \
  --exclude='*.mp4' \
  --exclude='*.webm' \
  --exclude='archive/_cache/' \
  --exclude='arcade/admin/scores/' \
  --exclude='node_modules/' \
  --exclude='.git/'

cd "$TMPDIR"
git add -A
git diff --cached --quiet && echo "No changes to back up." && exit 0
git commit -q -m "$MSG"
git push --force origin main
echo "Backup pushed: $MSG"
