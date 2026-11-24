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
	messageWebhook,
} from "./messages.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = express.Router();

router.post("/hooks", messageWebhook);
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

router.get("/conversations/:userId", authMiddleware(), getUserConversations);
router.get("/unread-messages/:userId", authMiddleware(), fetchUnreadMessagesForRecipient);
router.get("/user/:userId/:role", authMiddleware(), getUserDetailsWithRole);

router.post("/messages/mark-as-read", authMiddleware(), markMessagesAsRead);
export default router;
