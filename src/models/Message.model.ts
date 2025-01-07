import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
	conversationId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Conversation",
		required: true,
	},
	sender: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		refPath: "senderType",
	},
	senderType: {
		type: String,
		enum: ["User", "Charity"],
		required: true,
	},
	recipient: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		refPath: "recipientType",
	},
	recipientType: {
		type: String,
		enum: ["User", "Charity"],
		required: true,
	},
	content: { type: String, required: true },
	unread: { type: Boolean, default: true },
	createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Message", MessageSchema);
