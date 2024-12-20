import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
	updateProfile,
	getCharityProfile,
	addAddress,
	updateAddress,
	deleteAddress,
	addPayment,
	updatePayment,
	deletePayment,
	getCharityAdminInfo,
	updateCharityAdminInfo,
	getCharityList,
	getCharityDetails
	// getStorefrontData,
} from "./charities.controller";

const router = Router();
const upload = multer({ dest: "uploads/" });

// Profile routes
router.put(
	"/profile",
	authMiddleware(),
	upload.fields([
		{ name: "profileImage", maxCount: 1 },
		{ name: "charityBannerImage", maxCount: 1 },
	]),
	updateProfile,
);


router.get("/profile", authMiddleware(), getCharityProfile);

// charity admin info
router.put(
	"/profile/adminInfo",
	authMiddleware(),
	updateCharityAdminInfo,
	updateProfile,
);
router.get("/profile/adminInfo", authMiddleware(), getCharityAdminInfo);

// Address routes
router.post("/profile/addresses", authMiddleware(), addAddress);
router.put("/profile/addresses/:addressId", authMiddleware(), updateAddress);
router.delete("/profile/addresses/:addressId", authMiddleware(), deleteAddress);

// Payment routes
router.post("/profile/payments", authMiddleware(), addPayment);
router.put("/profile/payments/:paymentId", authMiddleware(), updatePayment);
router.delete("/profile/payments/:paymentId", authMiddleware(), deletePayment);

router.get("/charities", getCharityList);

router.get("/charities/:charityid", getCharityDetails);

// storefront data routes
// router.get("/storefront/:storefrontid", getStorefrontData);

export default router;
