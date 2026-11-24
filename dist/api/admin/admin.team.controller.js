"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyAdminPanels = exports.updateSubAdminRole = exports.createSubAdmin = exports.listAdminTeam = void 0;
const Admin_model_1 = __importDefault(require("../../models/Admin.model"));
const adminRoles_js_1 = require("../../constants/adminRoles.js");
const adminPermissions_js_1 = require("../../constants/adminPermissions.js");
const parsePermissions = (raw) => {
    if (Array.isArray(raw))
        return raw;
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        }
        catch (_a) {
            return raw.split(",").map((s) => s.trim()).filter(Boolean);
        }
    }
    return [];
};
const listAdminTeam = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const team = yield Admin_model_1.default.find()
            .select("firstName lastName email role permissions createdAt verified")
            .sort({ createdAt: -1 });
        res.status(200).json({
            team: team.map((m) => (Object.assign(Object.assign({}, m.toObject()), { permissions: (0, adminPermissions_js_1.resolveAdminPermissions)(m.role, m.permissions) }))),
        });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to list admin team." });
    }
});
exports.listAdminTeam = listAdminTeam;
const createSubAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { firstName, lastName, email, password, role, userName, permissions } = req.body;
        if (!adminRoles_js_1.ALL_ADMIN_ROLES.includes(role) || role === "ADMIN") {
            return res.status(400).json({
                message: "role must be OPS_ADMIN, CONTENT_ADMIN, or FINANCE_ADMIN (use existing super admin for ADMIN).",
            });
        }
        const exists = yield Admin_model_1.default.findOne({ email });
        if (exists) {
            return res.status(400).json({ message: "Email already in use." });
        }
        const resolvedPermissions = (0, adminPermissions_js_1.resolveAdminPermissions)(role, parsePermissions(permissions));
        if (!resolvedPermissions.length) {
            return res.status(400).json({
                message: "Select at least one access permission.",
            });
        }
        const admin = new Admin_model_1.default({
            firstName,
            lastName,
            email,
            password,
            userName: userName || email.split("@")[0],
            role,
            permissions: resolvedPermissions,
        });
        yield admin.save();
        res.status(201).json({
            message: "Sub-admin created.",
            admin: {
                id: admin._id,
                firstName: admin.firstName,
                lastName: admin.lastName,
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions,
            },
        });
    }
    catch (error) {
        console.error("createSubAdmin:", error);
        res.status(500).json({ message: "Failed to create sub-admin." });
    }
});
exports.createSubAdmin = createSubAdmin;
const updateSubAdminRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { adminId } = req.params;
        const { role, permissions } = req.body;
        const admin = yield Admin_model_1.default.findById(adminId);
        if (!admin) {
            return res.status(404).json({ message: "Admin not found." });
        }
        if (admin.role === "ADMIN") {
            return res.status(400).json({ message: "Cannot modify super admin." });
        }
        if (role && adminRoles_js_1.ALL_ADMIN_ROLES.includes(role) && role !== "ADMIN") {
            admin.role = role;
        }
        if (permissions !== undefined) {
            admin.permissions = (0, adminPermissions_js_1.resolveAdminPermissions)(admin.role, parsePermissions(permissions));
        }
        yield admin.save();
        res.status(200).json({
            message: "Admin updated.",
            admin: {
                id: admin._id,
                email: admin.email,
                role: admin.role,
                permissions: (0, adminPermissions_js_1.resolveAdminPermissions)(admin.role, admin.permissions),
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update admin." });
    }
});
exports.updateSubAdminRole = updateSubAdminRole;
const getMyAdminPanels = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const permissions = (0, adminPermissions_js_1.resolveAdminPermissions)(req.user.role, req.user.permissions);
    res.status(200).json({
        role: req.user.role,
        permissions,
    });
});
exports.getMyAdminPanels = getMyAdminPanels;
