/**
 * requireAuth / requireRole — dual-mode (Passport / Keycloak) middleware.
 * Extracted from server/auth.ts:176-205. The DI-aware Keycloak variants are
 * created via factories from ./keycloak-auth (so validRoles is injected).
 */
import type { Request, Response, NextFunction, RequestHandler } from "express";
import "./express-augment.js";
import { isKeycloakMode } from "./auth-mode.js";
import {
  makeRequireAuthKeycloak,
  makeRequireRoleKeycloak,
} from "./keycloak-auth.js";

export interface AuthMiddlewareDeps {
  validRoles: readonly string[];
}

export function makeRequireAuth(deps: AuthMiddlewareDeps): RequestHandler {
  const requireAuthKeycloak = makeRequireAuthKeycloak(deps.validRoles);
  return function requireAuth(req: Request, res: Response, next: NextFunction) {
    // T1a-B1 (DEC-B1-01): dual-mode dispatch.
    if (isKeycloakMode()) return requireAuthKeycloak(req, res, next);
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const role = (req.user as { role?: string } | undefined)?.role;
    if (!role || !deps.validRoles.includes(role)) {
      return res.status(403).json({ message: "NO_ROLE_ASSIGNED" });
    }
    return next();
  };
}

export function makeRequireRole(deps: AuthMiddlewareDeps) {
  const requireRoleKeycloak = makeRequireRoleKeycloak(deps.validRoles);
  return function requireRole(...roles: string[]): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      if (isKeycloakMode()) return requireRoleKeycloak(...roles)(req, res, next);
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const role = (req.user as { role?: string } | undefined)?.role;
      if (!role || !deps.validRoles.includes(role)) {
        return res.status(403).json({ message: "NO_ROLE_ASSIGNED" });
      }
      if (!roles.includes(role)) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      next();
    };
  };
}
