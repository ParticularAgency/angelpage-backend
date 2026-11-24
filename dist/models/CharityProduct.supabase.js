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
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertCharityProduct = upsertCharityProduct;
exports.bulkUpsertCharityProducts = bulkUpsertCharityProducts;
const supabaseClient_js_1 = require("../config/supabaseClient.js");
/**
 * Upsert (insert or update) a single charity product
 */
function upsertCharityProduct(product) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        const { error } = yield supabaseClient_js_1.supabase
            .from('charity_products')
            .upsert({
            item_id: product.itemId,
            charity_seller: product.charitySeller,
            title: product.title,
            price: (_a = product.price) !== null && _a !== void 0 ? _a : null,
            currency: (_b = product.currency) !== null && _b !== void 0 ? _b : null,
            image: (_c = product.image) !== null && _c !== void 0 ? _c : null,
            thumbnail_images: (_d = product.thumbnailImages) !== null && _d !== void 0 ? _d : [],
            additional_images: (_e = product.additionalImages) !== null && _e !== void 0 ? _e : [],
            categories: (_f = product.categories) !== null && _f !== void 0 ? _f : [],
            category: (_g = product.category) !== null && _g !== void 0 ? _g : null,
            condition: (_h = product.condition) !== null && _h !== void 0 ? _h : null,
            brand: (_j = product.brand) !== null && _j !== void 0 ? _j : null,
            seller: (_k = product.seller) !== null && _k !== void 0 ? _k : {},
            buying_options: (_l = product.buyingOptions) !== null && _l !== void 0 ? _l : [],
            shipping_options: (_m = product.shippingOptions) !== null && _m !== void 0 ? _m : [],
            item_location: (_o = product.itemLocation) !== null && _o !== void 0 ? _o : {},
            affiliate_url: (_p = product.affiliateUrl) !== null && _p !== void 0 ? _p : null,
            updated_at: (_q = product.updatedAt) !== null && _q !== void 0 ? _q : new Date().toISOString(),
        }, { onConflict: 'item_id' });
        if (error) {
            console.error(`❌ Supabase upsert error for ${product.itemId}:`, error.message);
        }
    });
}
/**
 * Bulk upsert products (faster for many items)
 */
function bulkUpsertCharityProducts() {
    return __awaiter(this, arguments, void 0, function* (products = []) {
        if (!products.length)
            return;
        const formatted = products.map(p => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
            return ({
                item_id: p.itemId,
                charity_seller: p.charitySeller,
                title: p.title,
                price: (_a = p.price) !== null && _a !== void 0 ? _a : null,
                currency: (_b = p.currency) !== null && _b !== void 0 ? _b : null,
                image: (_c = p.image) !== null && _c !== void 0 ? _c : null,
                thumbnail_images: (_d = p.thumbnailImages) !== null && _d !== void 0 ? _d : [],
                additional_images: (_e = p.additionalImages) !== null && _e !== void 0 ? _e : [],
                categories: (_f = p.categories) !== null && _f !== void 0 ? _f : [],
                category: (_g = p.category) !== null && _g !== void 0 ? _g : null,
                condition: (_h = p.condition) !== null && _h !== void 0 ? _h : null,
                brand: (_j = p.brand) !== null && _j !== void 0 ? _j : null,
                seller: (_k = p.seller) !== null && _k !== void 0 ? _k : {},
                buying_options: (_l = p.buyingOptions) !== null && _l !== void 0 ? _l : [],
                shipping_options: (_m = p.shippingOptions) !== null && _m !== void 0 ? _m : [],
                item_location: (_o = p.itemLocation) !== null && _o !== void 0 ? _o : {},
                affiliate_url: (_p = p.affiliateUrl) !== null && _p !== void 0 ? _p : null,
                updated_at: (_q = p.updatedAt) !== null && _q !== void 0 ? _q : new Date().toISOString(),
            });
        });
        const { error } = yield supabaseClient_js_1.supabase
            .from('charity_products')
            .upsert(formatted, { onConflict: 'item_id' });
        if (error) {
            console.error(`❌ Bulk upsert failed:`, error.message);
        }
        else {
            console.log(`✅ Saved/updated ${products.length} charity products in Supabase.`);
        }
    });
}
