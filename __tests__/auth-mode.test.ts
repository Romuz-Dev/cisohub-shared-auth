import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getAuthMode,
  isKeycloakMode,
  isPassportMode,
  resetAuthModeCacheForTests,
} from "../src/auth-mode";

describe("auth-mode flag (T1a-B1 R2)", () => {
  let original: string | undefined;

  beforeEach(() => {
    original = process.env.AUTH_MODE;
    resetAuthModeCacheForTests();
  });

  afterEach(() => {
    if (original === undefined) delete process.env.AUTH_MODE;
    else process.env.AUTH_MODE = original;
    resetAuthModeCacheForTests();
  });

  it("defaults to 'passport' when AUTH_MODE is unset", () => {
    delete process.env.AUTH_MODE;
    expect(getAuthMode()).toBe("passport");
    expect(isPassportMode()).toBe(true);
    expect(isKeycloakMode()).toBe(false);
  });

  it("returns 'passport' when AUTH_MODE=passport", () => {
    process.env.AUTH_MODE = "passport";
    expect(getAuthMode()).toBe("passport");
    expect(isPassportMode()).toBe(true);
    expect(isKeycloakMode()).toBe(false);
  });

  it("returns 'keycloak' when AUTH_MODE=keycloak (case-insensitive)", () => {
    process.env.AUTH_MODE = "KeyCloak";
    expect(getAuthMode()).toBe("keycloak");
    expect(isKeycloakMode()).toBe(true);
    expect(isPassportMode()).toBe(false);
  });

  it("throws on unknown AUTH_MODE values", () => {
    process.env.AUTH_MODE = "bogus";
    expect(() => getAuthMode()).toThrowError(/Invalid AUTH_MODE/);
  });

  it("caches the resolved value across calls", () => {
    process.env.AUTH_MODE = "passport";
    expect(getAuthMode()).toBe("passport");
    process.env.AUTH_MODE = "keycloak";
    // Cached — stays passport until cache reset.
    expect(getAuthMode()).toBe("passport");
    resetAuthModeCacheForTests();
    expect(getAuthMode()).toBe("keycloak");
  });
});
