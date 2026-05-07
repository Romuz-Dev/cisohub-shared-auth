/**
 * GET /api/platform/health — adapted from server/routes-platform.ts.
 * `db` and `usersTable` are injected via `config.healthCheck` (DEC-SA-PKG-07).
 * If `mountHealthRoute()` is called without `healthCheck`, throws.
 */
import type { Express } from "express";
import type { HealthCheckConfig } from "./types.js";
export declare function registerPlatformHealthRoute(app: Express, healthCheck: HealthCheckConfig | undefined): void;
//# sourceMappingURL=platform-health.d.ts.map