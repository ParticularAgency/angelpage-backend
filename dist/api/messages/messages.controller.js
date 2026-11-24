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
exports.fetchUnreadMessagesForRecipient = exports.getUserDetailsWithRole = exports.markMessagesAsRead = exports.getUserConversations = exports.fetchRecipientMessages = exports.fetchConversation = exports.sendMessage = exports.startConversation = void 0;
const Conversation_model_1 = __importDefault(require("../../models/Conversation.model"));
const Message_model_1 = __importDefault(require("../../models/Message.model"));
const User_model_1 = __importDefault(require("../../models/User.model"));
const Charity_model_1 = __importDefault(require("../../models/Charity.model"));
const Product_model_1 = __importDefault(require("../../models/Product.model"));
const notifyUser_js_1 = require("../../utils/notifyUser.js");
const messaging_helpers_1 = require("../../utils/messaging.helpers");
const emitToConversation = (conversationId, event, payload) => {
    getIO().to(`conversation:${conversationId}`).emit(event, payload);
};
const emitToUser = (userId, event, payload) => {
    getIO().to(`user:${userId}`).emit(event, payload);
};
const getParticipantDetails = (participantId, participantType) => __awaiter(void 0, void 0, void 0, function* () {
    const type = (0, messaging_helpers_1.normalizeParticipantType)(participantType);
    if (type === "USER") {
        return User_model_1.default.findById(participantId).select("firstName lastName userName profileImage email");
    }
    if (type === "CHARITY") {
        return Charity_model_1.default.findById(participantId).select("charityName userName profileImage email");
    }
    return null;
});
const startConversation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { buyerId, buyerType, sellerId, sellerType, productId } = req.body;
    if (!buyerId || !buyerType || !sellerId || !sellerType) {
        return res.status(400).json({
            message: "Buyer and Seller IDs and their types are required.",
        });
    }
    const normalizedBuyerType = (0, messaging_helpers_1.normalizeParticipantType)(buyerType);
    const normalizedSellerType = (0, messaging_helpers_1.normalizeParticipantType)(sellerType);
    if (!normalizedBuyerType || !normalizedSellerType) {
        return res.status(400).json({ message: "Invalid participant types." });
    }
    try {
        const query = {
            participants: {
                $all: [
                    (0, messaging_helpers_1.buildParticipantQuery)(buyerId, normalizedBuyerType),
                    (0, messaging_helpers_1.buildParticipantQuery)(sellerId, normalizedSellerType),
                ],
            },
        };
        if (productId) {
            query.productId = productId;
        }
        let conversation = yield Conversation_model_1.default.findOne(query);
        if (!conversation) {
            let productSnapshot = null;
            if (productId) {
                const product = yield Product_model_1.default.findById(productId).select("name price images");
                if (product) {
                    productSnapshot = {
                        name: product.name,
                        price: product.price,
                        imageUrl: ((_b = (_a = product.images) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.url) || null,
                    };
                }
            }
            conversation = new Conversation_model_1.default({
                participants: [
                    (0, messaging_helpers_1.buildParticipantQuery)(buyerId, normalizedBuyerType),
                    (0, messaging_helpers_1.buildParticipantQuery)(sellerId, normalizedSellerType),
                ],
                productId: productId || null,
                productSnapshot,
            });
            yield conversation.save();
        }
        const enriched = yield Conversation_model_1.default.findById(conversation._id).populate("productId", "name price images status");
        res.status(200).json({ success: true, conversation: enriched });
    }
    catch (error) {
        console.error("Error starting conversation:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
});
exports.startConversation = startConversation;
const sendMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { conversationId, senderId, senderType, recipientId, recipientType, content, } = req.body;
    if (!conversationId ||
        !senderId ||
        !senderType ||
        !recipientId ||
        !recipientType ||
        !(content === null || content === void 0 ? void 0 : content.trim())) {
        return res.status(400).json({ message: "All fields are required." });
    }
    try {
        const senderRefType = (0, messaging_helpers_1.toMessageRefType)(senderType);
        const recipientRefType = (0, messaging_helpers_1.toMessageRefType)(recipientType);
        if (!senderRefType || !recipientRefType) {
            return res.status(400).json({ message: "Invalid senderType or recipientType." });
        }
        const conversation = yield Conversation_model_1.default.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found." });
        }
        const newMessage = new Message_model_1.default({
            conversationId,
            sender: senderId,
            senderType: senderRefType,
            recipient: recipientId,
            recipientType: recipientRefType,
            content: content.trim(),
        });
        const savedMessage = yield newMessage.save();
        conversation.lastMessage = {
            content: content.trim(),
            senderId,
            createdAt: savedMessage.createdAt,
        };
        conversation.updatedAt = new Date();
        yield conversation.save();
        const populatedMessage = yield (0, messaging_helpers_1.populateMessageFields)(savedMessage, Message_model_1.default, User_model_1.default, Charity_model_1.default);
        const payload = {
            conversationId,
            message: populatedMessage,
        };
        emitToConversation(conversationId, "new-message", payload);
        emitToUser(recipientId, "conversation-updated", {
            conversationId,
            lastMessage: conversation.lastMessage,
        });
        emitToUser(senderId, "conversation-updated", {
            conversationId,
            lastMessage: conversation.lastMessage,
        });
        const senderName = ((_a = populatedMessage === null || populatedMessage === void 0 ? void 0 : populatedMessage.sender) === null || _a === void 0 ? void 0 : _a.firstName) ||
            ((_b = populatedMessage === null || populatedMessage === void 0 ? void 0 : populatedMessage.sender) === null || _b === void 0 ? void 0 : _b.charityName) ||
            "Someone";
        (0, notifyUser_js_1.notifyNewMessage)({
            recipientId,
            recipientType,
            senderName,
            conversationId,
        }).catch(console.error);
        res.status(201).json({
            success: true,
            message: "Message sent successfully.",
            data: populatedMessage,
        });
    }
    catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ message: "Internal server error.", error });
    }
});
exports.sendMessage = sendMessage;
const fetchConversation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { conversationId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const before = req.query.before;
    try {
        const conversation = yield Conversation_model_1.default.findById(conversationId).populate("productId", "name price images status seller charity");
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found." });
        }
        const messageQuery = { conversationId };
        if (before) {
            messageQuery.createdAt = { $lt: new Date(before) };
        }
        const messages = yield Message_model_1.default.find(messageQuery)
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        const enrichedMessages = yield Promise.all(messages.reverse().map((message) => __awaiter(void 0, void 0, void 0, function* () {
            if (message.senderType === "User") {
                message.sender = yield User_model_1.default.findById(message.sender).select("firstName lastName userName charityName email _id profileImage");
            }
            else {
                message.sender = yield Charity_model_1.default.findById(message.sender).select("charityName userName email _id profileImage");
            }
            if (message.recipientType === "User") {
                message.recipient = yield User_model_1.default.findById(message.recipient).select("firstName lastName userName charityName email _id profileImage");
            }
            else {
                message.recipient = yield Charity_model_1.default.findById(message.recipient).select("charityName userName email _id profileImage");
            }
            return message;
        })));
        res.status(200).json({
            success: true,
            conversation,
            messages: enrichedMessages,
            hasMore: messages.length === limit,
        });
    }
    catch (error) {
        console.error("Error fetching conversation:", error);
        res.status(500).json({ message: "Internal server error.", error });
    }
});
exports.fetchConversation = fetchConversation;
const fetchRecipientMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    if (!userId) {
        return res.status(400).json({ success: false, message: "Recipient ID is required." });
    }
    try {
        const conversations = yield Conversation_model_1.default.find({
            "participants.participantId": userId,
        })
            .sort({ updatedAt: -1 })
            .populate("productId", "name price images status")
            .lean();
        const enrichedConversations = yield Promise.all(conversations.map((conversation) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const other = (0, messaging_helpers_1.getOtherParticipant)(conversation, userId);
            const otherDetails = other
                ? yield getParticipantDetails(other.participantId, other.participantType)
                : null;
            const unreadCount = yield Message_model_1.default.countDocuments({
                conversationId: conversation._id,
                recipient: userId,
                status: "unread",
            });
            const lastMessageDoc = ((_a = conversation.lastMessage) === null || _a === void 0 ? void 0 : _a.content)
                ? conversation.lastMessage
                : yield Message_model_1.default.findOne({ conversationId: conversation._id })
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
        })));
        res.status(200).json({
            success: true,
            conversations: enrichedConversations,
        });
    }
    catch (error) {
        console.error("Error fetching recipient messages:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error.",
            error: error.message,
        });
    }
});
exports.fetchRecipientMessages = fetchRecipientMessages;
const getUserConversations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    return (0, exports.fetchRecipientMessages)(req, res);
});
exports.getUserConversations = getUserConversations;
const markMessagesAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { messageIds, conversationId } = req.body;
    if (conversationId) {
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
            const result = yield Message_model_1.default.updateMany({
                conversationId,
                recipient: userId,
                status: "unread",
            }, { $set: { status: "read", readAt: new Date() } });
            emitToConversation(conversationId, "messages-read", {
                conversationId,
                readerId: userId,
            });
            return res.status(200).json({
                success: true,
                message: "Messages marked as read",
                modifiedCount: result.modifiedCount,
            });
        }
        catch (error) {
            console.error("Error marking messages as read:", error);
            return res.status(500).json({ success: false, message: "Internal server error" });
        }
    }
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
        return res.status(400).json({ success: false, message: "No message IDs provided" });
    }
    try {
        const updatedMessages = yield Message_model_1.default.updateMany({ _id: { $in: messageIds } }, { $set: { status: "read", readAt: new Date() } });
        if (updatedMessages.modifiedCount === 0) {
            return res.status(404).json({ success: false, message: "No messages were updated" });
        }
        res.status(200).json({ success: true, message: "Messages marked as read" });
    }
    catch (error) {
        console.error("Error marking messages as read:", error);
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
});
exports.markMessagesAsRead = markMessagesAsRead;
const getUserDetailsWithRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    if (!userId) {
        return res.status(400).json({ success: false, message: "User ID is required." });
    }
    try {
        const user = yield User_model_1.default.findById(userId).select("firstName lastName userName profileImage role email");
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
        const charity = yield Charity_model_1.default.findById(userId).select("charityName userName profileImage description email");
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
    }
    catch (error) {
        console.error("Error fetching user details with role:", error);
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
});
exports.getUserDetailsWithRole = getUserDetailsWithRole;
const fetchUnreadMessagesForRecipient = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    if (!userId) {
        return res.status(400).json({ success: false, message: "User ID is required." });
    }
    try {
        const messages = yield Message_model_1.default.find({
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
    }
    catch (error) {
        console.error("Error fetching unread messages:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error.",
            error: error.message,
        });
    }
});
exports.fetchUnreadMessagesForRecipient = fetchUnreadMessagesForRecipient;
