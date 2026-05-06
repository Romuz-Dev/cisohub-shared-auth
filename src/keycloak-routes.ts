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

import type { Express, Request, Response, RequestHandler } from "express";
import "express-session";
import "./express-augment.js";
import {
  buildAuthorizationUrl,
  exchangeCode,
  generateOidcChecks,
  getEndSessionUrl,
  syncUserFromClaims,
  verifyAndDecodeIdToken,
  NO_ROLE_FOR_APPLICATION,
  type KeycloakAuthDeps,
  type KeycloakClaims,
} from "./keycloak-auth.js";
import type { AuthLogger, AuthUser, IAuthStorage } from "./types.js";

type OidcSession = NonNullable<import("express-session").SessionData["oidc"]>;

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

function getOidcSession(req: Request): OidcSession {
  if (!req.session.oidc) req.session.oidc = {};
  return req.session.oidc;
}

function errMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "unknown error";
  }
}

function loginUser(req: Request, user: Express.User): Promise<void> {
  return new Promise((resolve, reject) => {
    req.login(user, (err) => (err ? reject(err) : resolve()));
  });
}

export function registerKeycloakAuthRoutes(
  app: Express,
  deps: KeycloakRoutesDeps,
): void {
  const { storage, logger, serializeUserForClient, resolveTenantId } = deps;

  function handleCurrentUser(req: Request, res: Response) {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    return res.json(serializeUserForClient(req.user as unknown as AuthUser));
  }

  // ── GET /api/auth/login ────────────────────────────────────────────
  app.get("/api/auth/login", async (req, res) => {
    try {
      const checks = generateOidcChecks();
      const oidc = getOidcSession(req);
      oidc.state = checks.state;
      oidc.nonce = checks.nonce;
      await new Promise<void>((resolve, reject) =>
        req.session.save((err) => (err ? reject(err) : resolve())),
      );
      const url = await buildAuthorizationUrl(checks, deps);
      return res.redirect(302, url);
    } catch (err: unknown) {
      logger.error("[keycloak] /api/auth/login failed:", err);
      return res.status(500).json({ error: "Failed to initiate login" });
    }
  });

  // ── GET /api/auth/callback ─────────────────────────────────────────
  app.get("/api/auth/callback", async (req, res) => {
    const ipAddress = req.ip || req.socket.remoteAddress || null;
    const oidc = getOidcSession(req);
    const expectedState = oidc.state;
    const expectedNonce = oidc.nonce;
    if (!expectedState || !expectedNonce) {
      storage
        .createAuditLog(
          {
            userId: "SYSTEM",
            action: "AUTH_LOGIN_FAILED",
            entityType: "AUTH",
            entityId: null,
            details: { reason: "Missing OIDC state/nonce in session", ip: ipAddress },
            ipAddress,
          },
          resolveTenantId(),
        )
        .catch(() => {});
      return res.status(400).json({ error: "Invalid login state" });
    }
    try {
      const tokenSet = await exchangeCode(
        req,
        expectedState,
        expectedNonce,
        deps,
      );
      if (!tokenSet.id_token) throw new Error("Token response missing id_token");
      await verifyAndDecodeIdToken(tokenSet.id_token, deps);
      const claims = tokenSet.claims() as KeycloakClaims;
      const user = await syncUserFromClaims(claims, deps);
      await loginUser(req, user as unknown as Express.User);
      const oidcAfter = getOidcSession(req);
      oidcAfter.state = undefined;
      oidcAfter.nonce = undefined;
      oidcAfter.idTokenHint = tokenSet.id_token;
      await new Promise<void>((resolve, reject) =>
        req.session.save((err) => (err ? reject(err) : resolve())),
      );
      storage
        .createAuditLog(
          {
            userId: user.id,
            action: "AUTH_LOGIN_SUCCESS",
            entityType: "AUTH",
            entityId: user.id,
            details: { email: user.email, ip: ipAddress, mode: "keycloak" },
            ipAddress,
          },
          user.tenantId,
        )
        .catch(() => {});
      return res.redirect(302, "/");
    } catch (err: unknown) {
      logger.error("[keycloak] /api/auth/callback failed:", err);
      const reason = errMessage(err);
      const isNoRole = reason.includes(NO_ROLE_FOR_APPLICATION);
      // DEC-SA-PKG-04 — distinct audit action for "no role for this app".
      const auditAction = isNoRole
        ? "AUTH_LOGIN_REJECTED_NO_ROLE"
        : "AUTH_LOGIN_FAILED";
      storage
        .createAuditLog(
          {
            userId: "SYSTEM",
            action: auditAction,
            entityType: "AUTH",
            entityId: null,
            details: {
              reason,
              ip: ipAddress,
              mode: "keycloak",
              app: deps.appName,
            },
            ipAddress,
          },
          resolveTenantId(),
        )
        .catch(() => {});
      const isForbidden =
        isNoRole ||
        reason.includes("No mappable role") ||
        reason.includes("No realm roles") ||
        reason.includes("ACCOUNT_DISABLED") ||
        reason.includes("KEYCLOAK_ID_MISMATCH");
      const body = isNoRole
        ? { error: "No role assigned for this application" }
        : reason.includes("ACCOUNT_DISABLED")
          ? { error: "Account is inactive" }
          : reason.includes("KEYCLOAK_ID_MISMATCH")
            ? { error: "Account is bound to a different identity" }
            : { error: "Authentication failed" };
      return res.status(isForbidden ? 403 : 401).json(body);
    }
  });

  // ── POST /api/auth/logout ──────────────────────────────────────────
  app.post("/api/auth/logout", async (req, res) => {
    const userId = (req.user as { id?: string } | undefined)?.id ?? null;
    const tenantIdAtLogout =
      (req.user as { tenantId?: number } | undefined)?.tenantId ??
      resolveTenantId();
    const ipAddress = req.ip || req.socket.remoteAddress || null;
    const oidc = getOidcSession(req);
    const idTokenHint = oidc.idTokenHint;
    let endSessionUrl: string | null = null;
    try {
      endSessionUrl = await getEndSessionUrl(idTokenHint, deps);
    } catch (err: unknown) {
      logger.warn("[keycloak] Failed to build end_session_url:", err);
    }
    req.logout((logoutErr) => {
      if (logoutErr) {
        logger.error("[keycloak] req.logout failed:", logoutErr);
        return res.status(500).json({ error: "Logout failed" });
      }
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          logger.error("[keycloak] session destroy failed:", destroyErr);
          return res.status(500).json({ error: "Session destroy failed" });
        }
        res.clearCookie("connect.sid");
        if (userId) {
          storage
            .createAuditLog(
              {
                userId,
                action: "AUTH_LOGOUT",
                entityType: "AUTH",
                entityId: userId,
                details: { ip: ipAddress, mode: "keycloak" },
                ipAddress,
              },
              tenantIdAtLogout,
            )
            .catch(() => {});
        }
        return res.json({ success: true, logoutUrl: endSessionUrl ?? null });
      });
    });
  });

  app.get("/api/auth/me", handleCurrentUser);
  app.get("/api/current-user", handleCurrentUser);

  // ── GET /api/auth/config ───────────────────────────────────────────
  // Lightweight config endpoint (TD-SA-PKG-06 — reconciliation with
  // Comply's existing routes-auth.ts:14). Reports auth mode + app name so
  // the SPA can decide whether to show the password form.
  app.get("/api/auth/config", (_req, res) => {
    res.json({
      appName: deps.appName,
      mode: process.env.AUTH_MODE === "keycloak" ? "keycloak" : "passport",
    });
  });

  // ── GET /api/users ─────────────────────────────────────────────────
  app.get("/api/users", deps.requireAuth, async (_req, res) => {
    try {
      const allUsers = await storage.getUsers();
      res.json(
        allUsers.map((u) => serializeUserForClient(u)),
      );
    } catch (err: unknown) {
      logger.error("GET /api/users error:", err);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
}
