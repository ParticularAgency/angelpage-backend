"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notifications_controller_1 = require("./notifications.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = express_1.default.Router();
// Create a notification
router.post("/create", (0, auth_middleware_1.authMiddleware)(), notifications_controller_1.createNotification);
// Get current user's notifications
router.get("/alert", (0, auth_middleware_1.authMiddleware)(), notifications_controller_1.getCurrentUserNotifications);
// Mark all notifications as read
router.patch("/read-all", (0, auth_middleware_1.authMiddleware)(), notifications_controller_1.markAllNotificationsAsRead);
// Remove a specific notification
router.delete("/:notificationId", (0, auth_middleware_1.authMiddleware)(), notifications_controller_1.removeNotification);
exports.default = router;
