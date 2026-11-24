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
	getTotalPlatformUsersWithMonthlyChanges,
	getPlatformUserSessionsAnalytics,
	getReturningUserAnalytics,
	getCharitiesPendingApproval,
	setUserVerified,
	bulkSetUsersVerified,
	// approveFundsRelease,
} from "./admin.controller";
import {
	getOperationsOrders,
	getOperationsDisputes,
	getEscrowQueue,
	releaseEscrow,
	resolveDispute,
	exportOperationsOrdersCsv,
} from "./admin.operations.controller.js";
import { getAuditLogs } from "./admin.audit.controller.js";
import {
	listAdminTeam,
	createSubAdmin,
	updateSubAdminRole,
	getMyAdminPanels,
} from "./admin.team.controller.js";
import { requirePanel } from "../../middlewares/adminPanel.middleware.js";
import { validatePaymentMethod } from "../../middlewares/validation.middleware";
import multer from "multer";

const router = Router();
const upload = multer({ dest: "uploads/" });

// Protected route to update profile image
router.put(
	"/profile",
	authMiddleware(["ADMIN"]),
	upload.single("profileImage"),
	updateProfile,
);
router.get("/profile", authMiddleware(["ADMIN"]), getAdminData);

router.post("/profile/addresses", authMiddleware(["ADMIN"]), addAddress);
router.put("/profile/addresses/:addressId", authMiddleware(["ADMIN"]), updateAddress);
router.delete("/profile/addresses/:addressId", authMiddleware(["ADMIN"]), deleteAddress);

router.post("/profile/payments", authMiddleware(["ADMIN"]), validatePaymentMethod, addPayment);
router.put("/profile/payments/:paymentId", authMiddleware(["ADMIN"]), validatePaymentMethod, updatePayment);
router.delete("/profile/payments/:paymentId", authMiddleware(["ADMIN"]), deletePayment);

// dashboard area endpoint — admin roles only
router.get("/products/listings", authMiddleware(["ADMIN"]), getLiveProducts);

router.get("/users/overview", authMiddleware(["ADMIN"]), requirePanel("super"), getTotalPlatformUsersWithDuration);

router.delete("/users/:userId", authMiddleware(["ADMIN"]), requirePanel("super"), deleteUser);
router.patch("/users/:userId/verified", authMiddleware(["ADMIN"]), setUserVerified);
router.patch("/users/bulk/verified", authMiddleware(["ADMIN"]), bulkSetUsersVerified);

router.get('/users/analytics', authMiddleware(["ADMIN"]), requirePanel("super"), getTotalPlatformUsersWithMonthlyChanges);

router.get("/analytics/returning-users-weekly", authMiddleware(["ADMIN"]), requirePanel("super"), getReturningUserAnalytics);
router.get("/analytics/user-sessions-weekly", authMiddleware(["ADMIN"]), requirePanel("super"), getPlatformUserSessionsAnalytics);
//charity fund pending approval lists
router.get("/charities/pending-approval", authMiddleware(["ADMIN"]), requirePanel("content"), getCharitiesPendingApproval);

// Panel metadata (any admin role)
router.get("/panels", authMiddleware(["ADMIN"]), getMyAdminPanels);

// Operations panel
router.get(
	"/operations/orders",
	authMiddleware(["ADMIN"]),
	requirePanel("operations"),
	getOperationsOrders,
);
router.get(
	"/operations/disputes",
	authMiddleware(["ADMIN"]),
	requirePanel("operations"),
	getOperationsDisputes,
);
router.get(
	"/operations/escrow",
	authMiddleware(["ADMIN"]),
	requirePanel("operations"),
	getEscrowQueue,
);
router.post(
	"/operations/escrow/:orderId/release",
	authMiddleware(["ADMIN"]),
	requirePanel("operations"),
	releaseEscrow,
);
router.post(
	"/operations/disputes/:orderId/resolve",
	authMiddleware(["ADMIN"]),
	requirePanel("operations"),
	resolveDispute,
);
router.get(
	"/operations/export/orders",
	authMiddleware(["ADMIN"]),
	requirePanel("operations"),
	exportOperationsOrdersCsv,
);
router.get(
	"/audit-logs",
	authMiddleware(["ADMIN"]),
	requirePanel("super"),
	getAuditLogs,
);

// Super admin — sub-admin team management
router.get("/team", authMiddleware(["ADMIN"]), requirePanel("super"), listAdminTeam);
router.post("/team", authMiddleware(["ADMIN"]), requirePanel("super"), createSubAdmin);
router.patch(
	"/team/:adminId/role",
	authMiddleware(["ADMIN"]),
	requirePanel("super"),
	updateSubAdminRole,
);

export default router;
