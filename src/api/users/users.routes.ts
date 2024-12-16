import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
	updateProfile,
	getUserProfile,
	addAddress,
	updateAddress,
	deleteAddress,
	addPayment,
	updatePayment,
	deletePayment,
} from "./users.controller";
import multer from "multer";

const router = Router();
const upload = multer({ dest: "uploads/" });

// Protected route to update profile image
router.put( 
	"/profile",
	authMiddleware(),
	upload.single("profileImage"),
	updateProfile,
);
router.get("/profile", authMiddleware(), getUserProfile);


router.post("/profile/addresses", authMiddleware(), addAddress); // Add address
router.put("/profile/addresses/:addressId", authMiddleware(), updateAddress); // Update address
router.delete("/profile/addresses/:addressId", authMiddleware(), deleteAddress); // Delete address

router.post("/profile/payments", authMiddleware(), addPayment); // Add address
router.put("/profile/payments/:paymentId", authMiddleware(), updatePayment); // Update address
router.delete("/profile/payments/:paymentId", authMiddleware(), deletePayment); // Delete address

export default router;
