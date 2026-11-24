import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { getCharities } from "./appCharity.controller.js";
import {
	listCharityStaff,
	createCharityStaff,
	updateCharityStaff,
} from "./charityStaff.controller.js";
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
	getCharityDetails,
	onBoarding,
	uploadMiddleware, 
	uploadCharityList,
	OrderdeliverMark,
	approveFundsRelease,
} from "./charities.controller";
import {
	getCharityIntegration,
	updateCharityIntegration,
	detectCharityStore,
	testCharityStoreConnection,
	runCharityProductSync,
} from "./charityIntegration.controller.js";
import { validatePaymentMethod } from "../../middlewares/validation.middleware";

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

// Charity team (owner only)
router.get("/staff", authMiddleware(["CHARITY"]), listCharityStaff);
router.post("/staff", authMiddleware(["CHARITY"]), createCharityStaff);
router.patch("/staff/:staffId", authMiddleware(["CHARITY"]), updateCharityStaff);

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
router.post("/profile/payments", authMiddleware(), validatePaymentMethod, addPayment);
router.put("/profile/payments/:paymentId", authMiddleware(), validatePaymentMethod, updatePayment);
router.delete("/profile/payments/:paymentId", authMiddleware(), deletePayment);

router.get("/charities", getCharityList);

router.get("/charities/:charityid", getCharityDetails);

// charity onboarding
router.post("/onboard", authMiddleware(["CHARITY", "CHARITY_STAFF"]), onBoarding);

// Product sync / third-party store integration
router.get(
	"/integration",
	authMiddleware(["CHARITY", "CHARITY_STAFF"]),
	getCharityIntegration,
);
router.put(
	"/integration",
	authMiddleware(["CHARITY", "CHARITY_STAFF"]),
	updateCharityIntegration,
);
router.post(
	"/integration/detect",
	authMiddleware(["CHARITY", "CHARITY_STAFF"]),
	detectCharityStore,
);
router.post(
	"/integration/test",
	authMiddleware(["CHARITY", "CHARITY_STAFF"]),
	testCharityStoreConnection,
);
router.post(
	"/integration/sync",
	authMiddleware(["CHARITY", "CHARITY_STAFF"]),
	runCharityProductSync,
);
// proceeding order delivery — buyer must be authenticated
router.put("/orders/:orderId/deliver", authMiddleware(), OrderdeliverMark);

//admin approved for fund release (admin only)
router.put(
	"/funds/release/:charityId",
	authMiddleware(["ADMIN", "FINANCE_ADMIN"]),
	approveFundsRelease,
);


router.post(
	"/upload-charities",
	authMiddleware(["ADMIN"]),
	uploadMiddleware,
	uploadCharityList,
);

// ============eBay charity lists
router.get("/charity-lists", getCharities);

export default router;
