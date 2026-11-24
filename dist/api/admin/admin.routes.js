"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const admin_controller_1 = require("./admin.controller");
const admin_operations_controller_js_1 = require("./admin.operations.controller.js");
const admin_audit_controller_js_1 = require("./admin.audit.controller.js");
const admin_team_controller_js_1 = require("./admin.team.controller.js");
const adminPanel_middleware_js_1 = require("../../middlewares/adminPanel.middleware.js");
const validation_middleware_1 = require("../../middlewares/validation.middleware");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ dest: "uploads/" });
// Protected route to update profile image
router.put("/profile", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), upload.single("profileImage"), admin_controller_1.updateProfile);
router.get("/profile", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), admin_controller_1.getAdminData);
router.post("/profile/addresses", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), admin_controller_1.addAddress);
router.put("/profile/addresses/:addressId", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), admin_controller_1.updateAddress);
router.delete("/profile/addresses/:addressId", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), admin_controller_1.deleteAddress);
router.post("/profile/payments", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), validation_middleware_1.validatePaymentMethod, admin_controller_1.addPayment);
router.put("/profile/payments/:paymentId", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), validation_middleware_1.validatePaymentMethod, admin_controller_1.updatePayment);
router.delete("/profile/payments/:paymentId", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), admin_controller_1.deletePayment);
// dashboard area endpoint — admin roles only
router.get("/products/listings", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), admin_controller_1.getLiveProducts);
router.get("/users/overview", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), (0, adminPanel_middleware_js_1.requirePanel)("super"), admin_controller_1.getTotalPlatformUsersWithDuration);
router.delete("/users/:userId", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), (0, adminPanel_middleware_js_1.requirePanel)("super"), admin_controller_1.deleteUser);
router.patch("/users/:userId/verified", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), admin_controller_1.setUserVerified);
router.patch("/users/bulk/verified", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), admin_controller_1.bulkSetUsersVerified);
router.get('/users/analytics', (0, auth_middleware_1.authMiddleware)(["ADMIN"]), (0, adminPanel_middleware_js_1.requirePanel)("super"), admin_controller_1.getTotalPlatformUsersWithMonthlyChanges);
router.get("/analytics/returning-users-weekly", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), (0, adminPanel_middleware_js_1.requirePanel)("super"), admin_controller_1.getReturningUserAnalytics);
router.get("/analytics/user-sessions-weekly", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), (0, adminPanel_middleware_js_1.requirePanel)("super"), admin_controller_1.getPlatformUserSessionsAnalytics);
//charity fund pending approval lists
router.get("/charities/pending-approval", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), (0, adminPanel_middleware_js_1.requirePanel)("content"), admin_controller_1.getCharitiesPendingApproval);
// Panel metadata (any admin role)
router.get("/panels", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), admin_team_controller_js_1.getMyAdminPanels);
// Operations panel
router.get("/operations/orders", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), (0, adminPanel_middleware_js_1.requirePanel)("operations"), admin_operations_controller_js_1.getOperationsOrders);
router.get("/operations/disputes", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), (0, adminPanel_middleware_js_1.requirePanel)("operations"), admin_operations_controller_js_1.getOperationsDisputes);
router.get("/operations/escrow", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), (0, adminPanel_middleware_js_1.requirePanel)("operations"), admin_operations_controller_js_1.getEscrowQueue);
router.post("/operations/escrow/:orderId/release", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), (0, adminPanel_middleware_js_1.requirePanel)("operations"), admin_operations_controller_js_1.releaseEscrow);
router.post("/operations/disputes/:orderId/resolve", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), (0, adminPanel_middleware_js_1.requirePanel)("operations"), admin_operations_controller_js_1.resolveDispute);
router.get("/operations/export/orders", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), (0, adminPanel_middleware_js_1.requirePanel)("operations"), admin_operations_controller_js_1.exportOperationsOrdersCsv);
router.get("/audit-logs", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), (0, adminPanel_middleware_js_1.requirePanel)("super"), admin_audit_controller_js_1.getAuditLogs);
// Super admin — sub-admin team management
router.get("/team", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), (0, adminPanel_middleware_js_1.requirePanel)("super"), admin_team_controller_js_1.listAdminTeam);
router.post("/team", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), (0, adminPanel_middleware_js_1.requirePanel)("super"), admin_team_controller_js_1.createSubAdmin);
router.patch("/team/:adminId/role", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), (0, adminPanel_middleware_js_1.requirePanel)("super"), admin_team_controller_js_1.updateSubAdminRole);
exports.default = router;
