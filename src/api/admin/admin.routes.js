import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
	updateProfile,
	getAdminData,
	addAddress,
	updateAddress,
	deleteAddress,
	addPayment,
	updatePayment,
	deletePayment,
	getLiveProducts,
	getTotalPlatformUsersWithDuration,
	deleteUser,
} from "./admin.controller";
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
router.get("/profile", authMiddleware(), getAdminData);

router.post("/profile/addresses", authMiddleware(), addAddress); // Add address
router.put("/profile/addresses/:addressId", authMiddleware(), updateAddress); // Update address
router.delete("/profile/addresses/:addressId", authMiddleware(), deleteAddress); // Delete address

router.post("/profile/payments", authMiddleware(), addPayment); // Add address
router.put("/profile/payments/:paymentId", authMiddleware(), updatePayment); // Update address
router.delete("/profile/payments/:paymentId", authMiddleware(), deletePayment); // Delete address

// dashboard area endpoint
router.get("/products/listings", authMiddleware(), getLiveProducts);

router.get("/users/overview", authMiddleware(), getTotalPlatformUsersWithDuration);

router.delete("/users/:userId", authMiddleware(), deleteUser);

export default router;
