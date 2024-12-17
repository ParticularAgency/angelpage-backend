import mongoose, { Schema, Document, Types } from "mongoose";

// Define the interface for individual favorite items
interface IFavoriteItem {
	itemId: string;
	type: "Product" | "Charity"; // Enum-like constraint
}

// Define the interface for the Favorite document
export interface IFavorite extends Document {
	user: Types.ObjectId; // Reference to a User document
	items: IFavoriteItem[]; // Array of favorite items
}

// Schema for individual favorite items
const favoriteItemSchema = new Schema<IFavoriteItem>({
	itemId: { type: String, required: true }, // ID of the favorite item
	type: { type: String, enum: ["Product", "Charity"], required: true }, // Type of the favorite item
});

// Schema for the Favorite document
const favoriteSchema = new Schema<IFavorite>({
	user: { type: Schema.Types.ObjectId, ref: "User", required: true }, // Reference to the User model
	items: [favoriteItemSchema], // Embedded array of favorite items
});

// Export the Favorite model
export default mongoose.model<IFavorite>("Favorite", favoriteSchema);
