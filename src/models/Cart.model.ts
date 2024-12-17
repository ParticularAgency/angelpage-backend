import mongoose, { Schema, Document } from "mongoose";

interface CartItem {
	productId: mongoose.Types.ObjectId;
	quantity: number;
}
export interface ICartDocument extends Document {
	userId: mongoose.Types.ObjectId;
	items: CartItem[];
}

const CartSchema = new Schema<ICartDocument>({
	userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
	items: [
		{
			productId: {
				type: Schema.Types.ObjectId,
				ref: "Product",
				required: true,
			},
			quantity: { type: Number, required: true, default: 1 },
		},
	],
});

export default mongoose.model<ICartDocument>("Cart", CartSchema);
