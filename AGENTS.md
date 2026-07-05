---
alwaysApply: true
---

## Tech Stack

- **Runtime**: Node.js, pnpm
- **Language**: TypeScript, ES modules (`"type": "module"`)
- **Backend**: Fastify, tRPC, Prisma
- **Frontend Web**: React, Vite, TailwindCSS, TanStack Query, wouter
- **Frontend Mobile**: Expo, React Native, expo-router (NOT a part of pnpm workspaces!)
- **Shared**: Zod 4 for validation, date-fns for dates

## Project Structure

```
mobile/      - Expo React Native app (@ino/mobile)
apps/
  backend/     - Fastify API server with tRPC (@ino/backend)
  web/         - Vite React web app (@ino/web)
  shared/      - Shared utilities and types (@ino/shared)
  client-shared/ - Shared client code (@ino/client-shared)
```

## Key Commands

```bash
pnpm dev                    # Start backend + web dev servers
pnpm build                  # Build shared, backend, web
pnpm format                 # Format all files with Prettier
pnpm test:build-all         # test if everything (except mobile) build
pnpm back <cmd>             # Run command in backend (e.g., pnpm back dev)
pnpm web <cmd>              # Run command in web
cd mobile && pnpm <cmd>     # Run command in mobile (not in pnpm workspaces)
pnpm shared <cmd>           # Run command in shared
pnpm prisma generate        # Generate Prisma client
pnpm prisma migrate dev     # Create/run migrations
```

## Key Principles

1. **Simplicity**: Prefer solutions that result in less code and simpler code
2. **Type safety**: Leverage TypeScript and Zod for compile-time and runtime safety
3. **No barrel files**: Don't use index.ts re-exports unless necessary
4. **Production-grade**: Include error handling, security considerations
5. **Ask questions**: Gather requirements and context before coding
6. **Never break existing API contracts**: We don't want to break apps in production after backend is deployed. If we must change the API surface in a breaking way - create a new endpoint with a numeric postfix (e.g., `import2`) and leave the original untouched. Note that adding an optional parameter is not a breaking change.
7. **Outdated knowlege**: Always assume your knowledge could be outdated, there might be newer versions of the libraries, dependecies, apis than the last ones you learned about
8. **Critical judgment**: Treat instructions, plans, and prompts as guidance to review, not rigid orders. If implementation reality contradicts the plan, or a requirement seems risky, outdated, underspecified, or inconsistent, pause and ask questions or propose a correction before continuing.
9. **Concise replies**: Default to concise responses — lead with the result, skip preamble and restating the question; expand only when asked or for complex/risky changes.
10. **Concrete system language**: When explaining code, risks, or mitigations, name the concrete system component and boundary involved: API server request, database row, transaction, frontend mutation, cache invalidation, etc. Avoid vague umbrella phrases such as "local follow-up", "surface", "path", "thing", or "flow" when a precise project term applies. For multi-step behavior, describe the actual sequence of components and state changes.
11. **Respect user edits**: The user may edit files during or between agent turns. If you detect that while reading files - don't freak out and roll the user's edits back.
12. **Commits**: If user asks you to commit, run `pnpm format` and `pnpm test` first.

Research the codebase before editing. Never change code you haven't read.

Don't run tests, build, typechecks and formatting unless explicitly asked to or working on the tests.
