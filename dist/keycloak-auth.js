/**
 * Keycloak OIDC integration: lazy openid-client singleton, jose-backed
 * ID-token verification, role allow-list mapping, user sync, and middleware.
 *
 * Adapted from server/lib/keycloak-auth.ts:
 *  - storage / VALID_ROLES / isDevMode are no longer module-level imports;
 *    they are received via a `KeycloakAuthDeps` closure (DI — DEC-SA-PKG-02).
 *  - Adds `extractAppRole(jwt, clientId, mapping)` reading from
 *    `resource_access[clientId].roles` (Client Roles — DEC-SA-PKG-03).
 *  - `mapClaimsToAppRole` is preserved as-is for backward compat (DP-6).
 *  - When no role is mappable for this app, `syncUserFromClaims` throws
 *    `NO_ROLE_FOR_APPLICATION`; routes catch it → 403 + audit
 *    `AUTH_LOGIN_REJECTED_NO_ROLE` (DEC-SA-PKG-04).
 */
import { Issuer, generators } from "openid-client";
import { createRemoteJWKSet, jwtVerify } from "jose";
import "express-session";
import "./express-augment.js";
// ─── Config helpers ────────────────────────────────────────────────────
function requireEnv(name) {
    const v = process.env[name];
    if (!v || v.trim().length === 0) {
        throw new Error(`[keycloak] Missing required env var: ${name}. Required when AUTH_MODE=keycloak.`);
    }
    return v.trim();
}
export function getCallbackUrl(deps) {
    const explicit = process.env.KEYCLOAK_CALLBACK_URL;
    if (explicit && explicit.trim().length > 0)
        return explicit.trim();
    const base = process.env.APP_BASE_URL;
    if (base && base.trim().length > 0) {
        return `${base.trim().replace(/\/+$/, "")}/api/auth/callback`;
    }
    if (deps?.isDevMode?.())
        return "http://localhost:5000/api/auth/callback";
    throw new Error("[keycloak] Cannot derive callback URL. Set KEYCLOAK_CALLBACK_URL or APP_BASE_URL.");
}
function getPostLogoutRedirectUri(deps) {
    const explicit = process.env.KEYCLOAK_POST_LOGOUT_REDIRECT_URI;
    if (explicit && explicit.trim().length > 0)
        return explicit.trim();
    const base = process.env.APP_BASE_URL;
    if (base && base.trim().length > 0) {
        return `${base.trim().replace(/\/+$/, "")}/`;
    }
    if (deps?.isDevMode?.())
        return "http://localhost:5000/";
    throw new Error("[keycloak] Cannot derive post-logout redirect URI. Set KEYCLOAK_POST_LOGOUT_REDIRECT_URI or APP_BASE_URL.");
}
// ─── OIDC client (lazy singleton) ───────────────────────────────────────
let cachedClient = null;
let cachedIssuer = null;
let cachedJwks = null;
export async function getOidcClient(deps) {
    if (cachedClient)
        return cachedClient;
    const url = requireEnv("KEYCLOAK_URL").replace(/\/+$/, "");
    const realm = requireEnv("KEYCLOAK_REALM");
    const clientId = requireEnv("KEYCLOAK_CLIENT_ID");
    const clientSecret = requireEnv("KEYCLOAK_CLIENT_SECRET");
    const issuer = await Issuer.discover(`${url}/realms/${realm}/.well-known/openid-configuration`);
    cachedIssuer = issuer;
    cachedClient = new issuer.Client({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uris: [getCallbackUrl(deps)],
        response_types: ["code"],
    });
    return cachedClient;
}
export function resetKeycloakClientForTests() {
    cachedClient = null;
    cachedIssuer = null;
    cachedJwks = null;
}
// ─── Defense-in-depth ID-token verification ────────────────────────────
async function getJwks(deps) {
    if (cachedJwks)
        return cachedJwks;
    await getOidcClient(deps);
    const jwksUri = cachedIssuer?.metadata.jwks_uri;
    if (!jwksUri)
        throw new Error("[keycloak] Issuer metadata is missing jwks_uri");
    cachedJwks = createRemoteJWKSet(new URL(jwksUri));
    return cachedJwks;
}
export async function verifyAndDecodeIdToken(idToken, deps) {
    if (!idToken || typeof idToken !== "string") {
        throw new Error("[keycloak] verifyAndDecodeIdToken: missing id_token");
    }
    const jwks = await getJwks(deps);
    const url = requireEnv("KEYCLOAK_URL").replace(/\/+$/, "");
    const realm = requireEnv("KEYCLOAK_REALM");
    const clientId = requireEnv("KEYCLOAK_CLIENT_ID");
    const { payload } = await jwtVerify(idToken, jwks, {
        issuer: `${url}/realms/${realm}`,
        audience: clientId,
    });
    return payload;
}
export function generateOidcChecks() {
    return { state: generators.state(), nonce: generators.nonce() };
}
export async function buildAuthorizationUrl(params, deps) {
    const client = await getOidcClient(deps);
    return client.authorizationUrl({
        scope: "openid profile email",
        state: params.state,
        nonce: params.nonce,
    });
}
export async function exchangeCode(req, expectedState, expectedNonce, deps) {
    const client = await getOidcClient(deps);
    const params = client.callbackParams(req);
    return client.callback(getCallbackUrl(deps), params, {
        state: expectedState,
        nonce: expectedNonce,
    });
}
export async function getEndSessionUrl(idTokenHint, deps) {
    const client = await getOidcClient(deps);
    return client.endSessionUrl({
        id_token_hint: idTokenHint,
        post_logout_redirect_uri: getPostLogoutRedirectUri(deps),
    });
}
// ─── Role mapping ──────────────────────────────────────────────────────
/**
 * Default Comply role mapping. Frozen for safety. Each consumer can pass its
 * own mapping via `configureAuth({ roles: { keycloakToApp } })`.
 */
export const KEYCLOAK_TO_APP_ROLE = Object.freeze({
    ciso: "CISO",
    grc_analyst: "GRC_ANALYST",
    system_admin: "SYSTEM_ADMIN",
    auditor: "AUDITOR",
    authority: "AUTHORITY",
});
/**
 * Legacy (DP-6) — preserved for backward compat. Reads from a flat realm-roles
 * array. New code should call `extractAppRole()` instead.
 */
export function mapClaimsToAppRole(realmRoles, keycloakToApp = KEYCLOAK_TO_APP_ROLE, validRoles = Object.values(KEYCLOAK_TO_APP_ROLE)) {
    if (!Array.isArray(realmRoles) || realmRoles.length === 0) {
        throw new Error("[keycloak] No realm roles in token");
    }
    for (const r of realmRoles) {
        const key = typeof r === "string" ? r.toLowerCase() : "";
        const mapped = keycloakToApp[key];
        if (mapped && validRoles.includes(mapped))
            return mapped;
    }
    throw new Error(`[keycloak] No mappable role found in realm roles: ${realmRoles.join(", ")}`);
}
/**
 * DEC-SA-PKG-03 — read this app's role from `resource_access[clientId].roles`
 * (Keycloak Client Roles). Returns `null` when no role is mappable for this
 * app; the caller MUST treat null as a 403 (DEC-SA-PKG-04).
 *
 * - case-insensitive matching
 * - returns the first mappable role
 * - safe against missing `resource_access` / missing client / empty arrays
 */
export function extractAppRole(jwt, clientId, keycloakToApp) {
    if (!jwt || typeof jwt !== "object")
        return null;
    const ra = jwt.resource_access;
    if (!ra || typeof ra !== "object")
        return null;
    const entry = ra[clientId];
    const roles = Array.isArray(entry?.roles) ? entry.roles : [];
    if (roles.length === 0)
        return null;
    for (const r of roles) {
        const key = typeof r === "string" ? r.toLowerCase() : "";
        if (key && Object.prototype.hasOwnProperty.call(keycloakToApp, key)) {
            return keycloakToApp[key];
        }
    }
    return null;
}
/** Sentinel error message — routes recognise this and emit 403 + audit. */
export const NO_ROLE_FOR_APPLICATION = "NO_ROLE_FOR_APPLICATION";
export async function syncUserFromClaims(claims, deps) {
    if (!claims.email || claims.email.trim().length === 0) {
        throw new Error("[keycloak] ID token missing required claim: email");
    }
    const email = claims.email.trim().toLowerCase();
    const clientId = requireEnv("KEYCLOAK_CLIENT_ID");
    const role = extractAppRole(claims, clientId, deps.keycloakToApp);
    if (role === null || !deps.validRoles.includes(role)) {
        // DEC-SA-PKG-04 — no creation, no update, hard reject.
        throw new Error(NO_ROLE_FOR_APPLICATION);
    }
    const displayName = claims.name ||
        claims.preferred_username ||
        [claims.given_name, claims.family_name].filter(Boolean).join(" ") ||
        email;
    const existing = await deps.storage.getUserByEmail(email);
    if (existing) {
        if (existing.status && existing.status !== "ACTIVE") {
            throw new Error("ACCOUNT_DISABLED");
        }
        if (existing.keycloakId && existing.keycloakId !== claims.sub) {
            throw new Error("KEYCLOAK_ID_MISMATCH");
        }
        const patch = { lastLoginAt: new Date() };
        if (!existing.keycloakId)
            patch.keycloakId = claims.sub;
        const updated = await deps.storage.updateUser(existing.id, patch);
        return updated ?? existing;
    }
    const created = {
        email,
        keycloakId: claims.sub,
        nameAr: displayName,
        nameEn: displayName,
        role,
        status: "ACTIVE",
        userType: "INTERNAL",
        tenantId: deps.resolveTenantId(),
        password: null,
    };
    return deps.storage.createUser(created);
}
// ─── Middleware ────────────────────────────────────────────────────────
// In keycloak mode the callback ends with Passport's req.login(), so
// req.user / req.isAuthenticated() work like in passport mode.
export function makeRequireAuthKeycloak(validRoles) {
    return function requireAuthKeycloak(req, res, next) {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Authentication required" });
        }
        const role = req.user?.role;
        if (!role || !validRoles.includes(role)) {
            return res.status(403).json({ message: "NO_ROLE_ASSIGNED" });
        }
        return next();
    };
}
export function makeRequireRoleKeycloak(validRoles) {
    return function requireRoleKeycloak(...roles) {
        return (req, res, next) => {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ error: "Authentication required" });
            }
            const role = req.user?.role;
            if (!role || !validRoles.includes(role)) {
                return res.status(403).json({ message: "NO_ROLE_ASSIGNED" });
            }
            if (!roles.includes(role)) {
                return res.status(403).json({ error: "Insufficient permissions" });
            }
            next();
        };
    };
}
//# sourceMappingURL=keycloak-auth.js.map