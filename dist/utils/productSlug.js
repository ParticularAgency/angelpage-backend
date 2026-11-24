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
const slugify = (text) => String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
const isMongoObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || ""));
function buildUniqueProductSlug(name_1) {
    return __awaiter(this, arguments, void 0, function* (name, excludeId = null) {
        const mongoose = require("mongoose");
        const Product = mongoose.models.Product ||
            mongoose.model("Product", new mongoose.Schema({ slug: { type: String, unique: true, sparse: true } }, { collection: "products", strict: false }));
        let base = slugify(name);
        if (!base)
            base = "product";
        let slug = base;
        let suffix = 0;
        while (true) {
            const query = { slug };
            if (excludeId) {
                query._id = { $ne: excludeId };
            }
            const exists = yield Product.findOne(query).select("_id").lean();
            if (!exists)
                return slug;
            suffix += 1;
            slug = `${base}-${suffix}`;
        }
    });
}
function resolveProductLookup(identifier) {
    if (isMongoObjectId(identifier)) {
        return { _id: identifier };
    }
    return { slug: String(identifier).toLowerCase() };
}
module.exports = {
    slugify,
    isMongoObjectId,
    buildUniqueProductSlug,
    resolveProductLookup,
};
