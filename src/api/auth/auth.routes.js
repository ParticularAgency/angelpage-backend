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
} from "./auth.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";


const router = Router();

// Public routes
router.post("/register", registerUser);
router.post("/verify-email", verifyEmail);
router.post("/resend-verify-email", resendVerificationEmail);
router.get("/profile/:email", fetchUserProfile);
router.get("/charity-profile/:email", fetchCharityProfile);
router.post("/login", loginUser);
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword); 
router.get("/check-token", checkToken);
// Protected route
router.delete("/delete-account", authMiddleware(), deleteAccount); // Authenticated users can delete their account

export default router;
