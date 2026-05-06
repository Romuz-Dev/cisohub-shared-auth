import "./express-augment.js";
import { isKeycloakMode } from "./auth-mode.js";
import { makeRequireAuthKeycloak, makeRequireRoleKeycloak, } from "./keycloak-auth.js";
export function makeRequireAuth(deps) {
    const requireAuthKeycloak = makeRequireAuthKeycloak(deps.validRoles);
    return function requireAuth(req, res, next) {
        // T1a-B1 (DEC-B1-01): dual-mode dispatch.
        if (isKeycloakMode())
            return requireAuthKeycloak(req, res, next);
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Authentication required" });
        }
        const role = req.user?.role;
        if (!role || !deps.validRoles.includes(role)) {
            return res.status(403).json({ message: "NO_ROLE_ASSIGNED" });
        }
        return next();
    };
}
export function makeRequireRole(deps) {
    const requireRoleKeycloak = makeRequireRoleKeycloak(deps.validRoles);
    return function requireRole(...roles) {
        return (req, res, next) => {
            if (isKeycloakMode())
                return requireRoleKeycloak(...roles)(req, res, next);
            if (!req.isAuthenticated()) {
                return res.status(401).json({ error: "Authentication required" });
            }
            const role = req.user?.role;
            if (!role || !deps.validRoles.includes(role)) {
                return res.status(403).json({ message: "NO_ROLE_ASSIGNED" });
            }
            if (!roles.includes(role)) {
                return res.status(403).json({ error: "Insufficient permissions" });
            }
            next();
        };
    };
}
//# sourceMappingURL=auth-middleware.js.map