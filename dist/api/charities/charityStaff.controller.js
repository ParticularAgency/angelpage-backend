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
exports.updateCharityStaff = exports.createCharityStaff = exports.listCharityStaff = void 0;
const CharityStaff_model_1 = __importDefault(require("../../models/CharityStaff.model"));
const Charity_model_1 = __importDefault(require("../../models/Charity.model"));
const charityPermissions_js_1 = require("../../constants/charityPermissions.js");
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
const listCharityStaff = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.user.role !== "CHARITY") {
            return res.status(403).json({ message: "Only charity owners can manage staff." });
        }
        const staff = yield CharityStaff_model_1.default.find({
            parentCharityId: req.user.userId,
        })
            .select("firstName lastName email staffRole permissions active createdAt")
            .sort({ createdAt: -1 });
        res.status(200).json({
            staff: staff.map((s) => (Object.assign(Object.assign({}, s.toObject()), { permissions: (0, charityPermissions_js_1.resolveCharityStaffPermissions)(s.staffRole, s.permissions) }))),
        });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to list staff." });
    }
});
exports.listCharityStaff = listCharityStaff;
const createCharityStaff = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.user.role !== "CHARITY") {
            return res.status(403).json({ message: "Only charity owners can add staff." });
        }
        const { firstName, lastName, email, password, staffRole, permissions } = req.body;
        if (!(firstName === null || firstName === void 0 ? void 0 : firstName.trim()) || !(lastName === null || lastName === void 0 ? void 0 : lastName.trim()) || !(email === null || email === void 0 ? void 0 : email.trim()) || !password) {
            return res.status(400).json({ message: "Name, email, and password are required." });
        }
        const charity = yield Charity_model_1.default.findById(req.user.userId);
        if (!charity) {
            return res.status(404).json({ message: "Charity not found." });
        }
        const exists = (yield Charity_model_1.default.findOne({ email: email.trim().toLowerCase() })) ||
            (yield CharityStaff_model_1.default.findOne({ email: email.trim().toLowerCase() }));
        if (exists) {
            return res.status(400).json({ message: "Email already in use." });
        }
        const roleKey = staffRole === "MANAGER" ? "MANAGER" : "STAFF";
        const resolvedPermissions = (0, charityPermissions_js_1.resolveCharityStaffPermissions)(roleKey, parsePermissions(permissions));
        if (!resolvedPermissions.length) {
            return res.status(400).json({
                message: "Select at least one access permission.",
            });
        }
        const member = yield CharityStaff_model_1.default.create({
            parentCharityId: req.user.userId,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim().toLowerCase(),
            password,
            staffRole: roleKey,
            permissions: resolvedPermissions,
        });
        res.status(201).json({
            message: "Staff member created. They sign in under Charity/Brand login.",
            staff: {
                id: member._id,
                firstName: member.firstName,
                lastName: member.lastName,
                email: member.email,
                staffRole: member.staffRole,
                permissions: member.permissions,
            },
        });
    }
    catch (error) {
        console.error("createCharityStaff:", error);
        res.status(500).json({ message: "Failed to create staff member." });
    }
});
exports.createCharityStaff = createCharityStaff;
const updateCharityStaff = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        if (req.user.role !== "CHARITY") {
            return res.status(403).json({ message: "Only charity owners can update staff." });
        }
        const member = yield CharityStaff_model_1.default.findOne({
            _id: req.params.staffId,
            parentCharityId: req.user.userId,
        });
        if (!member) {
            return res.status(404).json({ message: "Staff member not found." });
        }
        if (req.body.staffRole) {
            member.staffRole = req.body.staffRole === "MANAGER" ? "MANAGER" : "STAFF";
        }
        if (typeof req.body.active === "boolean") {
            member.active = req.body.active;
        }
        if ((_a = req.body.password) === null || _a === void 0 ? void 0 : _a.trim()) {
            member.password = req.body.password;
        }
        if (req.body.permissions !== undefined) {
            member.permissions = (0, charityPermissions_js_1.resolveCharityStaffPermissions)(member.staffRole, parsePermissions(req.body.permissions));
        }
        yield member.save();
        res.status(200).json({
            message: "Staff updated.",
            staff: Object.assign(Object.assign({}, member.toObject()), { permissions: (0, charityPermissions_js_1.resolveCharityStaffPermissions)(member.staffRole, member.permissions) }),
        });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update staff." });
    }
});
exports.updateCharityStaff = updateCharityStaff;
