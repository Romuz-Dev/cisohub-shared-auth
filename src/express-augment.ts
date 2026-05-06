/**
 * Minimal Express.User augmentation for the package's own type-checking.
 * Consumers can augment further (Comply does, in server/auth.ts).
 */
import "passport";
import "express-session";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // The package only relies on these three fields. Consumers may extend.
    interface User {
      id: string;
      email: string;
      role: string;
      tenantId: number;
      keycloakId?: string | null;
      status?: string;
    }
  }
}

export {};
