import mongoose, { Schema, Document } from "mongoose";

interface IProductImage {
	url: string;
	altText?: string;
}

export interface IProduct extends Document {
	name: string;
	additionalInfo: string;
	selectedCharityId: string;
	selectCharityName: string;
	price: number;
	charityProfit: number;
	category: string;
	subcategory?: string;
	condition?: string;
	brand?: string;
	material?: string;
	color?: string;
	weight?: string;
	size?: string;
	dimensions?: {
		height?: string;
		width?: string;
		depth?: string;
	};
	selectedCharityName: string;
	images: IProductImage[];
	seller: mongoose.Types.ObjectId; // Reference to User
	charity?: mongoose.Types.ObjectId; // Optional reference to a charity
	status: "DRAFT" | "LIVE";
	isArchived: boolean;
}

const productImageSchema = new Schema<IProductImage>({
	url: { type: String, required: true },
	altText: { type: String, default: "" },
});

const productSchema = new Schema<IProduct>(
	{
		name: { type: String, required: false },
		selectedCharityName: { type: String, required: false },
		selectedCharityId: { type: String, required: false },
		additionalInfo: { type: String, required: false },
		price: { type: Number, required: false },
		charityProfit: { type: Number, required: false },
		category: { type: String, required: false },
		subcategory: { type: String, required: false },
		condition: { type: String, required: false },
		brand: { type: String, required: false },
		material: { type: String, required: false },
		color: { type: String, required: false },
		weight: { type: String, required: false },
		size: { type: String, required: false },
		dimensions: {
			type: {
				height: { type: String, default: "" },
				width: { type: String, default: "" },
				depth: { type: String, default: "" },
			},
			default: {},
		},

		images: {
			type: [productImageSchema],
			validate: [arrayLimit, "Maximum of 10 images are allowed."],
		},
		seller: { type: Schema.Types.ObjectId, ref: "User", required: false },
		charity: { type: Schema.Types.ObjectId, ref: "Charity", required: false },
		status: {
			type: String,
			enum: ["DRAFT", "LIVE", "REMOVED"],
			default: "DRAFT",
			required: false,
		},
		isArchived: { type: Boolean, default: false },
	},
	{ timestamps: true },
);
// Helper function to validate the number of images
function arrayLimit(val: IProductImage[]) {
  return val.length <= 10;
}
export default mongoose.model<IProduct>("Product", productSchema);
