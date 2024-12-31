import express from "express";
import {
	createNotification,
	getCurrentUserNotifications,
	markAllNotificationsAsRead,
	removeNotification,
} from "./notifications.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = express.Router();

// Create a notification
router.post("/create", authMiddleware(), createNotification);

// Get current user's notifications
router.get("/alert", authMiddleware(), getCurrentUserNotifications);


// Mark all notifications as read
router.patch("/read-all", authMiddleware(), markAllNotificationsAsRead); 

// Remove a specific notification
router.delete("/:notificationId", authMiddleware(), removeNotification);


export default router;
