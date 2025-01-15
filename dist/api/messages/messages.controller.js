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
const startConversation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { buyerId, buyerType, sellerId, sellerType } = req.body;
    if (!buyerId || !buyerType || !sellerId || !sellerType) {
        return res.status(400).json({
            message: "Buyer and Seller IDs and their types are required.",
        });
    }
    try {
        // Check if a conversation already exists between the participants
        let conversation = yield Conversation_model_1.default.findOne({
            participants: {
                $all: [
                    { participantId: buyerId, participantType: buyerType },
                    { participantId: sellerId, participantType: sellerType },
                ],
            },
        });
        // If no conversation exists, create a new one
        if (!conversation) {
            conversation = new Conversation_model_1.default({
                participants: [
                    { participantId: buyerId, participantType: buyerType },
                    { participantId: sellerId, participantType: sellerType },
                ],
            });
            yield conversation.save();
        }
        res.status(200).json({ success: true, conversation });
    }
    catch (error) {
        console.error("Error starting conversation:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
});
exports.startConversation = startConversation;
const sendMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { conversationId, senderId, senderType, recipientId, recipientType, content, } = req.body;
    if (!conversationId ||
        !senderId ||
        !senderType ||
        !recipientId ||
        !recipientType ||
        !content) {
        return res.status(400).json({ message: "All fields are required." });
    }
    try {
        // Validate senderType and recipientType against allowed enum values
        const validTypes = ["User", "Charity"];
        if (!validTypes.includes(senderType) || !validTypes.includes(recipientType)) {
            return res.status(400).json({ message: "Invalid senderType or recipientType." });
        }
        // Ensure the conversation exists
        const conversation = yield Conversation_model_1.default.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found." });
        }
        // Create and save the new message
        const newMessage = new Message_model_1.default({
            conversationId,
            sender: senderId,
            senderType,
            recipient: recipientId,
            recipientType,
            content,
        });
        const savedMessage = yield newMessage.save();
        res.status(201).json({
            success: true,
            message: "Message sent successfully.",
            data: savedMessage,
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
    try {
        // Fetch the conversation details
        const conversation = yield Conversation_model_1.default.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found." });
        }
        // Fetch messages for the conversation
        const messages = yield Message_model_1.default.find({ conversationId })
            .populate("sender", "firstName lastName userName charityName email _id profileImage") // Populate sender details
            .populate("recipient", "firstName lastName userName  charityName email _id profileImage") // Populate sender details
            .sort({ createdAt: 1 }); // Sort by creation time (oldest first)
        // Enrich each message with recipient details
        const enrichedMessages = yield Promise.all(messages.map((message) => __awaiter(void 0, void 0, void 0, function* () {
            if (!message.recipient) {
                // Find the recipient in the participants
                const recipientInfo = conversation.participants.find((participant) => participant.participantId.toString() !== message.sender._id.toString());
                if (recipientInfo) {
                    message.recipient = recipientInfo.participantId;
                    message.recipientType = recipientInfo.participantType;
                    // Fetch recipient details based on type
                    if (recipientInfo.participantType === "USER") {
                        const recipientUser = yield User_model_1.default.findById(recipientInfo.participantId).select("firstName lastName profileImage");
                        message.recipientDetails = recipientUser;
                    }
                    else if (recipientInfo.participantType === "CHARITY") {
                        const recipientCharity = yield Charity_model_1.default.findById(recipientInfo.participantId).select("charityName profileImage");
                        message.recipientDetails = recipientCharity;
                    }
                }
            }
            else {
                // Populate recipient if already present
                const recipient = message.recipientType === "User"
                    ? yield User_model_1.default.findById(message.recipient).select("firstName lastName profileImage")
                    : yield Charity_model_1.default.findById(message.recipient).select("charityName profileImage");
                message.recipientDetails = recipient;
            }
            return message;
        })));
        res.status(200).json({
            success: true,
            conversation,
            messages: enrichedMessages,
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
        console.error("Recipient ID is missing.");
        return res.status(400).json({ success: false, message: "Recipient ID is required." });
    }
    try {
        console.log("Fetching messages for user ID:", userId);
        // Fetch all messages where the user is either the sender or recipient
        const messages = yield Message_model_1.default.find({
            $or: [{ sender: userId }, { recipient: userId }],
        })
            .populate("sender", "firstName lastName userName charityName email _id profileImage")
            .populate("recipient", "firstName lastName userName charityName email _id profileImage")
            .sort({ conversationId: 1, createdAt: 1 });
        if (!messages || messages.length === 0) {
            console.log("No messages found for user ID:", userId);
            return res.status(200).json({ success: true, messages: [] });
        }
        // Group messages by conversationId
        const groupedMessages = messages.reduce((acc, message) => {
            const conversationId = message.conversationId.toString();
            if (!acc[conversationId]) {
                acc[conversationId] = {
                    conversationId: conversationId,
                    participants: message.participants,
                    lastMessage: message,
                };
            }
            else {
                // Update the lastMessage if the current message is newer
                if (new Date(message.createdAt) > new Date(acc[conversationId].lastMessage.createdAt)) {
                    acc[conversationId].lastMessage = message;
                }
            }
            return acc;
        }, {});
        // Convert the grouped object into an array
        const groupedConversations = Object.values(groupedMessages);
        res.status(200).json({
            success: true,
            conversations: groupedConversations,
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
    const { userId } = req.params;
    if (!userId) {
        console.error("Recipient ID is missing.");
        return res.status(400).json({ success: false, message: "Recipient ID is required." });
    }
    try {
        console.log("Fetching messages for recipient ID:", userId);
        // Fetch messages 
        const messages = yield Message_model_1.default.find({ recipient: userId })
            .populate("sender", "firstName userName charityName email _id lastName profileImage")
            .populate("recipient", "firstName userName charityName email _id lastName profileImage")
            .sort({ createdAt: -1 });
        if (!messages || messages.length === 0) {
            console.log("No messages found for recipient ID:", userId);
            return res.status(200).json({ success: true, messages: [] });
        }
        res.status(200).json({ success: true, messages });
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
exports.getUserConversations = getUserConversations;
const markMessagesAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { messageIds } = req.body; // Extract messageIds from the request body
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
        return res.status(400).json({ success: false, message: "No message IDs provided" });
    }
    try {
        // // Validate that each messageId is a valid ObjectId
        // messageIds.forEach(messageId => {
        //     if (!validateObjectId(messageId)) {
        //         throw new Error(`Invalid messageId: ${messageId}`);
        //     }
        // });
        // Update the status of the messages to "read"
        const updatedMessages = yield Message_model_1.default.updateMany({ _id: { $in: messageIds } }, { $set: { status: "read" } });
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
    const { userId } = req.params; // Extract userId from params
    const { role } = req.user; // Extract role from authenticated user (from the token)
    if (!userId) {
        return res.status(400).json({ success: false, message: "User ID is required." });
    }
    try {
        let responseData = {};
        // Role-based logic to determine how to fetch the user data
        if (role === 'USER') {
            // Find the user by userId
            const user = yield User_model_1.default.findOne({ _id: userId });
            if (!user) {
                return res.status(404).json({ success: false, message: "User not found." });
            }
            responseData = {
                firstName: user.firstName,
                lastName: user.lastName,
                userName: user.userName,
                profileImage: user.profileImage,
                role: user.role,
            };
        }
        else if (role === 'CHARITY') {
            // Find the charity by userId
            const charity = yield Charity_model_1.default.findOne({ _id: userId });
            if (!charity) {
                return res.status(404).json({ success: false, message: "Charity not found." });
            }
            responseData = {
                charityName: charity.charityName,
                profileImage: charity.profileImage,
                userName: charity.userName,
                description: charity.description,
                role: 'CHARITY',
            };
        }
        else {
            return res.status(400).json({ success: false, message: "Invalid role." });
        }
        // Return the user data
        res.status(200).json({ success: true, user: responseData });
    }
    catch (error) {
        console.error("Error fetching user details with role:", error);
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
});
exports.getUserDetailsWithRole = getUserDetailsWithRole;
const fetchUnreadMessagesForRecipient = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params; // Extract the userId from the params
    if (!userId) {
        console.error("User ID is missing.");
        return res.status(400).json({ success: false, message: "User ID is required." });
    }
    try {
        console.log("Fetching unread messages for user ID:", userId);
        // Fetch all unread messages where the current user is the recipient
        const messages = yield Message_model_1.default.find({
            recipient: userId, // Ensure the current user is the recipient
            // status: "unread",        // Ensure the message status is unread
        })
            .populate("sender", "firstName lastName userName charityName email _id profileImage") // Populate sender details
            .populate("recipient", "firstName lastName userName charityName email _id profileImage") // Populate recipient details
            .sort({ createdAt: -1 }); // Sort by creation time, newest first
        if (!messages || messages.length === 0) {
            console.log("No unread messages found for user ID:", userId);
            return res.status(200).json({ success: true, messages: [] });
        }
        res.status(200).json({
            success: true,
            messages,
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
