import mongoose, { Schema, Document } from "mongoose";

export interface ISearch extends Document {
	name: string;
	type: "Product" | "Charity";
	relatedId: string;
}

const SearchSchema: Schema = new Schema(
	{
		name: { type: String, required: true },
		type: { type: String, enum: ["Product", "Charity"], required: true },
		relatedId: { type: String, required: true }, // Product or Charity ID
	},
	{ timestamps: true },
);

export default mongoose.model<ISearch>("Search", SearchSchema);
