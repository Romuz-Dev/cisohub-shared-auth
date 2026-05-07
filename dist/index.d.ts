/**
 * @cisohub/shared-auth — public entry point.
 *
 * `configureAuth(config)` returns an `AuthInstance` with mountable routes,
 * dual-mode middleware, and helpers. See README.md and
 * docs/architecture/shared-auth-package-v1.0.md for details.
 */
import type { AuthConfig, AuthInstance } from "./types.js";
export declare function configureAuth(config: AuthConfig): AuthInstance;
export { getAuthMode, isKeycloakMode, isPassportMode, resetAuthModeCacheForTests } from "./auth-mode.js";
export { resolveTenantId } from "./tenant-resolver.js";
export { serializeUserForClient } from "./serialize.js";
export { makeRequireAuth, makeRequireRole } from "./auth-middleware.js";
export { extractAppRole, mapClaimsToAppRole, KEYCLOAK_TO_APP_ROLE, NO_ROLE_FOR_APPLICATION, resetKeycloakClientForTests, syncUserFromClaims, makeRequireAuthKeycloak, makeRequireRoleKeycloak, type KeycloakAuthDeps, type KeycloakClaims, } from "./keycloak-auth.js";
export { registerKeycloakAuthRoutes } from "./keycloak-routes.js";
export { registerPlatformHealthRoute } from "./platform-health.js";
export type { AuthConfig, AuthInstance, AuthLogger, AuthUser, CreateAuditLogInput, CreateUserInput, HealthCheckConfig, IAuthStorage, UpdateUserInput, } from "./types.js";
export type { AuthMode } from "./auth-mode.js";
//# sourceMappingURL=index.d.ts.map