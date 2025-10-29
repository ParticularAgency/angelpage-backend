import mongoose from 'mongoose';
const { Schema } = mongoose;

/* ---------------------------------------------
   🧩 Charity Shop Schema (JS version)
--------------------------------------------- */
const CharityShopSchema = new Schema(
  {
    seller: { type: String, required: true, unique: true },

    userName: {
      type: String,
      required: true,
      unique: true,
      default: function () {
        // Safe fallback for upserts or missing context
        return this?.seller || 'unknown_seller';
      },
    },

    totalProducts: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

/* ---------------------------------------------
   ⚙️ Model Export
--------------------------------------------- */
const CharityShop = mongoose.model('CharityShop', CharityShopSchema);
export default CharityShop;
