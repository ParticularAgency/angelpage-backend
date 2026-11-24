/**
 * Angelpage admin panel roles & scoped permissions.
 *
 * ADMIN          — Super Admin (full access, legacy role name)
 * OPS_ADMIN      — Operations: orders, disputes, escrow
 * CONTENT_ADMIN  — Content: blog, charity imports, listing review
 * FINANCE_ADMIN  — Finance: revenue, charity payouts
 */

export const ADMIN_ROLES = {
	SUPER: "ADMIN",
	OPERATIONS: "OPS_ADMIN",
	CONTENT: "CONTENT_ADMIN",
	FINANCE: "FINANCE_ADMIN",
};

export const ALL_ADMIN_ROLES = Object.values(ADMIN_ROLES);

export const ADMIN_PANELS = {
	super: {
		id: "super",
		label: "Super Admin",
		description: "Analytics, user/charity management, listing review",
		roles: [ADMIN_ROLES.SUPER],
	},
	operations: {
		id: "operations",
		label: "Operations",
		description: "Orders, disputes, escrow release",
		roles: [ADMIN_ROLES.SUPER, ADMIN_ROLES.OPERATIONS],
	},
	content: {
		id: "content",
		label: "Content",
		description: "Blog, charity imports, listing review",
		roles: [ADMIN_ROLES.SUPER, ADMIN_ROLES.CONTENT],
	},
	finance: {
		id: "finance",
		label: "Finance",
		description: "Revenue, charity payouts",
		roles: [ADMIN_ROLES.SUPER, ADMIN_ROLES.FINANCE],
	},
};

export const isAdminRole = (role) => ALL_ADMIN_ROLES.includes(role);

export const canAccessPanel = (role, panelId) => {
	if (!isAdminRole(role)) return false;
	const panel = ADMIN_PANELS[panelId];
	if (!panel) return false;
	return panel.roles.includes(role);
};

export const getPanelsForRole = (role) => {
	if (!isAdminRole(role)) return [];
	if (role === ADMIN_ROLES.SUPER) {
		return Object.values(ADMIN_PANELS);
	}
	return Object.values(ADMIN_PANELS).filter((p) => p.roles.includes(role));
};
