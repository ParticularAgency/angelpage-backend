import express from "express";
import {
	createNotification,
	getCurrentUserNotifications,
	getAllUserNotifications,
	markAllNotificationsAsRead,
	removeNotification,
	notificationWebhook,
} from "./notifications.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = express.Router();

router.post("/hooks", notificationWebhook);

// Create a notification
router.post("/create", authMiddleware(), createNotification);

// Get current user's unread notifications (header bell)
router.get("/alert", authMiddleware(), getCurrentUserNotifications);

// Full notification history for account centre
router.get("/all", authMiddleware(), getAllUserNotifications);


// Mark all notifications as read
router.patch("/read-all", authMiddleware(), markAllNotificationsAsRead); 

// Remove a specific notification
router.delete("/:notificationId", authMiddleware(), removeNotification);


export default router;
