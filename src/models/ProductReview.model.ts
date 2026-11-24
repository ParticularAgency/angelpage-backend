import mongoose, { Schema, Document, Types } from "mongoose";

export interface IProductReview extends Document {
	product: Types.ObjectId;
	user: Types.ObjectId;
	order?: Types.ObjectId;
	rating: number;
	comment: string;
	verifiedPurchase: boolean;
	status: "pending" | "approved" | "rejected";
	adminNote?: string;
}

const productReviewSchema = new Schema<IProductReview>(
	{
		product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
		user: { type: Schema.Types.ObjectId, ref: "User", required: true },
		order: { type: Schema.Types.ObjectId, ref: "Order", required: false },
		rating: { type: Number, required: true, min: 1, max: 5 },
		comment: { type: String, required: true, maxlength: 2000 },
		verifiedPurchase: { type: Boolean, default: false },
		status: {
			type: String,
			enum: ["pending", "approved", "rejected"],
			default: "pending",
		},
		adminNote: { type: String, default: "" },
	},
	{ timestamps: true },
);

productReviewSchema.index({ product: 1, user: 1 }, { unique: true });
productReviewSchema.index({ status: 1, createdAt: -1 });

const ProductReview = mongoose.model<IProductReview>(
	"ProductReview",
	productReviewSchema,
);

export default ProductReview;
