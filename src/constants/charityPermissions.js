/** Granular charity dashboard permissions (owner has all). */
export const CHARITY_PERMISSION_KEYS = [
	"analytics",
	"account",
	"listings",
	"sold",
	"messages",
	"notifications",
	"payouts",
	"community",
	"team",
];

export const CHARITY_PERMISSION_LABELS = {
	analytics: "Analytics",
	account: "Account settings",
	listings: "Listings & products",
	sold: "Sold orders",
	messages: "Messages",
	notifications: "Notifications",
	payouts: "Payouts & banking",
	community: "Blog & events",
	team: "Team management",
};

export const CHARITY_STAFF_PRESETS = {
	STAFF: ["listings", "sold", "messages", "notifications", "community"],
	MANAGER: ["analytics", "listings", "sold", "messages", "notifications", "community"],
};

export const resolveCharityStaffPermissions = (staffRole, permissions) => {
	if (Array.isArray(permissions) && permissions.length) {
		return permissions.filter((p) => CHARITY_PERMISSION_KEYS.includes(p));
	}
	return CHARITY_STAFF_PRESETS[staffRole] || CHARITY_STAFF_PRESETS.STAFF;
};

export const charityHasPermission = (role, permissions, permissionKey) => {
	if (role === "CHARITY") return true;
	return resolveCharityStaffPermissions(null, permissions).includes(
		permissionKey,
	);
};
