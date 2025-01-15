import express from "express";
import {
	startConversation,
	sendMessage,
	fetchConversation,
	fetchRecipientMessages,
	markMessagesAsRead,
	getUserConversations,
	getUserDetailsWithRole,
	fetchUnreadMessagesForRecipient,
} from "./messages.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = express.Router();

router.post("/conversations/start", authMiddleware(), startConversation);
router.post("/messages/send", authMiddleware(), sendMessage);
router.get(
	"/conversations/:conversationId",
	authMiddleware(),
	fetchConversation,
);
router.get(
	"/messages/recipient/:userId",
	authMiddleware(),
	fetchRecipientMessages,
);

router.get("/conversations/:userId", getUserConversations);
router.get("/unread-messages/:userId", fetchUnreadMessagesForRecipient);
router.get("/user/:userId/:role", authMiddleware(), getUserDetailsWithRole);

router.post("/messages/mark-as-read", markMessagesAsRead);
export default router;
