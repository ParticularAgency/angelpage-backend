"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const adminRoles_js_1 = require("../constants/adminRoles.js");
const jwtSecret_js_1 = require("../config/jwtSecret.js");
const authMiddleware = (roles) => {
    return (req, res, next) => {
        const authHeader = req.header("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ message: "Access denied. No token provided." });
            return;
        }
        const token = authHeader.replace("Bearer ", "");
        try {
            const decoded = jsonwebtoken_1.default.verify(token, jwtSecret_js_1.JWT_SECRET);
            if (decoded.type === "refresh") {
                res.status(401).json({ message: "Access token required." });
                return;
            }
            req.user = {
                userId: decoded.userId,
                role: decoded.role,
                charityId: decoded.charityId,
                permissions: decoded.permissions || [],
            };
            if (roles) {
                const userRole = decoded.role;
                const allowed = roles.some(r => {
                    if (r === "ADMIN" && (0, adminRoles_js_1.isAdminRole)(userRole))
                        return true;
                    if (r === "CHARITY" && userRole === "CHARITY_STAFF")
                        return true;
                    return r === userRole;
                });
                if (!allowed) {
                    res
                        .status(403)
                        .json({ message: "Access denied: insufficient permissions." });
                    return;
                }
            }
            next();
        }
        catch (error) {
            console.error("JWT Verification Error:", error);
            res.status(401).json({ message: "Invalid or expired token." });
        }
    };
};
exports.authMiddleware = authMiddleware;
