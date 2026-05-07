/**
 * Keycloak auth routes (login / callback / logout / me / config / current-user / users).
 * Adapted from server/lib/keycloak-routes.ts — storage, logger, serializer
 * and tenant-resolver are received via DI rather than module imports.
 *
 * Routes registered (DP-4):
 *   GET  /api/auth/login
 *   GET  /api/auth/callback
 *   POST /api/auth/logout
 *   GET  /api/auth/me
 *   GET  /api/auth/config
 *   GET  /api/current-user
 *   GET  /api/users
 *
 * NB: When `extractAppRole` returns null, syncUserFromClaims throws
 * `NO_ROLE_FOR_APPLICATION`; the callback below catches it, returns 403,
 * and writes audit `AUTH_LOGIN_REJECTED_NO_ROLE` (DEC-SA-PKG-04).
 */
import type { Express, RequestHandler } from "express";
import "express-session";
import "./express-augment.js";
import { type KeycloakAuthDeps } from "./keycloak-auth.js";
import type { AuthLogger, AuthUser, IAuthStorage } from "./types.js";
export interface KeycloakRoutesDeps extends KeycloakAuthDeps {
    storage: IAuthStorage;
    logger: AuthLogger;
    serializeUserForClient: (user: AuthUser) => unknown;
    resolveTenantId: () => number;
    /** Pre-built auth middleware (dual-mode) used by `/api/users`. */
    requireAuth: RequestHandler;
    /** App name — exposed via /api/auth/config. */
    appName: string;
}
export declare function registerKeycloakAuthRoutes(app: Express, deps: KeycloakRoutesDeps): void;
//# sourceMappingURL=keycloak-routes.d.ts.map