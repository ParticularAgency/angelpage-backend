import mongoose, { Schema, Document } from "mongoose";

interface ISubscription extends Document {
	email: string;
	subscribedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>({
	email: { type: String, required: true, unique: true },
	subscribedAt: { type: Date, default: Date.now },
});

export default mongoose.model<ISubscription>(
	"Subscription",
	SubscriptionSchema,
);
