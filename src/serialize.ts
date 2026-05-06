/**
 * serializeUserForClient — strips sensitive fields and renames to snake_case
 * for the client. Extracted from server/auth.ts:39-64.
 */
import type { AuthUser } from "./types.js";

export function serializeUserForClient(
  user: AuthUser,
): Partial<AuthUser> & Record<string, unknown> {
  return {
    id: user.id,
    email: user.email,
    name_ar: user.nameAr ?? null,
    name_en: user.nameEn ?? null,
    role: user.role,
    avatar: user.avatar ?? null,
    lang: user.lang ?? "ar",
    userType: user.userType,
    onboardingCompleted: user.onboardingCompleted,
    status: user.status,
  };
}
