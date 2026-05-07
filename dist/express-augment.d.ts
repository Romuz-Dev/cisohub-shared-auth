/**
 * Minimal Express.User augmentation for the package's own type-checking.
 * Consumers can augment further (Comply does, in server/auth.ts).
 */
import "passport";
import "express-session";
declare global {
    namespace Express {
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
//# sourceMappingURL=express-augment.d.ts.map