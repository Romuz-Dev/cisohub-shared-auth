/**
 * Tenant Resolver — pure function reading TENANT_ID from env (Task #931).
 * In keycloak mode TENANT_ID is REQUIRED (no silent fallback).
 * In passport mode it falls back to 1 for backward compatibility.
 * Closes TD-T1a-B1-02. See ADR-017 (Database-per-Tenant) + DEC-T1a-06.
 *
 * Copied verbatim from server/lib/tenant-resolver.ts — no behavioural change.
 */
import { isKeycloakMode } from "./auth-mode.js";

export function resolveTenantId(): number {
  const raw = process.env.TENANT_ID?.trim();
  if (!raw) {
    if (isKeycloakMode()) {
      throw new Error(
        "TENANT_ID environment variable is required in keycloak mode",
      );
    }
    return 1;
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(
      `TENANT_ID must be a positive integer (got: "${raw}")`,
    );
  }
  return n;
}
