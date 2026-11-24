"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { buildUniqueProductSlug } = require("./utils/productSlug.js");
dotenv.config();
const productSchema = new mongoose.Schema({
    name: String,
    slug: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
}, { collection: "products", strict: false });
const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
function migrateProductSlugs() {
    return __awaiter(this, void 0, void 0, function* () {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!uri) {
            console.error("Missing MONGODB_URI / MONGO_URI");
            process.exit(1);
        }
        yield mongoose.connect(uri);
        const products = yield Product.find({
            $or: [{ slug: { $exists: false } }, { slug: null }, { slug: "" }],
        }).select("_id name slug");
        let updated = 0;
        for (const product of products) {
            const slug = yield buildUniqueProductSlug(product.name || `product-${product._id}`, product._id);
            yield Product.updateOne({ _id: product._id }, { $set: { slug } });
            updated += 1;
            console.log(`Updated ${product._id} -> ${slug}`);
        }
        console.log(`Done. Updated ${updated} product(s).`);
        yield mongoose.disconnect();
    });
}
migrateProductSlugs().catch((err) => {
    console.error(err);
    process.exit(1);
});
