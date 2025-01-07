import mongoose from "mongoose";
const { Schema } = mongoose;

const ConversationSchema = new Schema({
	participants: [
		{
			participantId: {
				type: Schema.Types.ObjectId,
				required: true,
				refPath: "participants.participantType", // Dynamic reference based on participantType
			},
			participantType: {
				type: String,
				required: true,
				enum: ["USER", "CHARITY"], // Only these types are allowed
			},
		},
	],
	createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Conversation", ConversationSchema);
