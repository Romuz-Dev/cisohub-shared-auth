/**
 * AUTH_MODE flag: "passport" (default) | "keycloak".
 * Cached on first read; unknown values throw (no silent fallback).
 *
 * Copied verbatim from server/lib/auth-mode.ts (Comply) — no behavioural change.
 */
export type AuthMode = "passport" | "keycloak";
export declare function getAuthMode(): AuthMode;
export declare function isKeycloakMode(): boolean;
export declare function isPassportMode(): boolean;
export declare function resetAuthModeCacheForTests(): void;
//# sourceMappingURL=auth-mode.d.ts.map