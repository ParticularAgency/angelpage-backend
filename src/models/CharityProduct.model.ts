// import mongoose, { Schema, Document } from 'mongoose';

// /* ---------------------------------------------
//    🧱 Charity Product Interface
// --------------------------------------------- */
// export interface ICharityProduct extends Document {
//   itemId: string;
//   charitySeller: string;
//   title: string;
//   price?: number;
//   currency?: string;
//   image?: string;
//   thumbnailImages?: string[];
//   additionalImages?: string[];
//   categories?: { categoryId?: string; categoryName?: string }[];
//   category?: string;
//   condition?: string;
//   brand?: string;
//   seller?: {
//     username?: string;
//     feedbackPercentage?: string;
//     feedbackScore?: number;
//     sellerAccountType?: string;
//   };
//   buyingOptions?: string[];
//   shippingOptions?: {
//     shippingCostType?: string;
//     shippingCost?: { value?: string; currency?: string };
//     minEstimatedDeliveryDate?: string;
//     maxEstimatedDeliveryDate?: string;
//   }[];
//   itemLocation?: {
//     postalCode?: string;
//     country?: string;
//   };
//   affiliateUrl?: string;
//   updatedAt?: Date;
// }

// /* ---------------------------------------------
//    🧩 Charity Product Schema
// --------------------------------------------- */
// const CharityProductSchema = new Schema<ICharityProduct>(
//   {
//     itemId: { type: String, required: true, index: true, unique: true },
//     charitySeller: { type: String, required: true, index: true },
//     title: { type: String, required: true },

//     price: { type: Number },
//     currency: { type: String },
//     image: { type: String },

//     thumbnailImages: [{ type: String }],
//     additionalImages: [{ type: String }],

//     categories: [
//       {
//         categoryId: String,
//         categoryName: String,
//       },
//     ],

//     category: { type: String },
//     condition: { type: String },
//     brand: { type: String },

//     seller: {
//       username: String,
//       feedbackPercentage: String,
//       feedbackScore: Number,
//       sellerAccountType: String,
//     },

//     buyingOptions: [{ type: String }],

//     shippingOptions: [
//       {
//         shippingCostType: String,
//         shippingCost: {
//           value: String,
//           currency: String,
//         },
//         minEstimatedDeliveryDate: String,
//         maxEstimatedDeliveryDate: String,
//       },
//     ],

//     itemLocation: {
//       postalCode: String,
//       country: String,
//     },

//     affiliateUrl: { type: String },

//     updatedAt: { type: Date, default: Date.now },
//   },
//   { timestamps: true }
// );

// /* ---------------------------------------------
//    ⚙️ Model Export
// --------------------------------------------- */
// export default mongoose.model<ICharityProduct>(
//   'CharityProduct',
//   CharityProductSchema
// );
import mongoose, { Schema, Document } from 'mongoose';

export interface ICharityProduct extends Document {
  itemId: string;
  charitySeller: string;
  title: string;
  price?: number;
  currency?: string;
  image?: string;
  thumbnailImages?: string[];
  additionalImages?: string[];
  categories?: { categoryId?: string; categoryName?: string }[];
  category?: string;
  condition?: string;
  brand?: string;
  seller?: {
    username?: string;
    feedbackPercentage?: string;
    feedbackScore?: number;
    sellerAccountType?: string;
  };
  buyingOptions?: string[];
  shippingOptions?: {
    shippingCostType?: string;
    shippingCost?: { value?: string; currency?: string };
    minEstimatedDeliveryDate?: string;
    maxEstimatedDeliveryDate?: string;
  }[];
  itemLocation?: {
    postalCode?: string;
    country?: string;
  };
  affiliateUrl?: string;
  updatedAt?: Date;
}

const CharityProductSchema = new Schema<ICharityProduct>(
  {
    itemId: { type: String, required: true, index: true, unique: true },
    charitySeller: { type: String, required: true, index: true },
    title: { type: String, required: true },
    price: { type: Number, index: true },
    currency: { type: String },
    image: { type: String },
    thumbnailImages: [{ type: String }],
    additionalImages: [{ type: String }],
    categories: [{ categoryId: String, categoryName: String }],
    category: { type: String, index: true },
    condition: { type: String },
    brand: { type: String, index: true },
    seller: {
      username: String,
      feedbackPercentage: String,
      feedbackScore: Number,
      sellerAccountType: String,
    },
    buyingOptions: [{ type: String }],
    shippingOptions: [
      {
        shippingCostType: String,
        shippingCost: {
          value: String,
          currency: String,
        },
        minEstimatedDeliveryDate: String,
        maxEstimatedDeliveryDate: String,
      },
    ],
    itemLocation: {
      postalCode: String,
      country: String,
    },
    affiliateUrl: { type: String },
    updatedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// ⚡ Useful compound indexes
CharityProductSchema.index({ category: 1, price: 1 });
CharityProductSchema.index({ brand: 1, price: 1 });
CharityProductSchema.index({ charitySeller: 1, category: 1 });
CharityProductSchema.index({ updatedAt: -1 });

export default mongoose.model<ICharityProduct>(
  'CharityProduct',
  CharityProductSchema
);
