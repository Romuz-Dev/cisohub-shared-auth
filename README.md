# @cisohub/shared-auth

Shared authentication package for CISO Hub applications (Comply, Command, Defend, Aware). Provides dual-mode (Passport / Keycloak OIDC) auth with Keycloak **Client Roles** and a Storage Adapter via Dependency Injection.

> **Stage 1** — in-tree package at `packages/shared-auth/`. Not yet consumed by Comply (Stage 2 — TD-SA-PKG-01) and not yet extracted to a Git repo (Stage 3 — TD-SA-PKG-04).

## Install (future, Stage 3)

```bash
npm install git+https://github.com/USER/cisohub-shared-auth.git
```

## Usage

```ts
import { configureAuth } from "@cisohub/shared-auth";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import { logger } from "./lib/logger";
import { isDevMode } from "./lib/deployment-mode";

const auth = configureAuth({
  appName: "comply",
  roles: {
    keycloakToApp: {
      ciso: "CISO",
      grc_analyst: "GRC_ANALYST",
      system_admin: "SYSTEM_ADMIN",
      auditor: "AUDITOR",
      authority: "AUTHORITY",
    },
    validRoles: ["CISO", "GRC_ANALYST", "SYSTEM_ADMIN", "AUDITOR", "AUTHORITY"],
  },
  storage: {
    getUser: (id) => storage.getUser(id),
    getUserByEmail: (email) => storage.getUserByEmail(email),
    getUsers: () => storage.getUsers(),
    createUser: (data) => storage.createUser(data),
    updateUser: (id, data) => storage.updateUser(id, data),
    createAuditLog: (data, tenantId) => storage.createAuditLog(data, tenantId),
  },
  healthCheck: { db, usersTable: users },
  logger,
  isDevMode,
});

auth.mountRoutes(app);
auth.mountHealthRoute(app);

app.get(
  "/api/assessments",
  auth.requireAuth,
  auth.requireRole("CISO", "GRC_ANALYST"),
  handler,
);
```

## Architecture

- **DI**: storage, logger, isDevMode, db are all injected via `configureAuth(config)`.
- **Client Roles** (DEC-SA-PKG-03): roles are read from `resource_access[KEYCLOAK_CLIENT_ID].roles` in the JWT, not `realm_access.roles`.
- **No-role rejection** (DEC-SA-PKG-04): users with no mappable role for this app get HTTP 403 + audit `AUTH_LOGIN_REJECTED_NO_ROLE`. No user is created.
- **`keycloakId`** (DEC-SA-PKG-05): cross-app stable identifier persisted on first login.
- **Audit `tenantId`** (DEC-SA-PKG-06): mandatory on every `createAuditLog` call.

## Mounted routes (`mountRoutes`)

- `GET  /api/auth/login`
- `GET  /api/auth/callback`
- `POST /api/auth/logout`
- `GET  /api/auth/me`
- `GET  /api/auth/config`
- `GET  /api/current-user`
- `GET  /api/users`

`mountHealthRoute` mounts `GET /api/platform/health` and **throws** if `config.healthCheck` was not provided.

## Tests

```bash
cd packages/shared-auth
npm install
npx vitest run
```
