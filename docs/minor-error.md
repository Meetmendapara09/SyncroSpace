# Minor Errors in SyncroSpace

This document lists minor errors in the codebase with links to their locations.

## Minor Errors

- **Linting Issues in Example Files**
  - See [`src/examples/caching-example.ts`](../src/examples/caching-example.ts) for minor TypeScript lint errors (e.g., unused variables, type mismatches).
- **Unused Imports in Components**
  - Some components in [`src/components/`](../src/components/) have unused imports flagged by the linter.
- **Typo in Static Export Config**
  - Minor typo in [`next.config.static.ts`](../next.config.static.ts) regarding exportPathMap.
- **Non-Standard Autocomplete Attributes**
  - Some form fields in [`src/pages/`](../src/pages/) use non-standard autocomplete values.
- **Console Warnings in Demo Page**
  - Occasional warnings in [`src/app/demo/caching/page.tsx`](../src/app/demo/caching/page.tsx) due to prop types.
