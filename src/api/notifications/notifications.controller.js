import Notification from "../../models/Notification.model";
import { getIO } from "../../config/socket";
import { pushNotification } from "../../utils/notifyUser.js";

export const notificationWebhook = async (req, res) => {
	const secret = process.env.NOTIFICATION_WEBHOOK_SECRET;
	const provided = req.get("x-angelpage-hook-secret");
	if (!secret || provided !== secret) {
		return res.status(401).json({ error: "Invalid hook secret." });
	}

	try {
		const notification = await pushNotification(req.body || {});
		if (!notification) {
			return res.status(400).json({ error: "Missing required fields." });
		}
		res.status(201).json({ success: true, notification });
	} catch (error) {
		res.status(500).json({ error: "Failed to deliver notification." });
	}
};

// Create a notification (already implemented, just updated argument names for clarity)
export const createNotification = async (req, res) => {
	try {
		const { recipientId, recipientRole, notificationType, message, metadata } = req.body;

		if (!recipientId || !recipientRole || !notificationType || !message) {
			return res.status(400).json({ error: "Missing required fields" });
		}

		// Ensure isRead is explicitly set to false
		const notification = new Notification({
			recipientId,
			recipientType: recipientRole,
			notificationType,
			message,
			metadata,
			isRead: false, 
		});

		await notification.save();

		// Emit to recipient's personal room for targeted delivery
		getIO().to(`user:${recipientId}`).emit('new-notification', notification);

		res.status(201).json({ success: true, notification });
	} catch (error) {
		// console.error("Error creating notification:", error);
		res.status(500).json({ error: "Failed to create notification" });
	}
};

// Fetch all notifications (read + unread) for notification centre
export const getAllUserNotifications = async (req, res) => {
	const userId = req.user?.userId;
	const role = req.user?.role;
	const { limit = 50, page = 1 } = req.query;

	if (!userId || !role) {
		return res.status(400).json({ error: "User ID or role is missing." });
	}

	try {
		const skip = (Number(page) - 1) * Number(limit);
		const query = { recipientId: userId, recipientType: role };

		const [notifications, total, unreadCount] = await Promise.all([
			Notification.find(query)
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(Number(limit)),
			Notification.countDocuments(query),
			Notification.countDocuments({ ...query, isRead: false }),
		]);

		res.status(200).json({
			success: true,
			notifications,
			total,
			unreadCount,
			page: Number(page),
		});
	} catch (error) {
		res.status(500).json({ error: "Failed to fetch notifications." });
	}
};

// Fetch notifications for the current user (unread only — header dropdown)
export const getCurrentUserNotifications = async (req, res) => {
	const userId = req.user?.userId;
	const role = req.user?.role;

	if (!userId || !role) {
		return res.status(400).json({ error: "User ID or role is missing." });
	}

	try {

		const notifications = await Notification.find({
			recipientId: userId,
			recipientType: role,
			isRead: false, 
		}).sort({ createdAt: -1 });
		console.log("Fetched Notification:", notifications); 

		res.status(200).json({ success: true, notifications });
	} catch (error) {
		// console.error("Error fetching notifications:", error);
		res.status(500).json({ error: "Failed to fetch notifications" });
	}
};



// Mark all notifications as read for the current user
export const markAllNotificationsAsRead = async (req, res) => {
	const userId = req.user?.userId; 
	const role = req.user?.role;

	if (!userId || !role) {
		return res.status(400).json({ error: "User ID or role is missing." });
	}

	try {
		// Update all unread notifications for the user
		const result = await Notification.updateMany(
			{ recipientId: userId, recipientType: role, isRead: false },
			{ isRead: true }
		);

		res.status(200).json({
			success: true,
			message: "All notifications marked as read successfully.",
			modifiedCount: result.nModified, 
		});
	} catch (error) {
		console.error("Error marking all notifications as read:", error);
		res.status(500).json({ error: "Failed to mark all notifications as read." });
	}
};

// Remove a specific notification
export const removeNotification = async (req, res) => {
	const { notificationId } = req.params;

	if (!notificationId) {
		return res.status(400).json({ error: "Notification ID is missing." });
	}

	try {
		const notification = await Notification.findByIdAndDelete(notificationId);

		if (!notification) {
			return res.status(404).json({ error: "Notification not found." });
		}

		res.status(200).json({
			success: true,
			message: "Notification removed successfully.",
			notification,
		});
	} catch (error) {
		console.error("Error removing notification:", error);
		res.status(500).json({ error: "Failed to remove notification." });
	}
};
