/**
 * AUTH_MODE flag: "passport" (default) | "keycloak".
 * Cached on first read; unknown values throw (no silent fallback).
 *
 * Copied verbatim from server/lib/auth-mode.ts (Comply) — no behavioural change.
 */

export type AuthMode = "passport" | "keycloak";

const VALID_MODES: ReadonlyArray<AuthMode> = ["passport", "keycloak"];

let cached: AuthMode | null = null;

function readMode(): AuthMode {
  const raw = (process.env.AUTH_MODE ?? "passport").toLowerCase();
  if (!VALID_MODES.includes(raw as AuthMode)) {
    throw new Error(
      `Invalid AUTH_MODE="${process.env.AUTH_MODE}". ` +
        `Must be one of: ${VALID_MODES.join(", ")}`,
    );
  }
  return raw as AuthMode;
}

export function getAuthMode(): AuthMode {
  if (cached === null) cached = readMode();
  return cached;
}

export function isKeycloakMode(): boolean {
  return getAuthMode() === "keycloak";
}

export function isPassportMode(): boolean {
  return getAuthMode() === "passport";
}

export function resetAuthModeCacheForTests(): void {
  cached = null;
}
