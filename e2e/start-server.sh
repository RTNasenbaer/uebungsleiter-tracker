#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Starts wrangler dev with a fresh local D1 and the built web app for Playwright.
set -euo pipefail
cd "$(dirname "$0")/../apps/api"
STATE=.wrangler/e2e
rm -rf "$STATE"
pnpm exec wrangler d1 migrations apply DB --local --persist-to "$STATE" >/dev/null
exec pnpm exec wrangler dev --port "${E2E_PORT:-8790}" --persist-to "$STATE" \
  --var ENVIRONMENT:test --var ENABLE_TEST_ROUTES:true --var APP_ORIGIN: \
  --show-interactive-dev-session=false
