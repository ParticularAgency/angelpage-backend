import mongoose, { Schema, Document } from "mongoose";

interface IFavoriteItem {
	itemId: string;
	type: "Product" | "Charity";
}

export interface IFavorite extends Document {
	user: mongoose.Types.ObjectId;
	items: IFavoriteItem[];
}

const favoriteItemSchema = new Schema<IFavoriteItem>({
	itemId: { type: String, required: true },
	type: { type: String, enum: ["Product", "Charity"], required: true },
});

const favoriteSchema = new Schema<IFavorite>({
	user: { type: mongoose.Types.ObjectId, ref: "User", required: true },
	items: [favoriteItemSchema],
});

export default mongoose.model<IFavorite>("Favorite", favoriteSchema);
