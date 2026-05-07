/**
 * Public type surface for @cisohub/shared-auth.
 * See docs/architecture/shared-auth-package-v1.0.md (§4) for context.
 */
import type { Express, RequestHandler } from "express";
/**
 * The minimum shape every consuming app's user must satisfy.
 * `id` differs per app DB. `keycloakId` (DEC-SA-PKG-05) is the cross-app link.
 *
 * NOTE (DP-3): some optional fields are added so that Comply's User type is
 * structurally assignable. They are NOT required by the package itself.
 */
export interface AuthUser {
    id: string;
    email: string;
    role: string;
    tenantId: number;
    keycloakId?: string | null;
    status?: string;
    nameEn?: string | null;
    nameAr?: string | null;
    lastLoginAt?: Date | null;
    avatar?: string | null;
    lang?: string | null;
    userType?: string;
    onboardingCompleted?: boolean;
    password?: string | null;
}
export interface CreateUserInput {
    email: string;
    role: string;
    tenantId: number;
    keycloakId?: string | null;
    nameEn?: string | null;
    nameAr?: string | null;
    password?: string | null;
    status?: string;
    userType?: string;
}
export interface UpdateUserInput {
    role?: string;
    keycloakId?: string | null;
    nameEn?: string | null;
    nameAr?: string | null;
    lastLoginAt?: Date;
    status?: string;
    [extra: string]: unknown;
}
export interface CreateAuditLogInput {
    action: string;
    entityType?: string;
    entityId?: string | null;
    details?: unknown;
    userId?: string | number | null;
    ipAddress?: string | null;
}
/**
 * Storage adapter — DEC-SA-PKG-02. Each consumer wires its own implementation.
 * `createAuditLog` requires `tenantId` (DEC-SA-PKG-06 — no default leak).
 */
export interface IAuthStorage {
    getUser(id: string): Promise<AuthUser | undefined>;
    getUserByEmail(email: string): Promise<AuthUser | undefined>;
    getUsers(): Promise<AuthUser[]>;
    createUser(data: CreateUserInput): Promise<AuthUser>;
    updateUser(id: string, data: UpdateUserInput): Promise<AuthUser | undefined>;
    createAuditLog(data: CreateAuditLogInput, tenantId: number): Promise<unknown>;
}
export interface AuthLogger {
    info: (msg: string, ...args: unknown[]) => void;
    warn: (msg: string, ...args: unknown[]) => void;
    error: (msg: string, ...args: unknown[]) => void;
}
export interface HealthCheckConfig {
    /** Drizzle (or Drizzle-compatible) instance. */
    db: unknown;
    /** Reference to the users table schema. */
    usersTable: unknown;
}
export interface AuthConfig {
    /** App name — 'comply' | 'command' | 'defend' | 'aware'. */
    appName: string;
    roles: {
        keycloakToApp: Record<string, string>;
        validRoles: readonly string[];
    };
    storage: IAuthStorage;
    /** Required only if `mountHealthRoute()` will be called (DEC-SA-PKG-07). */
    healthCheck?: HealthCheckConfig;
    /** Optional — falls back to `console`. */
    logger?: AuthLogger;
    /** Optional — falls back to `() => false`. */
    isDevMode?: () => boolean;
}
export interface AuthInstance {
    /**
     * Mounts the full Keycloak route set:
     *   GET  /api/auth/login
     *   GET  /api/auth/callback
     *   POST /api/auth/logout
     *   GET  /api/auth/me
     *   GET  /api/auth/config
     *   GET  /api/current-user
     *   GET  /api/users
     * (DP-4 — superset of original §4.7 design + reality reconciliation.)
     */
    mountRoutes(app: Express): void;
    /** Mounts GET /api/platform/health. Throws if `healthCheck` was not provided. */
    mountHealthRoute(app: Express): void;
    requireAuth: RequestHandler;
    requireRole(...roles: string[]): RequestHandler;
    serializeUserForClient(user: AuthUser): Partial<AuthUser> & Record<string, unknown>;
    resolveTenantId(): number;
    isKeycloakMode(): boolean;
    isPassportMode(): boolean;
    resetAuthModeCacheForTests(): void;
}
//# sourceMappingURL=types.d.ts.map