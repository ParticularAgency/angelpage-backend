import mongoose, { Document, Schema } from 'mongoose';

export interface ICharityShop extends Document {
  seller: string;
  userName: string;
  totalProducts?: number;
  lastUpdated?: Date;
}

const CharityShopSchema = new Schema<ICharityShop>(
  {
    seller: { type: String, required: true, unique: true },
    userName: {
      type: String,
      required: true,
      unique: true,
      // ✅ SAFE default — does not rely on `this`
      default: function (this: any) {
        // if "this" is undefined (during upsert), fallback to placeholder
        return this?.seller || 'unknown_seller';
      },
    },
    totalProducts: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Remove any extra duplicate indexes — let Mongoose manage
export default mongoose.model<ICharityShop>('CharityShop', CharityShopSchema);
