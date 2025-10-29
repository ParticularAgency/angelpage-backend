import mongoose, { Schema, Document } from 'mongoose';

export interface ICharityCategory extends Document {
  charityId: string;
  seller: string;
  categories: { id: string; name: string; count: number }[];
  updatedAt: Date;
}

const CharityCategorySchema = new Schema<ICharityCategory>({
  charityId: { type: String, required: true },
  seller: { type: String, required: true, index: true },
  categories: [
    {
      id: String,
      name: String,
      count: Number,
    },
  ],
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<ICharityCategory>(
  'CharityCategory',
  CharityCategorySchema
);
