import { Router } from "express";
import {
	registerUser,
	loginUser,
	requestPasswordReset,
	resetPassword,
	deleteAccount,
	verifyEmail,
	fetchUserProfile,
	resendVerificationEmail,
	fetchCharityProfile,
	checkToken,
	refreshAccessToken,
	oauthLogin,
	claimGuestOrders,
} from "./auth.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";


import { verifyCaptcha } from "../../middlewares/captcha.middleware.js";
import { validateRegister } from "../../middlewares/validation.middleware";

const router = Router();

// Public routes
router.post("/register", verifyCaptcha, validateRegister, registerUser);
router.post("/verify-email", verifyEmail);
router.post("/resend-verify-email", resendVerificationEmail);
router.get("/profile/:email", fetchUserProfile);
router.get("/charity-profile/:email", fetchCharityProfile);
router.post("/login", verifyCaptcha, loginUser);
router.post("/request-password-reset", verifyCaptcha, requestPasswordReset);
router.post("/reset-password", resetPassword); 
router.get("/check-token", checkToken);
router.post("/refresh", refreshAccessToken);
router.post("/oauth", oauthLogin);
router.post("/claim-guest-orders", authMiddleware(), claimGuestOrders);
// Protected route
router.delete("/delete-account", authMiddleware(), deleteAccount); // Authenticated users can delete their account

export default router;
