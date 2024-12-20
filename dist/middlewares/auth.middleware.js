"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const authMiddleware = (roles) => {
    return (req, res, next) => {
        const authHeader = req.header("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ message: "Access denied. No token provided." });
            return;
        }
        const token = authHeader.replace("Bearer ", "");
        try {
            // Verify token and check expiration
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            req.user = { userId: decoded.userId, role: decoded.role, };
            // Role-based access check
            if (roles && !roles.includes(decoded.role)) {
                res
                    .status(403)
                    .json({ message: "Access denied: insufficient permissions." });
                return;
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
