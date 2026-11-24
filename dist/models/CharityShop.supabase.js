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
exports.upsertCharityShop = upsertCharityShop;
const supabaseClient_js_1 = require("../config/supabaseClient.js");
/**
 * Upsert or update charity shop info
 */
function upsertCharityShop(_a) {
    return __awaiter(this, arguments, void 0, function* ({ seller, userName, totalProducts }) {
        const { error } = yield supabaseClient_js_1.supabase
            .from('charity_shops')
            .upsert({
            seller,
            user_name: userName !== null && userName !== void 0 ? userName : seller,
            total_products: totalProducts !== null && totalProducts !== void 0 ? totalProducts : 0,
            last_updated: new Date().toISOString(),
        }, { onConflict: 'seller' });
        if (error) {
            console.error(`❌ Supabase charity upsert failed (${seller}):`, error.message);
        }
        else {
            console.log(`🏪 Updated charity shop: ${seller} (${totalProducts} products)`);
        }
    });
}
