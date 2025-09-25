#!/bin/bash

# Skip type checking in Next.js build
cd /workspaces/SyncroSpace
SKIP_TYPE_CHECK=1 NEXT_TELEMETRY_DISABLED=1 npx next build

exit $?