import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { apiRateLimiter } from "../../middlewares/rateLimit.middleware.js";
import {
	aiStatus,
	analyzeImage,
	enhanceListingHandler,
	enhanceBlogHandler,
	suggestEventHandler,
	smartSearchHandler,
	searchByImageHandler,
} from "./ai.controller.js";

const router = Router();
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		if (["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(file.mimetype)) {
			cb(null, true);
		} else {
			cb(new Error("Only JPG, PNG, or WebP images are allowed."));
		}
	},
});

router.get("/status", apiRateLimiter, aiStatus);

router.post(
	"/analyze-image",
	apiRateLimiter,
	authMiddleware(["USER", "CHARITY", "ADMIN"]),
	upload.single("image"),
	analyzeImage,
);

router.post(
	"/enhance-listing",
	apiRateLimiter,
	authMiddleware(["USER", "CHARITY", "ADMIN"]),
	enhanceListingHandler,
);

router.post(
	"/enhance-blog",
	apiRateLimiter,
	authMiddleware(["USER", "CHARITY", "ADMIN"]),
	enhanceBlogHandler,
);

router.post(
	"/suggest-event",
	apiRateLimiter,
	authMiddleware(["USER", "CHARITY", "ADMIN"]),
	suggestEventHandler,
);

router.post("/smart-search", apiRateLimiter, smartSearchHandler);

router.post(
	"/search-by-image",
	apiRateLimiter,
	upload.single("image"),
	searchByImageHandler,
);

export default router;
