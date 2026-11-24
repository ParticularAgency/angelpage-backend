import mongoose, { Schema, Document } from "mongoose";

export interface IBlogPost extends Document {
	title: string;
	slug: string;
	excerpt: string;
	content: string;
	coverImage: string;
	tags: string[];
	category: string;
	authorId: mongoose.Types.ObjectId;
	authorRole: "USER" | "CHARITY" | "ADMIN";
	authorName: string;
	authorAvatar: string;
	status: "draft" | "pending_review" | "published" | "rejected";
	publishedAt?: Date;
	featured: boolean;
}

const blogPostSchema = new Schema<IBlogPost>(
	{
		title: { type: String, required: true, trim: true },
		slug: { type: String, required: true, unique: true, lowercase: true },
		excerpt: { type: String, default: "" },
		content: { type: String, default: "" },
		coverImage: { type: String, default: "" },
		tags: [{ type: String }],
		category: { type: String, default: "stories" },
		authorId: { type: Schema.Types.ObjectId, required: true },
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
			default: "draft",
		},
		publishedAt: { type: Date },
		featured: { type: Boolean, default: false },
	},
	{ timestamps: true },
);

blogPostSchema.index({ status: 1, publishedAt: -1 });
blogPostSchema.index({ authorId: 1, authorRole: 1 });

export default mongoose.model<IBlogPost>("BlogPost", blogPostSchema);
