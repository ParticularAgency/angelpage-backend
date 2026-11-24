import mongoose from "mongoose";



const socialPostLogSchema = new mongoose.Schema(

	{

		productId: {

			type: mongoose.Schema.Types.ObjectId,

			ref: "Product",

			index: true,

		},

		galleryItemId: {

			type: mongoose.Schema.Types.ObjectId,

			ref: "GalleryItem",

			index: true,

		},

		contentType: {

			type: String,

			enum: ["product", "gallery_item"],

			default: "product",

		},

		ownerId: { type: mongoose.Schema.Types.ObjectId, index: true },

		platform: {

			type: String,

			enum: ["facebook", "instagram", "tiktok", "twitter"],

			required: true,

		},

		status: {

			type: String,

			enum: ["pending", "success", "failed", "skipped"],

			default: "pending",

		},

		trigger: {

			type: String,

			enum: ["auto", "manual", "admin", "scheduled"],

			default: "auto",

		},

		scheduledFor: { type: Date },

		attempts: { type: Number, default: 0 },

		error: { type: String, default: "" },

		response: { type: mongoose.Schema.Types.Mixed },

	},

	{ timestamps: true },

);



export default mongoose.model("SocialPostLog", socialPostLogSchema);

