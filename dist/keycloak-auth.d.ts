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
import { type Client, type TokenSet } from "openid-client";
import { type JWTPayload } from "jose";
import type { Request, Response, NextFunction } from "express";
import "express-session";
import "./express-augment.js";
import type { AuthUser, IAuthStorage } from "./types.js";
declare module "express-session" {
    interface SessionData {
        oidc?: {
            state?: string;
            nonce?: string;
            idTokenHint?: string;
        };
    }
}
export interface KeycloakAuthDeps {
    storage: IAuthStorage;
    /** Allow-listed app roles (e.g. ['CISO','GRC_ANALYST',...]). */
    validRoles: readonly string[];
    /** Mapping of Keycloak client-role string → app role string. */
    keycloakToApp: Record<string, string>;
    /** Optional — falls back to `() => false`. */
    isDevMode?: () => boolean;
    /** Tenant resolver (injected so we don't recurse through the package barrel). */
    resolveTenantId: () => number;
}
export declare function getCallbackUrl(deps?: {
    isDevMode?: () => boolean;
}): string;
export declare function getOidcClient(deps?: {
    isDevMode?: () => boolean;
}): Promise<Client>;
export declare function resetKeycloakClientForTests(): void;
export declare function verifyAndDecodeIdToken(idToken: string, deps?: {
    isDevMode?: () => boolean;
}): Promise<JWTPayload>;
export interface OidcAuthParams {
    state: string;
    nonce: string;
}
export declare function generateOidcChecks(): OidcAuthParams;
export declare function buildAuthorizationUrl(params: OidcAuthParams, deps?: {
    isDevMode?: () => boolean;
}): Promise<string>;
export declare function exchangeCode(req: Request, expectedState: string, expectedNonce: string, deps?: {
    isDevMode?: () => boolean;
}): Promise<TokenSet>;
export declare function getEndSessionUrl(idTokenHint?: string, deps?: {
    isDevMode?: () => boolean;
}): Promise<string>;
/**
 * Default Comply role mapping. Frozen for safety. Each consumer can pass its
 * own mapping via `configureAuth({ roles: { keycloakToApp } })`.
 */
export declare const KEYCLOAK_TO_APP_ROLE: Readonly<Record<string, string>>;
/**
 * Legacy (DP-6) — preserved for backward compat. Reads from a flat realm-roles
 * array. New code should call `extractAppRole()` instead.
 */
export declare function mapClaimsToAppRole(realmRoles: ReadonlyArray<string>, keycloakToApp?: Record<string, string>, validRoles?: readonly string[]): string;
/**
 * DEC-SA-PKG-03 — read this app's role from `resource_access[clientId].roles`
 * (Keycloak Client Roles). Returns `null` when no role is mappable for this
 * app; the caller MUST treat null as a 403 (DEC-SA-PKG-04).
 *
 * - case-insensitive matching
 * - returns the first mappable role
 * - safe against missing `resource_access` / missing client / empty arrays
 */
export declare function extractAppRole(jwt: JWTPayload | KeycloakClaims, clientId: string, keycloakToApp: Record<string, string>): string | null;
export interface KeycloakClaims {
    sub: string;
    email?: string;
    preferred_username?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    /** Legacy — kept optional for backward compat (Stage 2 will drop). */
    realm_access?: {
        roles?: string[];
    };
    /** DEC-SA-PKG-03 — Client Roles. */
    resource_access?: Record<string, {
        roles?: string[];
    }>;
}
/** Sentinel error message — routes recognise this and emit 403 + audit. */
export declare const NO_ROLE_FOR_APPLICATION = "NO_ROLE_FOR_APPLICATION";
export declare function syncUserFromClaims(claims: KeycloakClaims, deps: KeycloakAuthDeps): Promise<AuthUser>;
export declare function makeRequireAuthKeycloak(validRoles: readonly string[]): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare function makeRequireRoleKeycloak(validRoles: readonly string[]): (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=keycloak-auth.d.ts.map