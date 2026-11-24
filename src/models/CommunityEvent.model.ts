import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPollOption {
	text: string;
	votes: number;
}

export interface ICommunityEvent extends Document {
	title: string;
	slug: string;
	excerpt: string;
	description: string;
	eventType: "donation" | "live_session" | "general";
	category: string;
	coverImage: string;
	startAt?: Date;
	endAt?: Date;
	donationGoal?: number;
	donationRaised: number;
	donationUrl?: string;
	liveStreamUrl?: string;
	charityId?: Types.ObjectId;
	fundAllocations?: {
		id: string;
		label: string;
		description?: string;
		percent?: number;
	}[];
	pollQuestion?: string;
	pollOptions: IPollOption[];
	status: "draft" | "pending_review" | "published" | "ended";
	featuredOnHomepage: boolean;
	authorId: Types.ObjectId;
	authorRole: "ADMIN" | "CHARITY";
	authorName: string;
}

const pollOptionSchema = new Schema<IPollOption>(
	{
		text: { type: String, required: true },
		votes: { type: Number, default: 0 },
	},
	{ _id: false },
);

const communityEventSchema = new Schema<ICommunityEvent>(
	{
		title: { type: String, required: true, trim: true },
		slug: { type: String, required: true, unique: true, lowercase: true },
		excerpt: { type: String, default: "" },
		description: { type: String, default: "" },
		eventType: {
			type: String,
			enum: ["donation", "live_session", "general"],
			default: "general",
		},
		category: { type: String, default: "community" },
		coverImage: { type: String, default: "" },
		startAt: { type: Date },
		endAt: { type: Date },
		donationGoal: { type: Number, default: 0 },
		donationRaised: { type: Number, default: 0 },
		donationUrl: { type: String, default: "" },
		liveStreamUrl: { type: String, default: "" },
		charityId: { type: Schema.Types.ObjectId, ref: "Charity" },
		fundAllocations: {
			type: [
				{
					id: { type: String, required: true },
					label: { type: String, required: true },
					description: { type: String, default: "" },
					percent: { type: Number, default: 0 },
				},
			],
			default: [],
		},
		pollQuestion: { type: String, default: "" },
		pollOptions: { type: [pollOptionSchema], default: [] },
		status: {
			type: String,
			enum: ["draft", "pending_review", "published", "ended"],
			default: "pending_review",
		},
		featuredOnHomepage: { type: Boolean, default: false },
		authorId: { type: Schema.Types.ObjectId, required: true },
		authorRole: {
			type: String,
			enum: ["ADMIN", "CHARITY"],
			required: true,
		},
		authorName: { type: String, default: "" },
	},
	{ timestamps: true },
);

communityEventSchema.index({ status: 1, featuredOnHomepage: 1, startAt: -1 });

export default mongoose.model<ICommunityEvent>(
	"CommunityEvent",
	communityEventSchema,
);
