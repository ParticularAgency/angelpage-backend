"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_SECRET = void 0;
/**
 * Single source of truth for JWT signing/verification.
 * Fails at startup if JWT_SECRET is missing or too weak.
 */
const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.trim().length < 16) {
        throw new Error("JWT_SECRET must be set in environment (minimum 16 characters).");
    }
    const insecure = ["your_jwt_secret", "defaultSecret", "change-me", "secret"];
    if (insecure.includes(secret.trim())) {
        throw new Error("JWT_SECRET is set to a known insecure default. Use a strong random value.");
    }
    return secret;
};
exports.JWT_SECRET = getJwtSecret();
exports.default = exports.JWT_SECRET;
