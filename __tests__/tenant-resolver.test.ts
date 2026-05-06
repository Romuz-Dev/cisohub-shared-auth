import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveTenantId } from "../src/tenant-resolver";
import { resetAuthModeCacheForTests } from "../src/auth-mode";

describe("tenant-resolver (Task #931)", () => {
  let originalAuthMode: string | undefined;
  let originalTenantId: string | undefined;

  beforeEach(() => {
    originalAuthMode = process.env.AUTH_MODE;
    originalTenantId = process.env.TENANT_ID;
    resetAuthModeCacheForTests();
  });

  afterEach(() => {
    if (originalAuthMode === undefined) delete process.env.AUTH_MODE;
    else process.env.AUTH_MODE = originalAuthMode;
    if (originalTenantId === undefined) delete process.env.TENANT_ID;
    else process.env.TENANT_ID = originalTenantId;
    resetAuthModeCacheForTests();
  });

  it("AC2: keycloak + TENANT_ID=5 returns 5", () => {
    process.env.AUTH_MODE = "keycloak";
    process.env.TENANT_ID = "5";
    expect(resolveTenantId()).toBe(5);
  });

  it("AC3: keycloak + TENANT_ID missing throws 'required'", () => {
    process.env.AUTH_MODE = "keycloak";
    delete process.env.TENANT_ID;
    expect(() => resolveTenantId()).toThrowError(/required/i);
  });

  it("AC4: keycloak + TENANT_ID=abc throws 'positive integer'", () => {
    process.env.AUTH_MODE = "keycloak";
    process.env.TENANT_ID = "abc";
    expect(() => resolveTenantId()).toThrowError(/positive integer/i);
  });

  it("AC5: passport + TENANT_ID missing returns 1", () => {
    process.env.AUTH_MODE = "passport";
    delete process.env.TENANT_ID;
    expect(resolveTenantId()).toBe(1);
  });

  it("AC6: passport + TENANT_ID=5 returns 5", () => {
    process.env.AUTH_MODE = "passport";
    process.env.TENANT_ID = "5";
    expect(resolveTenantId()).toBe(5);
  });

  it("passport + TENANT_ID empty string returns 1", () => {
    process.env.AUTH_MODE = "passport";
    process.env.TENANT_ID = "";
    expect(resolveTenantId()).toBe(1);
  });

  it("keycloak + TENANT_ID with whitespace '  7  ' returns 7", () => {
    process.env.AUTH_MODE = "keycloak";
    process.env.TENANT_ID = "  7  ";
    expect(resolveTenantId()).toBe(7);
  });

  it("AC8.1 (DEC-931-02): keycloak + TENANT_ID=0 throws 'positive integer'", () => {
    process.env.AUTH_MODE = "keycloak";
    process.env.TENANT_ID = "0";
    expect(() => resolveTenantId()).toThrowError(/positive integer/i);
  });

  it("DEC-931-03: keycloak + TENANT_ID=-5 throws", () => {
    process.env.AUTH_MODE = "keycloak";
    process.env.TENANT_ID = "-5";
    expect(() => resolveTenantId()).toThrowError(/positive integer/i);
  });

  it("DEC-931-03: keycloak + TENANT_ID=3.7 throws (not integer)", () => {
    process.env.AUTH_MODE = "keycloak";
    process.env.TENANT_ID = "3.7";
    expect(() => resolveTenantId()).toThrowError(/positive integer/i);
  });

  it("keycloak + TENANT_ID whitespace-only throws 'required'", () => {
    process.env.AUTH_MODE = "keycloak";
    process.env.TENANT_ID = "   ";
    expect(() => resolveTenantId()).toThrowError(/required/i);
  });
});
