"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeNotification = exports.markAllNotificationsAsRead = exports.getCurrentUserNotifications = exports.createNotification = void 0;
const Notification_model_1 = __importDefault(require("../../models/Notification.model"));
// Create a notification (already implemented, just updated argument names for clarity)
const createNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { recipientId, recipientRole, notificationType, message, metadata } = req.body;
        if (!recipientId || !recipientRole || !notificationType || !message) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        // Ensure isRead is explicitly set to false
        const notification = new Notification_model_1.default({
            recipientId,
            recipientType: recipientRole,
            notificationType,
            message,
            metadata,
            isRead: false,
        });
        yield notification.save();
        res.status(201).json({ success: true, notification });
    }
    catch (error) {
        console.error("Error creating notification:", error);
        res.status(500).json({ error: "Failed to create notification" });
    }
});
exports.createNotification = createNotification;
// Fetch notifications for the current user
const getCurrentUserNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    const role = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
    if (!userId || !role) {
        return res.status(400).json({ error: "User ID or role is missing." });
    }
    try {
        const notifications = yield Notification_model_1.default.find({
            recipientId: userId,
            recipientType: role,
            isRead: false,
        }).sort({ createdAt: -1 });
        console.log("Fetched Notification:", notifications);
        res.status(200).json({ success: true, notifications });
    }
    catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ error: "Failed to fetch notifications" });
    }
});
exports.getCurrentUserNotifications = getCurrentUserNotifications;
// Mark all notifications as read for the current user
const markAllNotificationsAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    const role = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
    if (!userId || !role) {
        return res.status(400).json({ error: "User ID or role is missing." });
    }
    try {
        // Update all unread notifications for the user
        const result = yield Notification_model_1.default.updateMany({ recipientId: userId, recipientType: role, isRead: false }, { isRead: true });
        res.status(200).json({
            success: true,
            message: "All notifications marked as read successfully.",
            modifiedCount: result.nModified,
        });
    }
    catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({ error: "Failed to mark all notifications as read." });
    }
});
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
// Remove a specific notification
const removeNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { notificationId } = req.params;
    if (!notificationId) {
        return res.status(400).json({ error: "Notification ID is missing." });
    }
    try {
        const notification = yield Notification_model_1.default.findByIdAndDelete(notificationId);
        if (!notification) {
            return res.status(404).json({ error: "Notification not found." });
        }
        res.status(200).json({
            success: true,
            message: "Notification removed successfully.",
            notification,
        });
    }
    catch (error) {
        console.error("Error removing notification:", error);
        res.status(500).json({ error: "Failed to remove notification." });
    }
});
exports.removeNotification = removeNotification;
