/**
 * @cisohub/shared-auth — public entry point.
 *
 * `configureAuth(config)` returns an `AuthInstance` with mountable routes,
 * dual-mode middleware, and helpers. See README.md and
 * docs/architecture/shared-auth-package-v1.0.md for details.
 */

import type { Express } from "express";
import {
  getAuthMode,
  isKeycloakMode,
  isPassportMode,
  resetAuthModeCacheForTests,
} from "./auth-mode.js";
import { resolveTenantId } from "./tenant-resolver.js";
import { serializeUserForClient } from "./serialize.js";
import { makeRequireAuth, makeRequireRole } from "./auth-middleware.js";
import { registerKeycloakAuthRoutes } from "./keycloak-routes.js";
import { registerPlatformHealthRoute } from "./platform-health.js";
import type {
  AuthConfig,
  AuthInstance,
  AuthLogger,
  AuthUser,
} from "./types.js";

function defaultLogger(): AuthLogger {
  return {
    // eslint-disable-next-line no-console
    info: (msg, ...args) => console.info(msg, ...args),
    // eslint-disable-next-line no-console
    warn: (msg, ...args) => console.warn(msg, ...args),
    // eslint-disable-next-line no-console
    error: (msg, ...args) => console.error(msg, ...args),
  };
}

export function configureAuth(config: AuthConfig): AuthInstance {
  const logger: AuthLogger = config.logger ?? defaultLogger();
  const isDevMode = config.isDevMode ?? (() => false);
  const validRoles = config.roles.validRoles;
  const keycloakToApp = config.roles.keycloakToApp;

  const requireAuth = makeRequireAuth({ validRoles });
  const requireRoleFactory = makeRequireRole({ validRoles });

  const instance: AuthInstance = {
    mountRoutes(app: Express) {
      registerKeycloakAuthRoutes(app, {
        appName: config.appName,
        storage: config.storage,
        logger,
        serializeUserForClient: (u: AuthUser) => serializeUserForClient(u),
        resolveTenantId,
        validRoles,
        keycloakToApp,
        isDevMode,
        requireAuth,
      });
    },
    mountHealthRoute(app: Express) {
      registerPlatformHealthRoute(app, config.healthCheck);
    },
    requireAuth,
    requireRole: (...roles: string[]) => requireRoleFactory(...roles),
    serializeUserForClient,
    resolveTenantId,
    isKeycloakMode,
    isPassportMode,
    resetAuthModeCacheForTests,
  };

  return instance;
}

// ── Re-exports (AC-14) ─────────────────────────────────────────────────
export { getAuthMode, isKeycloakMode, isPassportMode, resetAuthModeCacheForTests } from "./auth-mode.js";
export { resolveTenantId } from "./tenant-resolver.js";
export { serializeUserForClient } from "./serialize.js";
export { makeRequireAuth, makeRequireRole } from "./auth-middleware.js";
export {
  extractAppRole,
  mapClaimsToAppRole,
  KEYCLOAK_TO_APP_ROLE,
  NO_ROLE_FOR_APPLICATION,
  resetKeycloakClientForTests,
  syncUserFromClaims,
  makeRequireAuthKeycloak,
  makeRequireRoleKeycloak,
  type KeycloakAuthDeps,
  type KeycloakClaims,
} from "./keycloak-auth.js";
export { registerKeycloakAuthRoutes } from "./keycloak-routes.js";
export { registerPlatformHealthRoute } from "./platform-health.js";
export type {
  AuthConfig,
  AuthInstance,
  AuthLogger,
  AuthUser,
  CreateAuditLogInput,
  CreateUserInput,
  HealthCheckConfig,
  IAuthStorage,
  UpdateUserInput,
} from "./types.js";
export type { AuthMode } from "./auth-mode.js";
