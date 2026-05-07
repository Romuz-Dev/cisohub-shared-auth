/**
 * requireAuth / requireRole — dual-mode (Passport / Keycloak) middleware.
 * Extracted from server/auth.ts:176-205. The DI-aware Keycloak variants are
 * created via factories from ./keycloak-auth (so validRoles is injected).
 */
import type { RequestHandler } from "express";
import "./express-augment.js";
export interface AuthMiddlewareDeps {
    validRoles: readonly string[];
}
export declare function makeRequireAuth(deps: AuthMiddlewareDeps): RequestHandler;
export declare function makeRequireRole(deps: AuthMiddlewareDeps): (...roles: string[]) => RequestHandler;
//# sourceMappingURL=auth-middleware.d.ts.map