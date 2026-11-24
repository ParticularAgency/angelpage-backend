"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminHasPermission = exports.resolveAdminPermissions = exports.ADMIN_ROLE_PERMISSION_PRESETS = exports.ADMIN_PERMISSION_LABELS = exports.ADMIN_PERMISSION_KEYS = void 0;
/** Granular admin tab permissions (Super Admin has all). */
exports.ADMIN_PERMISSION_KEYS = [
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
exports.ADMIN_PERMISSION_LABELS = {
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
exports.ADMIN_ROLE_PERMISSION_PRESETS = {
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
const resolveAdminPermissions = (role, permissions) => {
    if (role === "ADMIN")
        return [...exports.ADMIN_PERMISSION_KEYS];
    if (Array.isArray(permissions) && permissions.length) {
        return permissions.filter((p) => exports.ADMIN_PERMISSION_KEYS.includes(p));
    }
    return exports.ADMIN_ROLE_PERMISSION_PRESETS[role] || [];
};
exports.resolveAdminPermissions = resolveAdminPermissions;
const adminHasPermission = (role, permissions, permissionKey) => (0, exports.resolveAdminPermissions)(role, permissions).includes(permissionKey);
exports.adminHasPermission = adminHasPermission;
