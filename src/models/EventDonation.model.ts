import mongoose, { Schema, Document, Types } from "mongoose";

export interface IEventDonation extends Document {
	donationNumber: string;
	eventId: Types.ObjectId;
	eventTitle: string;
	eventSlug: string;
	charityId?: Types.ObjectId;
	charityName?: string;
	fundId: string;
	fundLabel: string;
	amount: number;
	currency: string;
	donorName: string;
	donorEmail: string;
	donorUserId?: Types.ObjectId;
	isAnonymous: boolean;
	paymentStatus: "pending" | "paid" | "failed";
	stripePaymentIntentId?: string;
	paidAt?: Date;
}

const eventDonationSchema = new Schema<IEventDonation>(
	{
		donationNumber: { type: String, required: true, unique: true },
		eventId: { type: Schema.Types.ObjectId, ref: "CommunityEvent", required: true },
		eventTitle: { type: String, required: true },
		eventSlug: { type: String, required: true },
		charityId: { type: Schema.Types.ObjectId, ref: "Charity" },
		charityName: { type: String, default: "" },
		fundId: { type: String, required: true },
		fundLabel: { type: String, required: true },
		amount: { type: Number, required: true, min: 1 },
		currency: { type: String, default: "gbp" },
		donorName: { type: String, default: "Anonymous Angel" },
		donorEmail: { type: String, required: true },
		donorUserId: { type: Schema.Types.ObjectId, ref: "User" },
		isAnonymous: { type: Boolean, default: false },
		paymentStatus: {
			type: String,
			enum: ["pending", "paid", "failed"],
			default: "pending",
		},
		stripePaymentIntentId: { type: String },
		paidAt: { type: Date },
	},
	{ timestamps: true },
);

eventDonationSchema.index({ eventId: 1, paymentStatus: 1 });

export default mongoose.model<IEventDonation>("EventDonation", eventDonationSchema);
