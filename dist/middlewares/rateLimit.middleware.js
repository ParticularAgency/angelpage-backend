"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeRateLimiter = exports.authRateLimiter = exports.apiRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const defaultWindowMs = parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
exports.apiRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: defaultWindowMs,
    max: parsePositiveInt(process.env.RATE_LIMIT_MAX, 300),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests. Please try again later.",
    },
});
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: defaultWindowMs,
    max: parsePositiveInt(process.env.RATE_LIMIT_AUTH_MAX, 25),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many authentication attempts. Please try again later.",
    },
});
exports.writeRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: parsePositiveInt(process.env.RATE_LIMIT_WRITE_MAX, 40),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many write requests. Please slow down.",
    },
});
