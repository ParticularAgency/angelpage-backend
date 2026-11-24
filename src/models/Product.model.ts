import mongoose, { Schema, Document } from "mongoose";

interface IProductImage {
	url: string;
	altText?: string;
}

export interface IProduct extends Document {
	name: string;
	slug?: string;
	additionalInfo: string;
	selectedCharityId: string;
	selectCharityName: string;
	price: number;
	charityProfit: number;
	sellerSharePercent?: number;
	sellerProfit?: number;
		fulfillmentType?: "uk_shipping" | "personal_delivery" | "self_collect" | "local_only";
	sellAreas?: string[];
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
	videos?: IProductImage[];
	quantity: number;
	stockRemaining: number;
	seller: mongoose.Types.ObjectId; // Reference to User
	charity?: mongoose.Types.ObjectId; // Optional reference to a charity
	status: "DRAFT" | "PENDING_REVIEW" | "LIVE" | "REMOVED";
	isArchived: boolean;
	ebayItemId?: string;
	ebayOfferId?: string;
	ebayAffiliateUrl?: string;
	affiliateUrl?: string;
	affiliatePartnerId?: string;
	shopifyProductId?: string;
	wooCommerceProductId?: string;
	externalProductUrl?: string;
	externalProductId?: string;
	source?: "angelpage" | "ebay_sync" | "ebay_affiliate" | "shopify_sync" | "woocommerce_sync" | "scrape_sync";
	checkoutMode?: "stripe" | "ebay_redirect" | "affiliate_redirect";
	isPromoted?: boolean;
	socialPosting?: {
		facebook: boolean;
		instagram: boolean;
		tiktok: boolean;
		tiktokVideoUrl?: string;
	};
}

const productImageSchema = new Schema<IProductImage>({
	url: { type: String, required: true },
	altText: { type: String, default: "" },
});

const productSchema = new Schema<IProduct>(
	{
		name: { type: String, required: false },
		slug: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
		selectedCharityName: { type: String, required: false },
		selectedCharityId: { type: String, required: false },
		additionalInfo: { type: String, required: false },
		price: { type: Number, required: false },
		charityProfit: { type: Number, required: false },
		sellerSharePercent: { type: Number, default: 0, min: 0, max: 100 },
		sellerProfit: { type: Number, required: false },
		fulfillmentType: {
			type: String,
			enum: ["uk_shipping", "personal_delivery", "self_collect", "local_only"],
			default: "uk_shipping",
		},
		sellAreas: { type: [String], default: [] },
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
		videos: {
			type: [productImageSchema],
			default: [],
		},
		quantity: { type: Number, default: 1, min: 1 },
		stockRemaining: { type: Number, default: 1, min: 0 },
		seller: { type: Schema.Types.ObjectId, ref: "User", required: false },
		charity: { type: Schema.Types.ObjectId, ref: "Charity", required: false },
		status: {
			type: String,
			enum: ["DRAFT", "PENDING_REVIEW", "LIVE", "REMOVED"],
			default: "DRAFT",
			required: false,
		},
		isArchived: { type: Boolean, default: false },
		ebayItemId: { type: String },
		ebayOfferId: { type: String },
		ebayAffiliateUrl: { type: String },
		affiliateUrl: { type: String },
		affiliatePartnerId: { type: String },
		shopifyProductId: { type: String },
		wooCommerceProductId: { type: String },
		externalProductUrl: { type: String },
		externalProductId: { type: String },
		source: {
			type: String,
			enum: [
				"angelpage",
				"ebay_sync",
				"ebay_affiliate",
				"shopify_sync",
				"woocommerce_sync",
				"scrape_sync",
			],
			default: "angelpage",
		},
		checkoutMode: {
			type: String,
			enum: ["stripe", "ebay_redirect", "affiliate_redirect"],
			default: "stripe",
		},
		isPromoted: { type: Boolean, default: false },
		socialPosting: {
			facebook: { type: Boolean, default: true },
			instagram: { type: Boolean, default: true },
			tiktok: { type: Boolean, default: false },
			tiktokVideoUrl: { type: String, default: "" },
		},
	},
	{ timestamps: true },
);
// Helper function to validate the number of images
function arrayLimit(val: IProductImage[]) {
  return val.length <= 10;
}
export default mongoose.model<IProduct>("Product", productSchema);
