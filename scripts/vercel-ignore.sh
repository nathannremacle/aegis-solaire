#!/bin/sh

if [ -z "$VERCEL_GIT_PREVIOUS_SHA" ] || [ "$VERCEL_GIT_PREVIOUS_SHA" = "$VERCEL_GIT_COMMIT_SHA" ] || ! git cat-file -e "$VERCEL_GIT_PREVIOUS_SHA^{commit}" 2>/dev/null; then
  exit 1
fi

git diff --quiet "$VERCEL_GIT_PREVIOUS_SHA" HEAD -- \
  app \
  components \
  emails \
  hooks \
  lib \
  public \
  middleware.ts \
  next.config.mjs \
  next-env.d.ts \
  package.json \
  package-lock.json \
  postcss.config.mjs \
  tsconfig.json \
  vercel.json \
  components.json \
  scripts/vercel-ignore.sh
