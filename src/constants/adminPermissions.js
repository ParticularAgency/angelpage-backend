/** Granular admin tab permissions (Super Admin has all). */
export const ADMIN_PERMISSION_KEYS = [
	"analytics",
	"account",
	"review",
	"product-reviews",
	"promoted",
	"operations",
	"charity-import",
	"blog",
	"events",
	"finance",
	"team",
	"audit",
];

export const ADMIN_PERMISSION_LABELS = {
	analytics: "Analytics",
	account: "Account",
	review: "Review listings",
	"product-reviews": "Product reviews",
	promoted: "Promoted listings",
	operations: "Operations",
	"charity-import": "Listed charity",
	blog: "Blog",
	events: "Events",
	finance: "Finance",
	team: "Team management",
	audit: "Audit log",
};

/** Legacy role presets — used when custom permissions array is empty */
export const ADMIN_ROLE_PERMISSION_PRESETS = {
	OPS_ADMIN: ["operations"],
	CONTENT_ADMIN: [
		"review",
		"product-reviews",
		"promoted",
		"charity-import",
		"blog",
		"events",
	],
	FINANCE_ADMIN: ["finance"],
};

export const resolveAdminPermissions = (role, permissions) => {
	if (role === "ADMIN") return [...ADMIN_PERMISSION_KEYS];
	if (Array.isArray(permissions) && permissions.length) {
		return permissions.filter((p) => ADMIN_PERMISSION_KEYS.includes(p));
	}
	return ADMIN_ROLE_PERMISSION_PRESETS[role] || [];
};

export const adminHasPermission = (role, permissions, permissionKey) =>
	resolveAdminPermissions(role, permissions).includes(permissionKey);
