import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
	getPublishedGallery,
	getGalleryBySlug,
	getMyGallery,
	getAdminGallery,
	createGalleryItem,
	publishGalleryItem,
	shareGalleryItem,
	deleteGalleryItem,
} from "./gallery.controller.js";

const router = Router();
const upload = multer({
	dest: "uploads/",
	limits: { fileSize: 100 * 1024 * 1024 },
});

router.get("/", getPublishedGallery);
router.get("/slug/:slug", getGalleryBySlug);

router.get(
	"/mine",
	authMiddleware(["USER", "CHARITY", "CHARITY_STAFF", "ADMIN"]),
	getMyGallery,
);
router.get("/admin/all", authMiddleware(["ADMIN"]), getAdminGallery);

router.post(
	"/",
	authMiddleware(["USER", "CHARITY", "CHARITY_STAFF", "ADMIN"]),
	upload.single("media"),
	createGalleryItem,
);

router.patch("/:id/publish", authMiddleware(["ADMIN"]), publishGalleryItem);

router.post(
	"/:id/share",
	authMiddleware(["USER", "CHARITY", "CHARITY_STAFF", "ADMIN"]),
	shareGalleryItem,
);

router.delete(
	"/:id",
	authMiddleware(["USER", "CHARITY", "CHARITY_STAFF", "ADMIN"]),
	deleteGalleryItem,
);

export default router;
