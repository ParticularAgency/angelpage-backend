"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const charities_controller_1 = require("./charities.controller");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ dest: "uploads/" });
// Profile routes
router.put("/profile", (0, auth_middleware_1.authMiddleware)(), upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "charityBannerImage", maxCount: 1 },
]), charities_controller_1.updateProfile);
router.get("/profile", (0, auth_middleware_1.authMiddleware)(), charities_controller_1.getCharityProfile);
// charity admin info
router.put("/profile/adminInfo", (0, auth_middleware_1.authMiddleware)(), charities_controller_1.updateCharityAdminInfo, charities_controller_1.updateProfile);
router.get("/profile/adminInfo", (0, auth_middleware_1.authMiddleware)(), charities_controller_1.getCharityAdminInfo);
// Address routes
router.post("/profile/addresses", (0, auth_middleware_1.authMiddleware)(), charities_controller_1.addAddress);
router.put("/profile/addresses/:addressId", (0, auth_middleware_1.authMiddleware)(), charities_controller_1.updateAddress);
router.delete("/profile/addresses/:addressId", (0, auth_middleware_1.authMiddleware)(), charities_controller_1.deleteAddress);
// Payment routes
router.post("/profile/payments", (0, auth_middleware_1.authMiddleware)(), charities_controller_1.addPayment);
router.put("/profile/payments/:paymentId", (0, auth_middleware_1.authMiddleware)(), charities_controller_1.updatePayment);
router.delete("/profile/payments/:paymentId", (0, auth_middleware_1.authMiddleware)(), charities_controller_1.deletePayment);
// storefront data routes
// router.get("/storefront/:storefrontid", getStorefrontData);
router.get("/charities", (0, auth_middleware_1.authMiddleware)(), charities_controller_1.getCharityList);
exports.default = router;
