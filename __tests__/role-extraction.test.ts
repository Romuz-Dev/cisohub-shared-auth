/**
 * Tests for `extractAppRole` (DEC-SA-PKG-03 — Keycloak Client Roles).
 * Also asserts that the default mapping table is frozen.
 */
import { describe, expect, it } from "vitest";
import {
  extractAppRole,
  KEYCLOAK_TO_APP_ROLE,
  type KeycloakClaims,
} from "../src/keycloak-auth";

const DEFAULT_MAPPING: Record<string, string> = {
  ciso: "CISO",
  grc_analyst: "GRC_ANALYST",
  system_admin: "SYSTEM_ADMIN",
  auditor: "AUDITOR",
  authority: "AUTHORITY",
};

const CLIENT_ID = "comply-app";

function makeJwt(
  partial: Partial<KeycloakClaims> = {},
): KeycloakClaims {
  return { sub: "kc-uuid-1", email: "u@example.com", ...partial };
}

describe("extractAppRole (DEC-SA-PKG-03)", () => {
  it("reads the role from resource_access[clientId].roles", () => {
    const jwt = makeJwt({
      resource_access: { [CLIENT_ID]: { roles: ["ciso"] } },
    });
    expect(extractAppRole(jwt, CLIENT_ID, DEFAULT_MAPPING)).toBe("CISO");
  });

  it("returns null when there are no client roles for this app", () => {
    const jwt = makeJwt({
      resource_access: { [CLIENT_ID]: { roles: [] } },
    });
    expect(extractAppRole(jwt, CLIENT_ID, DEFAULT_MAPPING)).toBeNull();
  });

  it("returns null when the only client role is unknown", () => {
    const jwt = makeJwt({
      resource_access: { [CLIENT_ID]: { roles: ["someone-elses-role"] } },
    });
    expect(extractAppRole(jwt, CLIENT_ID, DEFAULT_MAPPING)).toBeNull();
  });

  it("returns the first mappable role when multiple roles are present", () => {
    const jwt = makeJwt({
      resource_access: {
        [CLIENT_ID]: { roles: ["unknown", "grc_analyst", "ciso"] },
      },
    });
    expect(extractAppRole(jwt, CLIENT_ID, DEFAULT_MAPPING)).toBe(
      "GRC_ANALYST",
    );
  });

  it("returns null when the clientId is not present in resource_access", () => {
    const jwt = makeJwt({
      resource_access: { "another-app": { roles: ["ciso"] } },
    });
    expect(extractAppRole(jwt, CLIENT_ID, DEFAULT_MAPPING)).toBeNull();
  });

  it("returns null when resource_access is missing entirely", () => {
    const jwt = makeJwt({});
    expect(extractAppRole(jwt, CLIENT_ID, DEFAULT_MAPPING)).toBeNull();
  });

  it("maps a known role correctly (ciso → CISO)", () => {
    const jwt = makeJwt({
      resource_access: { [CLIENT_ID]: { roles: ["ciso"] } },
    });
    expect(extractAppRole(jwt, CLIENT_ID, DEFAULT_MAPPING)).toBe("CISO");
  });

  it("matches case-insensitively (CISO → CISO)", () => {
    const jwt = makeJwt({
      resource_access: { [CLIENT_ID]: { roles: ["CISO"] } },
    });
    expect(extractAppRole(jwt, CLIENT_ID, DEFAULT_MAPPING)).toBe("CISO");
  });

  it("returns null when realm_access has roles but resource_access does not (no leak)", () => {
    const jwt = makeJwt({
      realm_access: { roles: ["ciso"] },
    });
    expect(extractAppRole(jwt, CLIENT_ID, DEFAULT_MAPPING)).toBeNull();
  });

  it("KEYCLOAK_TO_APP_ROLE is frozen", () => {
    expect(Object.isFrozen(KEYCLOAK_TO_APP_ROLE)).toBe(true);
    expect(() => {
      // @ts-expect-error — runtime mutation attempt
      KEYCLOAK_TO_APP_ROLE.ciso = "MUTATED";
    }).toThrow();
  });

  it("returns null when jwt is null/undefined", () => {
    expect(
      extractAppRole(null as unknown as KeycloakClaims, CLIENT_ID, DEFAULT_MAPPING),
    ).toBeNull();
  });
});
