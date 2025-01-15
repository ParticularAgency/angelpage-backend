import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
	{
		recipientId: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			refPath: "recipientType",
		},
		recipientType: {
			type: String,
			enum: ["USER", "CHARITY", "ADMIN"],
			required: true,
		},
		notificationType: {
			type: String,
			enum: [
				"FAVORITE_MARKED",
				"NEW_MESSAGE",
				"PRODUCT_PURCHASED",
				"PRODUCT_SHIPPED",
				"PRODUCT_DELIVERED",
				"PRODUCT_ASSIGNED_TO_CHARITY",
				"NEW_PRODUCT_POSTED",
				"PRODUCT_SOLD_SUCCESS",
				"ESCROW_HOLD",
				"ESCROW_RELEASED",
				"PAYMENT_RELEASE",
			],
			required: true,
		},
		message: { type: String, required: true },
		metadata: { type: Object },
		isRead: { type: Boolean, default: false },
	},
	{ timestamps: true },
);

export default mongoose.model("Notification", notificationSchema);
