"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const admin_controller_1 = require("./admin.controller");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ dest: "uploads/" });
// Protected route to update profile image
router.put("/profile", (0, auth_middleware_1.authMiddleware)(), upload.single("profileImage"), admin_controller_1.updateProfile);
router.get("/profile", (0, auth_middleware_1.authMiddleware)(), admin_controller_1.getAdminData);
router.post("/profile/addresses", (0, auth_middleware_1.authMiddleware)(), admin_controller_1.addAddress); // Add address
router.put("/profile/addresses/:addressId", (0, auth_middleware_1.authMiddleware)(), admin_controller_1.updateAddress); // Update address
router.delete("/profile/addresses/:addressId", (0, auth_middleware_1.authMiddleware)(), admin_controller_1.deleteAddress); // Delete address
router.post("/profile/payments", (0, auth_middleware_1.authMiddleware)(), admin_controller_1.addPayment); // Add address
router.put("/profile/payments/:paymentId", (0, auth_middleware_1.authMiddleware)(), admin_controller_1.updatePayment); // Update address
router.delete("/profile/payments/:paymentId", (0, auth_middleware_1.authMiddleware)(), admin_controller_1.deletePayment); // Delete address
// dashboard area endpoint
router.get("/products/listings", (0, auth_middleware_1.authMiddleware)(), admin_controller_1.getLiveProducts);
router.get("/users/overview", (0, auth_middleware_1.authMiddleware)(), admin_controller_1.getTotalPlatformUsersWithDuration);
router.delete("/users/:userId", (0, auth_middleware_1.authMiddleware)(), admin_controller_1.deleteUser);
exports.default = router;
