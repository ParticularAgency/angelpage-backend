"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const rateLimit_middleware_js_1 = require("../../middlewares/rateLimit.middleware.js");
const ai_controller_js_1 = require("./ai.controller.js");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error("Only JPG, PNG, or WebP images are allowed."));
        }
    },
});
router.get("/status", rateLimit_middleware_js_1.apiRateLimiter, ai_controller_js_1.aiStatus);
router.post("/analyze-image", rateLimit_middleware_js_1.apiRateLimiter, (0, auth_middleware_1.authMiddleware)(["USER", "CHARITY", "ADMIN"]), upload.single("image"), ai_controller_js_1.analyzeImage);
router.post("/enhance-listing", rateLimit_middleware_js_1.apiRateLimiter, (0, auth_middleware_1.authMiddleware)(["USER", "CHARITY", "ADMIN"]), ai_controller_js_1.enhanceListingHandler);
router.post("/enhance-blog", rateLimit_middleware_js_1.apiRateLimiter, (0, auth_middleware_1.authMiddleware)(["USER", "CHARITY", "ADMIN"]), ai_controller_js_1.enhanceBlogHandler);
router.post("/suggest-event", rateLimit_middleware_js_1.apiRateLimiter, (0, auth_middleware_1.authMiddleware)(["USER", "CHARITY", "ADMIN"]), ai_controller_js_1.suggestEventHandler);
router.post("/smart-search", rateLimit_middleware_js_1.apiRateLimiter, ai_controller_js_1.smartSearchHandler);
router.post("/search-by-image", rateLimit_middleware_js_1.apiRateLimiter, upload.single("image"), ai_controller_js_1.searchByImageHandler);
exports.default = router;
