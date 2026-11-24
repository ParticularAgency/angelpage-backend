import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
	getPublishedPosts,
	getPostBySlug,
	getMyPosts,
	getAdminPosts,
	createPost,
	updatePost,
	publishPost,
	deletePost,
	setCanBlog,
} from "./blog.controller";

const router = Router();
const upload = multer({ dest: "uploads/" });

router.get("/", getPublishedPosts);
router.get("/slug/:slug", getPostBySlug);

router.get("/mine", authMiddleware(["USER", "CHARITY", "CHARITY_STAFF", "ADMIN"]), getMyPosts);
router.get(
	"/admin/all",
	authMiddleware(["ADMIN"]),
	getAdminPosts,
);
router.post(
	"/",
	authMiddleware(["USER", "CHARITY", "CHARITY_STAFF", "ADMIN"]),
	upload.single("coverImage"),
	createPost,
);
router.put(
	"/:postId",
	authMiddleware(["USER", "CHARITY", "CHARITY_STAFF", "ADMIN"]),
	upload.single("coverImage"),
	updatePost,
);
router.patch(
	"/:postId/publish",
	authMiddleware(["ADMIN"]),
	publishPost,
);
router.patch(
	"/admin/can-blog/:userId",
	authMiddleware(["ADMIN"]),
	setCanBlog,
);
router.delete(
	"/:postId",
	authMiddleware(["USER", "CHARITY", "CHARITY_STAFF", "ADMIN"]),
	deletePost,
);

export default router;
