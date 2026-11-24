"use strict";
/**
 * Angelpage admin panel roles & scoped permissions.
 *
 * ADMIN          — Super Admin (full access, legacy role name)
 * OPS_ADMIN      — Operations: orders, disputes, escrow
 * CONTENT_ADMIN  — Content: blog, charity imports, listing review
 * FINANCE_ADMIN  — Finance: revenue, charity payouts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPanelsForRole = exports.canAccessPanel = exports.isAdminRole = exports.ADMIN_PANELS = exports.ALL_ADMIN_ROLES = exports.ADMIN_ROLES = void 0;
exports.ADMIN_ROLES = {
    SUPER: "ADMIN",
    OPERATIONS: "OPS_ADMIN",
    CONTENT: "CONTENT_ADMIN",
    FINANCE: "FINANCE_ADMIN",
};
exports.ALL_ADMIN_ROLES = Object.values(exports.ADMIN_ROLES);
exports.ADMIN_PANELS = {
    super: {
        id: "super",
        label: "Super Admin",
        description: "Analytics, user/charity management, listing review",
        roles: [exports.ADMIN_ROLES.SUPER],
    },
    operations: {
        id: "operations",
        label: "Operations",
        description: "Orders, disputes, escrow release",
        roles: [exports.ADMIN_ROLES.SUPER, exports.ADMIN_ROLES.OPERATIONS],
    },
    content: {
        id: "content",
        label: "Content",
        description: "Blog, charity imports, listing review",
        roles: [exports.ADMIN_ROLES.SUPER, exports.ADMIN_ROLES.CONTENT],
    },
    finance: {
        id: "finance",
        label: "Finance",
        description: "Revenue, charity payouts",
        roles: [exports.ADMIN_ROLES.SUPER, exports.ADMIN_ROLES.FINANCE],
    },
};
const isAdminRole = (role) => exports.ALL_ADMIN_ROLES.includes(role);
exports.isAdminRole = isAdminRole;
const canAccessPanel = (role, panelId) => {
    if (!(0, exports.isAdminRole)(role))
        return false;
    const panel = exports.ADMIN_PANELS[panelId];
    if (!panel)
        return false;
    return panel.roles.includes(role);
};
exports.canAccessPanel = canAccessPanel;
const getPanelsForRole = (role) => {
    if (!(0, exports.isAdminRole)(role))
        return [];
    if (role === exports.ADMIN_ROLES.SUPER) {
        return Object.values(exports.ADMIN_PANELS);
    }
    return Object.values(exports.ADMIN_PANELS).filter((p) => p.roles.includes(role));
};
exports.getPanelsForRole = getPanelsForRole;
