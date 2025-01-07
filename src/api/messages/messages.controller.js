import Conversation from "../../models/Conversation.model";
import Message from "../../models/Message.model";
import User from "../../models/User.model";
import Charity from "../../models/Charity.model";

export const startConversation = async (req, res) => {
    const { buyerId, buyerType, sellerId, sellerType } = req.body;

    if (!buyerId || !buyerType || !sellerId || !sellerType) {
        return res.status(400).json({
            message: "Buyer and Seller IDs and their types are required.",
        });
    }

    try {
        // Check if a conversation already exists between the participants
        let conversation = await Conversation.findOne({
            participants: {
                $all: [
                    { participantId: buyerId, participantType: buyerType },
                    { participantId: sellerId, participantType: sellerType },
                ],
            },
        });

        // If no conversation exists, create a new one
        if (!conversation) {
            conversation = new Conversation({
                participants: [
                    { participantId: buyerId, participantType: buyerType },
                    { participantId: sellerId, participantType: sellerType },
                ],
            });
            await conversation.save();
        }

        res.status(200).json({ success: true, conversation });
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
        !content
    ) {
        return res.status(400).json({ message: "All fields are required." });
    }

    try {
        // Validate senderType and recipientType against allowed enum values
        const validTypes = ["User", "Charity"];
        if (!validTypes.includes(senderType) || !validTypes.includes(recipientType)) {
            return res.status(400).json({ message: "Invalid senderType or recipientType." });
        }

        // Ensure the conversation exists
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found." });
        }

        // Create and save the new message
        const newMessage = new Message({
            conversationId,
            sender: senderId,
            senderType,
            recipient: recipientId,
            recipientType,
            content,
        });

        const savedMessage = await newMessage.save();

        res.status(201).json({
            success: true,
            message: "Message sent successfully.",
            data: savedMessage,
        });
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ message: "Internal server error.", error });
    }
};

export const fetchConversation = async (req, res) => {
    const { conversationId } = req.params;

    try {
        // Fetch the conversation details
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found." });
        }

        // Fetch messages for the conversation
        const messages = await Message.find({ conversationId })
            .populate("sender", "firstName lastName profileImage") // Populate sender details
            .sort({ createdAt: 1 }); // Sort by creation time (oldest first)

        // Enrich each message with recipient details
        const enrichedMessages = await Promise.all(
            messages.map(async (message) => {
                if (!message.recipient) {
                    // Find the recipient in the participants
                    const recipientInfo = conversation.participants.find(
                        (participant) =>
                            participant.participantId.toString() !== message.sender._id.toString()
                    );

                    if (recipientInfo) {
                        message.recipient = recipientInfo.participantId;
                        message.recipientType = recipientInfo.participantType;

                        // Fetch recipient details based on type
                        if (recipientInfo.participantType === "USER") {
                            const recipientUser = await User.findById(recipientInfo.participantId).select(
                                "firstName lastName profileImage"
                            );
                            message.recipientDetails = recipientUser;
                        } else if (recipientInfo.participantType === "CHARITY") {
                            const recipientCharity = await Charity.findById(
                                recipientInfo.participantId
                            ).select("charityName profileImage");
                            message.recipientDetails = recipientCharity;
                        }
                    }
                } else {
                    // Populate recipient if already present
                    const recipient =
                        message.recipientType === "User"
                            ? await User.findById(message.recipient).select(
                                "firstName lastName profileImage"
                            )
                            : await Charity.findById(message.recipient).select(
                                "charityName profileImage"
                            );

                    message.recipientDetails = recipient;
                }

                return message;
            })
        );

        res.status(200).json({
            success: true,
            conversation,
            messages: enrichedMessages,
        });
    } catch (error) {
        console.error("Error fetching conversation:", error);
        res.status(500).json({ message: "Internal server error.", error });
    }
};

export const fetchRecipientMessages = async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        console.error("Recipient ID is missing.");
        return res.status(400).json({ success: false, message: "Recipient ID is required." });
    }

    try {
        console.log("Fetching messages for recipient ID:", userId);

        // Fetch messages where the user is the recipient
        const messages = await Message.find({ recipient: userId })
            .populate("sender", "firstName lastName profileImage")
            .populate("recipient", "firstName lastName profileImage")
            .sort({ createdAt: -1 });

        if (!messages || messages.length === 0) {
            console.log("No messages found for recipient ID:", userId);
            return res.status(200).json({ success: true, messages: [] });
        }

        res.status(200).json({ success: true, messages });
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
    const { userId } = req.params;

    if (!userId) {
        console.error("Recipient ID is missing.");
        return res.status(400).json({ success: false, message: "Recipient ID is required." });
    }

    try {
        console.log("Fetching messages for recipient ID:", userId);

        // Fetch messages where the user is the recipient
        const messages = await Message.find({ recipient: userId })
            .populate("sender", "firstName lastName profileImage")
            .populate("recipient", "firstName lastName profileImage")
            .sort({ createdAt: -1 });

        if (!messages || messages.length === 0) {
            console.log("No messages found for recipient ID:", userId);
            return res.status(200).json({ success: true, messages: [] });
        }

        res.status(200).json({ success: true, messages });
    } catch (error) {
        console.error("Error fetching recipient messages:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error.",
            error: error.message,
        });
    }
};
// Fetch user conversations
// export const getUserConversations = async (req, res) => {
//     const { userId } = req.params;

//     if (!userId) {
//         return res.status(400).json({ success: false, message: 'User ID is required.' });
//     }

//     try {
//         // Fetch all conversations where the user is a participant
//         const conversations = await Conversation.find({
//             participants: { $elemMatch: { participantId: userId } },
//         }).populate("participants.participantId", "firstName lastName charityName profileImage");

//         if (!conversations || conversations.length === 0) {
//             return res.status(404).json({ success: false, message: "No conversations found." });
//         }

//         // Enrich conversations with the last message
//         const enrichedConversations = await Promise.all(
//             conversations.map(async (conv) => {
//                 const lastMessage = await Message.findOne({ conversationId: conv._id })
//                     .sort({ createdAt: -1 })
//                     .select("content createdAt sender senderType");

//                 return {
//                     conversationId: conv._id,
//                     participants: conv.participants,
//                     lastMessage: lastMessage ? lastMessage.content : null,
//                     lastMessageTime: lastMessage ? lastMessage.createdAt : null,
//                 };
//             })
//         );

//         res.status(200).json({ success: true, conversations: enrichedConversations });
//     } catch (error) {
//         console.error("Error fetching user conversations:", error);
//         res.status(500).json({ success: false, message: "Internal server error.", error });
//     }
// };