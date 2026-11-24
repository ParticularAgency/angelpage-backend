import Conversation from "../../models/Conversation.model";
import Message from "../../models/Message.model";
import User from "../../models/User.model";
import Charity from "../../models/Charity.model";
import Product from "../../models/Product.model";
import { notifyNewMessage } from "../../utils/notifyUser.js";
import { getIO } from "../../config/socket";
import {
	normalizeParticipantType,
	toMessageRefType,
	buildParticipantQuery,
	getOtherParticipant,
	populateMessageFields,
} from "../../utils/messaging.helpers";

const emitTo = (room, event, payload) => {
	try {
		getIO().to(room).emit(event, payload);
	} catch (error) {
		console.error("Realtime emit skipped:", error.message);
	}
};

const emitToConversation = (conversationId, event, payload) => {
	emitTo(`conversation:${conversationId}`, event, payload);
};

const emitToUser = (userId, event, payload) => {
	emitTo(`user:${userId}`, event, payload);
};

const getParticipantDetails = async (participantId, participantType) => {
	const type = normalizeParticipantType(participantType);
	if (type === "USER") {
		return User.findById(participantId).select(
			"firstName lastName userName profileImage email",
		);
	}
	if (type === "CHARITY") {
		return Charity.findById(participantId).select(
			"charityName userName profileImage email",
		);
	}
	return null;
};

export const startConversation = async (req, res) => {
	const { buyerId, buyerType, sellerId, sellerType, productId } = req.body;

	if (!buyerId || !buyerType || !sellerId || !sellerType) {
		return res.status(400).json({
			message: "Buyer and Seller IDs and their types are required.",
		});
	}

	const normalizedBuyerType = normalizeParticipantType(buyerType);
	const normalizedSellerType = normalizeParticipantType(sellerType);

	if (!normalizedBuyerType || !normalizedSellerType) {
		return res.status(400).json({ message: "Invalid participant types." });
	}

	try {
		const query = {
			participants: {
				$all: [
					buildParticipantQuery(buyerId, normalizedBuyerType),
					buildParticipantQuery(sellerId, normalizedSellerType),
				],
			},
		};

		if (productId) {
			query.productId = productId;
		}

		let conversation = await Conversation.findOne(query);

		if (!conversation) {
			let productSnapshot = null;
			if (productId) {
				const product = await Product.findById(productId).select(
					"name price images",
				);
				if (product) {
					productSnapshot = {
						name: product.name,
						price: product.price,
						imageUrl: product.images?.[0]?.url || null,
					};
				}
			}

			conversation = new Conversation({
				participants: [
					buildParticipantQuery(buyerId, normalizedBuyerType),
					buildParticipantQuery(sellerId, normalizedSellerType),
				],
				productId: productId || null,
				productSnapshot,
			});
			await conversation.save();
		}

		const enriched = await Conversation.findById(conversation._id).populate(
			"productId",
			"name price images status",
		);

		res.status(200).json({ success: true, conversation: enriched });
	} catch (error) {
		console.error("Error starting conversation:", error);
		res.status(500).json({ message: "Internal server error", error });
	}
};

export const sendMessage = async (req, res) => {
	const {
		conversationId,
		senderId,
		senderType,
		recipientId,
		recipientType,
		content,
	} = req.body;

	if (
		!conversationId ||
		!senderId ||
		!senderType ||
		!recipientId ||
		!recipientType ||
		!content?.trim()
	) {
		return res.status(400).json({ message: "All fields are required." });
	}

	try {
		const senderRefType = toMessageRefType(senderType);
		const recipientRefType = toMessageRefType(recipientType);

		if (!senderRefType || !recipientRefType) {
			return res.status(400).json({ message: "Invalid senderType or recipientType." });
		}

		const conversation = await Conversation.findById(conversationId);
		if (!conversation) {
			return res.status(404).json({ message: "Conversation not found." });
		}

		const newMessage = new Message({
			conversationId,
			sender: senderId,
			senderType: senderRefType,
			recipient: recipientId,
			recipientType: recipientRefType,
			content: content.trim(),
		});

		const savedMessage = await newMessage.save();

		conversation.lastMessage = {
			content: content.trim(),
			senderId,
			createdAt: savedMessage.createdAt,
		};
		conversation.updatedAt = new Date();
		await conversation.save();

		const populatedMessage = await populateMessageFields(
			savedMessage,
			Message,
			User,
			Charity,
		);

		const payload = {
			conversationId,
			message: populatedMessage,
		};

		emitToConversation(conversationId, "new-message", payload);
		emitToUser(recipientId, "new-message", payload);
		emitToUser(senderId, "message-delivered", payload);
		emitToUser(recipientId, "conversation-updated", {
			conversationId,
			lastMessage: conversation.lastMessage,
		});
		emitToUser(senderId, "conversation-updated", {
			conversationId,
			lastMessage: conversation.lastMessage,
		});

		const senderName =
			populatedMessage?.sender?.firstName ||
			populatedMessage?.sender?.charityName ||
			"Someone";
		const notifyRole = String(recipientType).toUpperCase().includes("CHARITY")
			? "CHARITY"
			: "USER";
		notifyNewMessage({
			recipientId,
			recipientType: notifyRole,
			senderName,
			conversationId,
		}).catch(console.error);

		res.status(201).json({
			success: true,
			message: "Message sent successfully.",
			data: populatedMessage,
		});
	} catch (error) {
		console.error("Error sending message:", error);
		res.status(500).json({ message: "Internal server error.", error });
	}
};

export const fetchConversation = async (req, res) => {
	const { conversationId } = req.params;
	const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
	const before = req.query.before;

	try {
		const conversation = await Conversation.findById(conversationId).populate(
			"productId",
			"name price images status seller charity",
		);

		if (!conversation) {
			return res.status(404).json({ message: "Conversation not found." });
		}

		const messageQuery = { conversationId };
		if (before) {
			messageQuery.createdAt = { $lt: new Date(before) };
		}

		const messages = await Message.find(messageQuery)
			.sort({ createdAt: -1 })
			.limit(limit)
			.lean();

		const enrichedMessages = await Promise.all(
			messages.reverse().map(async (message) => {
				if (message.senderType === "User") {
					message.sender = await User.findById(message.sender).select(
						"firstName lastName userName charityName email _id profileImage",
					);
				} else {
					message.sender = await Charity.findById(message.sender).select(
						"charityName userName email _id profileImage",
					);
				}

				if (message.recipientType === "User") {
					message.recipient = await User.findById(message.recipient).select(
						"firstName lastName userName charityName email _id profileImage",
					);
				} else {
					message.recipient = await Charity.findById(message.recipient).select(
						"charityName userName email _id profileImage",
					);
				}

				return message;
			}),
		);

		res.status(200).json({
			success: true,
			conversation,
			messages: enrichedMessages,
			hasMore: messages.length === limit,
		});
	} catch (error) {
		console.error("Error fetching conversation:", error);
		res.status(500).json({ message: "Internal server error.", error });
	}
};

export const fetchRecipientMessages = async (req, res) => {
	const { userId } = req.params;

	if (!userId) {
		return res.status(400).json({ success: false, message: "Recipient ID is required." });
	}

	try {
		const conversations = await Conversation.find({
			"participants.participantId": userId,
		})
			.sort({ updatedAt: -1 })
			.populate("productId", "name price images status")
			.lean();

		const enrichedConversations = await Promise.all(
			conversations.map(async (conversation) => {
				const other = getOtherParticipant(conversation, userId);
				const otherDetails = other
					? await getParticipantDetails(other.participantId, other.participantType)
					: null;

				const unreadCount = await Message.countDocuments({
					conversationId: conversation._id,
					recipient: userId,
					status: "unread",
				});

				const lastMessageDoc = conversation.lastMessage?.content
					? conversation.lastMessage
					: await Message.findOne({ conversationId: conversation._id })
							.sort({ createdAt: -1 })
							.populate("sender", "firstName lastName userName charityName profileImage")
							.lean();

				return {
					conversationId: conversation._id,
					participants: conversation.participants,
					productId: conversation.productId,
					productSnapshot: conversation.productSnapshot,
					otherParticipant: otherDetails,
					lastMessage: lastMessageDoc,
					unreadCount,
					updatedAt: conversation.updatedAt,
				};
			}),
		);

		res.status(200).json({
			success: true,
			conversations: enrichedConversations,
		});
	} catch (error) {
		console.error("Error fetching recipient messages:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error.",
			error: error.message,
		});
	}
};

export const getUserConversations = async (req, res) => {
	return fetchRecipientMessages(req, res);
};

export const markMessagesAsRead = async (req, res) => {
	const { messageIds, conversationId } = req.body;

	if (conversationId) {
		try {
			const userId = req.user?.userId;
			const result = await Message.updateMany(
				{
					conversationId,
					recipient: userId,
					status: "unread",
				},
				{ $set: { status: "read", readAt: new Date() } },
			);

			emitToConversation(conversationId, "messages-read", {
				conversationId,
				readerId: userId,
			});

			return res.status(200).json({
				success: true,
				message: "Messages marked as read",
				modifiedCount: result.modifiedCount,
			});
		} catch (error) {
			console.error("Error marking messages as read:", error);
			return res.status(500).json({ success: false, message: "Internal server error" });
		}
	}

	if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
		return res.status(400).json({ success: false, message: "No message IDs provided" });
	}

	try {
		const updatedMessages = await Message.updateMany(
			{ _id: { $in: messageIds } },
			{ $set: { status: "read", readAt: new Date() } },
		);

		if (updatedMessages.modifiedCount === 0) {
			return res.status(404).json({ success: false, message: "No messages were updated" });
		}

		res.status(200).json({ success: true, message: "Messages marked as read" });
	} catch (error) {
		console.error("Error marking messages as read:", error);
		res.status(500).json({ success: false, message: "Internal server error", error: error.message });
	}
};

export const getUserDetailsWithRole = async (req, res) => {
	const { userId } = req.params;

	if (!userId) {
		return res.status(400).json({ success: false, message: "User ID is required." });
	}

	try {
		const user = await User.findById(userId).select(
			"firstName lastName userName profileImage role email",
		);
		if (user) {
			return res.status(200).json({
				success: true,
				user: {
					_id: user._id,
					firstName: user.firstName,
					lastName: user.lastName,
					userName: user.userName,
					profileImage: user.profileImage,
					role: user.role || "USER",
				},
			});
		}

		const charity = await Charity.findById(userId).select(
			"charityName userName profileImage description email",
		);
		if (charity) {
			return res.status(200).json({
				success: true,
				user: {
					_id: charity._id,
					charityName: charity.charityName,
					profileImage: charity.profileImage,
					userName: charity.userName,
					description: charity.description,
					role: "CHARITY",
				},
			});
		}

		return res.status(404).json({ success: false, message: "Participant not found." });
	} catch (error) {
		console.error("Error fetching user details with role:", error);
		res.status(500).json({ success: false, message: "Internal server error", error: error.message });
	}
};

export const messageWebhook = async (req, res) => {
	const secret = process.env.NOTIFICATION_WEBHOOK_SECRET;
	const provided = req.get("x-angelpage-hook-secret");
	if (!secret || provided !== secret) {
		return res.status(401).json({ message: "Invalid hook secret." });
	}
	return sendMessage(req, res);
};

export const fetchUnreadMessagesForRecipient = async (req, res) => {
	const { userId } = req.params;

	if (!userId) {
		return res.status(400).json({ success: false, message: "User ID is required." });
	}

	try {
		const messages = await Message.find({
			recipient: userId,
			status: "unread",
		})
			.populate("sender", "firstName lastName userName charityName email _id profileImage")
			.populate("recipient", "firstName lastName userName charityName email _id profileImage")
			.sort({ createdAt: -1 });

		res.status(200).json({
			success: true,
			messages,
			count: messages.length,
		});
	} catch (error) {
		console.error("Error fetching unread messages:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error.",
			error: error.message,
		});
	}
};
