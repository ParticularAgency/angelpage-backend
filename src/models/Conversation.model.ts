import mongoose from "mongoose";
const { Schema } = mongoose;

const ConversationSchema = new Schema({
	participants: [
		{
			participantId: {
				type: Schema.Types.ObjectId,
				required: true,
				refPath: "participants.participantType",
			},
			participantType: {
				type: String,
				required: true,
				enum: ["USER", "CHARITY"],
			},
		},
	],
	productId: {
		type: Schema.Types.ObjectId,
		ref: "Product",
		default: null,
	},
	productSnapshot: {
		name: { type: String },
		price: { type: Number },
		imageUrl: { type: String },
	},
	lastMessage: {
		content: { type: String },
		senderId: { type: Schema.Types.ObjectId },
		createdAt: { type: Date },
	},
	updatedAt: { type: Date, default: Date.now },
	createdAt: { type: Date, default: Date.now },
});

ConversationSchema.index({ "participants.participantId": 1, productId: 1 });
ConversationSchema.index({ updatedAt: -1 });

export default mongoose.model("Conversation", ConversationSchema);
