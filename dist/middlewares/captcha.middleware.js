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
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCaptcha = void 0;
/**
 * Cloudflare Turnstile verification — skipped when TURNSTILE_SECRET_KEY is unset (local dev).
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
const verifyCaptcha = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
        return next();
    }
    const token = req.body.captchaToken;
    if (!token) {
        return res.status(400).json({ message: "CAPTCHA verification required." });
    }
    try {
        const params = new URLSearchParams({
            secret,
            response: token,
        });
        const remoteIp = req.headers["cf-connecting-ip"] ||
            ((_b = (_a = req.headers["x-forwarded-for"]) === null || _a === void 0 ? void 0 : _a.split(",")[0]) === null || _b === void 0 ? void 0 : _b.trim()) ||
            req.ip;
        if (remoteIp) {
            params.set("remoteip", remoteIp);
        }
        const verifyRes = yield fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
        });
        const data = yield verifyRes.json();
        if (!data.success) {
            return res.status(400).json({ message: "CAPTCHA verification failed." });
        }
        next();
    }
    catch (err) {
        console.error("Turnstile verify error:", err);
        res.status(500).json({ message: "CAPTCHA verification error." });
    }
});
exports.verifyCaptcha = verifyCaptcha;
