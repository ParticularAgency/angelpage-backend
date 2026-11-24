import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
	getSocialPostLogs,
	triggerSocialPost,
	scheduleSocialPost,
	listScheduledPosts,
	cancelScheduledPost,
} from "./socialPosts.controller.js";

const router = Router();

router.get("/logs", authMiddleware(), getSocialPostLogs);
router.post("/trigger", authMiddleware(), triggerSocialPost);
router.post("/schedule", authMiddleware(), scheduleSocialPost);
router.get("/scheduled", authMiddleware(), listScheduledPosts);
router.delete("/scheduled/:id", authMiddleware(), cancelScheduledPost);

export default router;
