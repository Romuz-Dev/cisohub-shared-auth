/**
 * AUTH_MODE flag: "passport" (default) | "keycloak".
 * Cached on first read; unknown values throw (no silent fallback).
 *
 * Copied verbatim from server/lib/auth-mode.ts (Comply) — no behavioural change.
 */
const VALID_MODES = ["passport", "keycloak"];
let cached = null;
function readMode() {
    const raw = (process.env.AUTH_MODE ?? "passport").toLowerCase();
    if (!VALID_MODES.includes(raw)) {
        throw new Error(`Invalid AUTH_MODE="${process.env.AUTH_MODE}". ` +
            `Must be one of: ${VALID_MODES.join(", ")}`);
    }
    return raw;
}
export function getAuthMode() {
    if (cached === null)
        cached = readMode();
    return cached;
}
export function isKeycloakMode() {
    return getAuthMode() === "keycloak";
}
export function isPassportMode() {
    return getAuthMode() === "passport";
}
export function resetAuthModeCacheForTests() {
    cached = null;
}
//# sourceMappingURL=auth-mode.js.map