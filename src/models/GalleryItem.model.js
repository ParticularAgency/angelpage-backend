import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
	{
		url: { type: String, required: true },
		publicId: { type: String, default: "" },
		mediaType: {
			type: String,
			enum: ["image", "video", "reel", "document"],
			required: true,
		},
		mimeType: { type: String, default: "" },
		thumbnailUrl: { type: String, default: "" },
		durationSec: { type: Number },
		altText: { type: String, default: "" },
	},
	{ _id: false },
);

const galleryItemSchema = new mongoose.Schema(
	{
		title: { type: String, required: true, trim: true },
		slug: { type: String, required: true, unique: true, lowercase: true, index: true },
		caption: { type: String, default: "" },
		media: { type: mediaSchema, required: true },
		kind: {
			type: String,
			enum: ["reel", "photo", "document"],
			default: "photo",
			index: true,
		},
		tags: [{ type: String }],
		productId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Product",
			index: true,
		},
		charityId: { type: mongoose.Schema.Types.ObjectId, ref: "Charity" },
		authorId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
		authorRole: {
			type: String,
			enum: ["USER", "CHARITY", "ADMIN"],
			required: true,
		},
		authorName: { type: String, default: "" },
		authorAvatar: { type: String, default: "" },
		status: {
			type: String,
			enum: ["draft", "pending_review", "published", "rejected"],
			default: "pending_review",
			index: true,
		},
		publishedAt: { type: Date },
		featured: { type: Boolean, default: false },
		viewCount: { type: Number, default: 0 },
		socialPosting: {
			facebook: { type: Boolean, default: true },
			instagram: { type: Boolean, default: true },
			tiktok: { type: Boolean, default: false },
			twitter: { type: Boolean, default: false },
			autoPostOnPublish: { type: Boolean, default: true },
		},
	},
	{ timestamps: true },
);

galleryItemSchema.index({ status: 1, publishedAt: -1 });
galleryItemSchema.index({ kind: 1, status: 1 });

export default mongoose.model("GalleryItem", galleryItemSchema);
