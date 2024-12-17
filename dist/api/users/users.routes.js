"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const users_controller_1 = require("./users.controller");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ dest: "uploads/" });
// Protected route to update profile image
router.put("/profile", (0, auth_middleware_1.authMiddleware)(), upload.single("profileImage"), users_controller_1.updateProfile);
router.get("/profile", (0, auth_middleware_1.authMiddleware)(), users_controller_1.getUserProfile);
router.post("/profile/addresses", (0, auth_middleware_1.authMiddleware)(), users_controller_1.addAddress); // Add address
router.put("/profile/addresses/:addressId", (0, auth_middleware_1.authMiddleware)(), users_controller_1.updateAddress); // Update address
router.delete("/profile/addresses/:addressId", (0, auth_middleware_1.authMiddleware)(), users_controller_1.deleteAddress); // Delete address
router.post("/profile/payments", (0, auth_middleware_1.authMiddleware)(), users_controller_1.addPayment); // Add address
router.put("/profile/payments/:paymentId", (0, auth_middleware_1.authMiddleware)(), users_controller_1.updatePayment); // Update address
router.delete("/profile/payments/:paymentId", (0, auth_middleware_1.authMiddleware)(), users_controller_1.deletePayment); // Delete address
exports.default = router;
