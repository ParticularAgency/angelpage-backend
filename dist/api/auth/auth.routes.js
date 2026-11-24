"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const captcha_middleware_js_1 = require("../../middlewares/captcha.middleware.js");
const router = (0, express_1.Router)();
// Public routes
router.post("/register", captcha_middleware_js_1.verifyCaptcha, auth_controller_1.registerUser);
router.post("/verify-email", auth_controller_1.verifyEmail);
router.post("/resend-verify-email", auth_controller_1.resendVerificationEmail);
router.get("/profile/:email", auth_controller_1.fetchUserProfile);
router.get("/charity-profile/:email", auth_controller_1.fetchCharityProfile);
router.post("/login", captcha_middleware_js_1.verifyCaptcha, auth_controller_1.loginUser);
router.post("/request-password-reset", captcha_middleware_js_1.verifyCaptcha, auth_controller_1.requestPasswordReset);
router.post("/reset-password", auth_controller_1.resetPassword);
router.get("/check-token", auth_controller_1.checkToken);
router.post("/refresh", auth_controller_1.refreshAccessToken);
router.post("/oauth", auth_controller_1.oauthLogin);
router.post("/claim-guest-orders", (0, auth_middleware_1.authMiddleware)(), auth_controller_1.claimGuestOrders);
// Protected route
router.delete("/delete-account", (0, auth_middleware_1.authMiddleware)(), auth_controller_1.deleteAccount); // Authenticated users can delete their account
exports.default = router;
