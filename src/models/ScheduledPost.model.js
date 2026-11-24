import mongoose from "mongoose";

const scheduledPostSchema = new mongoose.Schema(
	{
		productId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Product",
			required: true,
			index: true,
		},
		ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
		platforms: {
			type: [String],
			enum: ["facebook", "instagram", "tiktok", "twitter"],
			default: ["facebook", "instagram"],
		},
		scheduledFor: { type: Date, required: true, index: true },
		caption: { type: String, default: "" },
		status: {
			type: String,
			enum: ["scheduled", "processing", "completed", "failed", "cancelled"],
			default: "scheduled",
		},
		jobId: { type: String },
		error: { type: String, default: "" },
	},
	{ timestamps: true },
);

export default mongoose.model("ScheduledPost", scheduledPostSchema);
