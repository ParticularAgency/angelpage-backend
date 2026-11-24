import mongoose from "mongoose";

const fieldMappingSchema = new mongoose.Schema(
	{
		title: { type: String, default: "title" },
		price: { type: String, default: "price" },
		image: { type: String, default: "image" },
		description: { type: String, default: "description" },
		url: { type: String, default: "url" },
		id: { type: String, default: "id" },
	},
	{ _id: false },
);

const affiliateConnectionSchema = new mongoose.Schema(
	{
		ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
		ownerRole: {
			type: String,
			enum: ["USER", "CHARITY", "ADMIN"],
			required: true,
		},
		label: { type: String, default: "Affiliate API" },
		apiUrl: { type: String, required: true },
		apiKeyEncrypted: { type: String, select: false },
		affiliateId: { type: String, default: "" },
		provider: {
			type: String,
			enum: ["generic", "ebay", "amazon", "custom"],
			default: "generic",
		},
		fieldMapping: { type: fieldMappingSchema, default: () => ({}) },
		itemsPath: { type: String, default: "products" },
		lastSyncAt: { type: Date },
		lastSyncStatus: {
			type: String,
			enum: ["idle", "running", "success", "failed"],
			default: "idle",
		},
		lastSyncError: { type: String, default: "" },
		lastImportedCount: { type: Number, default: 0 },
		active: { type: Boolean, default: true },
	},
	{ timestamps: true },
);

affiliateConnectionSchema.index({ ownerId: 1, ownerRole: 1 });

export default mongoose.model("AffiliateConnection", affiliateConnectionSchema);
