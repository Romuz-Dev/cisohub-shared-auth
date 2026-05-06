# L3 Completion Report — @cisohub/shared-auth Stage 1

**Task:** SA-PKG Stage 1 (Task #1047)
**Date:** 2026-05-04
**Files created:** 18 (5 config, 8 src, 3 tests, 1 doc, 1 report)

## File inventory

```
packages/shared-auth/
├── .gitignore
├── README.md
├── package.json                    (ESM, peerDeps: express^5, passport^0.7)
├── tsconfig.json                   (ESNext + bundler + strict + noEmit:false)
├── vitest.config.ts
├── src/
│   ├── index.ts                    (configureAuth + re-exports)
│   ├── types.ts                    (AuthUser/IAuthStorage/AuthConfig/AuthInstance + inputs)
│   ├── auth-mode.ts                (verbatim copy)
│   ├── tenant-resolver.ts          (verbatim copy)
│   ├── serialize.ts                (extracted from auth.ts:39-64)
│   ├── auth-middleware.ts          (extracted from auth.ts:176-205, DI)
│   ├── keycloak-auth.ts            (DI + extractAppRole + NO_ROLE_FOR_APPLICATION)
│   ├── keycloak-routes.ts          (DI; 7 routes — DP-4)
│   ├── platform-health.ts          (DI db + usersTable)
│   └── express-augment.ts          (minimal Express.User augmentation)
└── __tests__/
    ├── auth-mode.test.ts           (5 tests — AC-16)
    ├── tenant-resolver.test.ts     (11 tests — AC-17)
    └── role-extraction.test.ts     (11 tests — AC-18)

docs/architecture/shared-auth-package-v1.0.md  (DP-2 + TD-SA-PKG-06 note)
```

## Verification — raw output

### AC-2 — `tsc --noEmit`
```
$ npx tsc --noEmit -p packages/shared-auth/tsconfig.json
(no output — 0 errors)
```

### AC-15 — vitest
```
 Test Files  3 passed (3)
      Tests  27 passed (27)
   Duration  1.80s
```

### AC-14 — exports
```
$ node -e "import('./packages/shared-auth/dist/index.js').then(m => console.log(Object.keys(m).sort()))"
KEYCLOAK_TO_APP_ROLE, NO_ROLE_FOR_APPLICATION, configureAuth,
extractAppRole, getAuthMode, isKeycloakMode, isPassportMode,
makeRequireAuth, makeRequireAuthKeycloak, makeRequireRole,
makeRequireRoleKeycloak, mapClaimsToAppRole, registerKeycloakAuthRoutes,
registerPlatformHealthRoute, resetAuthModeCacheForTests,
resetKeycloakClientForTests, resolveTenantId, serializeUserForClient,
syncUserFromClaims
```

### AC-20 — `npm pack --dry-run`
```
name: @cisohub/shared-auth
version: 1.0.0
filename: cisohub-shared-auth-1.0.0.tgz
package size: 20.5 kB
unpacked size: 83.0 kB
total files: 42
```

### AC-16/17/18 — test counts
```
auth-mode.test.ts:        5 (≥5 OK)
tenant-resolver.test.ts: 11 (≥11 OK)
role-extraction.test.ts: 11 (≥8  OK)
```

### Negative ACs
| ID | Check | Result |
|----|-------|--------|
| N-AC-1 | `grep "from '../" src/` | OK (empty) |
| N-AC-2 | realm_access extraction in keycloak-auth.ts | OK (only inside KeycloakClaims interface as legacy field) |
| N-AC-3 | passport-local / LocalStrategy / setupAuth / hashPassword / comparePassword | OK (empty) |
| N-AC-4 | `as any` / `@ts-ignore` / `@ts-nocheck` | OK (empty) |
| N-AC-5 | `git diff server/` | OK (empty) |
| N-AC-6 | `grep @cisohub/shared-auth server/ client/ shared/` | OK (empty) |
| N-AC-7 | `git diff package.json` | OK (empty) |

## Decision Points (DP-1..DP-7)

| ID | Decision | Implementation |
|----|----------|----------------|
| DP-1 | ESM | `package.json: type=module`, tsconfig `module=ESNext`, relative imports use `.js` extensions |
| DP-2 | Copy design doc | `docs/architecture/shared-auth-package-v1.0.md` (with TD-SA-PKG-06 note prepended) |
| DP-3 | Extend `AuthUser` | Added optional `avatar?, lang?, userType?, onboardingCompleted?, password?` |
| DP-4 | mountRoutes 7 routes | login, callback, logout, me, config, current-user, users (all wired) |
| DP-5 | Keep legacy tests in server/ | No changes under `server/__tests__/` |
| DP-6 | Backward compat `mapClaimsToAppRole` | Preserved + added `extractAppRole` next to it |
| DP-7 | No root package.json edit | Confirmed (N-AC-7) |

## Discovered during build (Q6-NEW)

- **Q6-NEW-1**: TypeScript ESM emit requires `.js` extensions on relative imports for Node ESM resolution at runtime. Applied to all `./*` imports in `src/`. No effect on consumers since they will import the bundled `dist/index.js`.
- **Q6-NEW-2**: Package needs its own minimal `Express.User` declaration (`src/express-augment.ts`) so the package can typecheck independently. Comply's existing global augmentation in `server/auth.ts` will continue to override/extend it when both are loaded together.
- **Q6-NEW-3**: `platform-health.ts` types `db`/`usersTable` as drizzle-shaped (`SQLWrapper`/`Column`) using `import type` from `drizzle-orm` rather than `as any`, satisfying N-AC-4.
- **Q6-NEW-4**: peerDependency on `passport ^0.7` added so `req.login`/`req.logout`/`req.isAuthenticated` resolve from `@types/passport`.
