import {
	isAdminRole,
	canAccessPanel,
	ALL_ADMIN_ROLES,
} from "../constants/adminRoles.js";

/**
 * Require any admin role (super or sub-admin).
 */
export const requireAdmin = (req, res, next) => {
	const role = req.user?.role;
	if (!isAdminRole(role)) {
		return res.status(403).json({ message: "Admin access required." });
	}
	next();
};

/**
 * Require access to a specific panel (super admin passes all).
 */
export const requirePanel = (panelId) => (req, res, next) => {
	const role = req.user?.role;
	if (!canAccessPanel(role, panelId)) {
		return res.status(403).json({
			message: `Access denied: ${panelId} panel permission required.`,
		});
	}
	next();
};

export { ALL_ADMIN_ROLES, isAdminRole, canAccessPanel };
