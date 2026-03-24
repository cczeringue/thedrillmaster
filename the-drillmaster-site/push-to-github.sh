#!/usr/bin/env bash
# Push The Drillmaster site to GitHub. Run from project root.
# Prerequisite: Accept Xcode license if on macOS: sudo xcodebuild -license

set -e
cd "$(dirname "$0")"

if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  git init
  git branch -M main
fi

git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/cczeringue/thedrillmaster.git

git add .
git status
if git diff --staged --quiet 2>/dev/null; then
  echo "No changes to commit."
else
  git commit -m "Initial commit: The Drillmaster promotional site"
fi
git push -u origin main

echo "Done. Site is at https://github.com/cczeringue/thedrillmaster"
