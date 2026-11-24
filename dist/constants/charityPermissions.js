"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.charityHasPermission = exports.resolveCharityStaffPermissions = exports.CHARITY_STAFF_PRESETS = exports.CHARITY_PERMISSION_LABELS = exports.CHARITY_PERMISSION_KEYS = void 0;
/** Granular charity dashboard permissions (owner has all). */
exports.CHARITY_PERMISSION_KEYS = [
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
exports.CHARITY_PERMISSION_LABELS = {
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
exports.CHARITY_STAFF_PRESETS = {
    STAFF: ["listings", "sold", "messages", "notifications", "community"],
    MANAGER: ["analytics", "listings", "sold", "messages", "notifications", "community"],
};
const resolveCharityStaffPermissions = (staffRole, permissions) => {
    if (Array.isArray(permissions) && permissions.length) {
        return permissions.filter((p) => exports.CHARITY_PERMISSION_KEYS.includes(p));
    }
    return exports.CHARITY_STAFF_PRESETS[staffRole] || exports.CHARITY_STAFF_PRESETS.STAFF;
};
exports.resolveCharityStaffPermissions = resolveCharityStaffPermissions;
const charityHasPermission = (role, permissions, permissionKey) => {
    if (role === "CHARITY")
        return true;
    return (0, exports.resolveCharityStaffPermissions)(null, permissions).includes(permissionKey);
};
exports.charityHasPermission = charityHasPermission;
