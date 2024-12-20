import mongoose, { Schema, Document, Types } from "mongoose";

interface IFavoriteItem {
	itemId: string;
	type: "Product" | "Charity";
}

export interface IFavorite extends Document {
	user: Types.ObjectId;
	items: IFavoriteItem[];
}

const favoriteItemSchema = new Schema<IFavoriteItem>({
	itemId: { type: String, required: true },
	type: { type: String, enum: ["Product", "Charity"], required: true },
});

const favoriteSchema = new Schema<IFavorite>({
	user: { type: Schema.Types.ObjectId, ref: "User", required: true },
	items: [favoriteItemSchema],
});

export default mongoose.model<IFavorite>("Favorite", favoriteSchema);
