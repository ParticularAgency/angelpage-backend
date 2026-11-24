"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const gallery_controller_js_1 = require("./gallery.controller.js");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    dest: "uploads/",
    limits: { fileSize: 100 * 1024 * 1024 },
});
router.get("/", gallery_controller_js_1.getPublishedGallery);
router.get("/slug/:slug", gallery_controller_js_1.getGalleryBySlug);
router.get("/mine", (0, auth_middleware_1.authMiddleware)(["USER", "CHARITY", "CHARITY_STAFF", "ADMIN"]), gallery_controller_js_1.getMyGallery);
router.get("/admin/all", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), gallery_controller_js_1.getAdminGallery);
router.post("/", (0, auth_middleware_1.authMiddleware)(["USER", "CHARITY", "CHARITY_STAFF", "ADMIN"]), upload.single("media"), gallery_controller_js_1.createGalleryItem);
router.patch("/:id/publish", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), gallery_controller_js_1.publishGalleryItem);
router.post("/:id/share", (0, auth_middleware_1.authMiddleware)(["USER", "CHARITY", "CHARITY_STAFF", "ADMIN"]), gallery_controller_js_1.shareGalleryItem);
router.delete("/:id", (0, auth_middleware_1.authMiddleware)(["USER", "CHARITY", "CHARITY_STAFF", "ADMIN"]), gallery_controller_js_1.deleteGalleryItem);
exports.default = router;
