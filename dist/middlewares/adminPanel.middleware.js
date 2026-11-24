"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canAccessPanel = exports.isAdminRole = exports.ALL_ADMIN_ROLES = exports.requirePanel = exports.requireAdmin = void 0;
const adminRoles_js_1 = require("../constants/adminRoles.js");
Object.defineProperty(exports, "isAdminRole", { enumerable: true, get: function () { return adminRoles_js_1.isAdminRole; } });
Object.defineProperty(exports, "canAccessPanel", { enumerable: true, get: function () { return adminRoles_js_1.canAccessPanel; } });
Object.defineProperty(exports, "ALL_ADMIN_ROLES", { enumerable: true, get: function () { return adminRoles_js_1.ALL_ADMIN_ROLES; } });
/**
 * Require any admin role (super or sub-admin).
 */
const requireAdmin = (req, res, next) => {
    var _a;
    const role = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
    if (!(0, adminRoles_js_1.isAdminRole)(role)) {
        return res.status(403).json({ message: "Admin access required." });
    }
    next();
};
exports.requireAdmin = requireAdmin;
/**
 * Require access to a specific panel (super admin passes all).
 */
const requirePanel = (panelId) => (req, res, next) => {
    var _a;
    const role = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
    if (!(0, adminRoles_js_1.canAccessPanel)(role, panelId)) {
        return res.status(403).json({
            message: `Access denied: ${panelId} panel permission required.`,
        });
    }
    next();
};
exports.requirePanel = requirePanel;
