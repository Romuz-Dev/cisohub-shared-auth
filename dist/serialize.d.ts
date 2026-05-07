/**
 * serializeUserForClient — strips sensitive fields and renames to snake_case
 * for the client. Extracted from server/auth.ts:39-64.
 */
import type { AuthUser } from "./types.js";
export declare function serializeUserForClient(user: AuthUser): Partial<AuthUser> & Record<string, unknown>;
//# sourceMappingURL=serialize.d.ts.map