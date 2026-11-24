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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// migrateCharitiesToSupabase.js
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const supabase_js_1 = require("@supabase/supabase-js");
const charities_model_js_1 = __importDefault(require("./models/charities.model.js"));
dotenv_1.default.config();
// MongoDB connection
await mongoose_1.default.connect(process.env.MONGO_URI);
console.log("✅ Connected to MongoDB");
// Supabase connection
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log("✅ Connected to Supabase");
/* --------------------------- 🔁 Helper: delay --------------------------- */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/* --------------------------- 🚀 Migration Logic --------------------------- */
function migrateCharities() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("✅ Connected to Supabase");
        const charities = yield charities_model_js_1.default.find();
        console.log(`📦 Found ${charities.length} charities in MongoDB`);
        const batchSize = 100;
        for (let i = 0; i < charities.length; i += batchSize) {
            const batch = charities.slice(i, i + batchSize).map((c) => ({
                first_name: c.firstName || null,
                last_name: c.lastName || null,
                email: c.email || null,
                user_name: c.userName || null,
                password: c.password || null,
                role: c.role || "CHARITY",
                profile_image: c.profileImage || null,
                charity_banner_image: c.charityBannerImage || null,
                profile_completed: c.profileCompleted || false,
                verified: c.verified || false,
                charity_name: c.charityName || null,
                charity_number: c.charityNumber || null,
                charity_id: c.charityID || null,
                phone_number: c.phoneNumber || null,
                website_link: c.websiteLink || null,
                description: c.description || null,
                storefront_id: c.storefrontId || null,
                stripe_account_id: c.stripeAccountId || null,
                registration_status: c.registrationStatus || "PENDING",
                total_earned: c.totalEarned || 0,
                total_held_funds: c.totalHeldFunds || 0,
                upcoming_funds: c.upcomingFunds || 0,
                threshold_reached: c.thresholdReached || false,
                hold_date: c.holdDate || null,
                admin_confirmed: c.adminConfirmed || false,
                last_welcome_back_email_sent: c.lastWelcomeBackEmailSent || null,
                verification_code: c.verificationCode || null,
                verification_expiry: c.verificationExpiry || null,
                created_at: c.createdAt || new Date(),
                updated_at: c.updatedAt || new Date(),
            }));
            try {
                const { error } = yield supabase
                    .from("charity_data_lists")
                    .insert(batch, { ignoreDuplicates: true });
                if (error) {
                    console.error("❌ Error uploading:", error);
                }
                else {
                    console.log(`✅ Uploaded ${batch.length} charities (${i + batch.length}/${charities.length})`);
                }
                yield delay(500); // small pause between batches
            }
            catch (err) {
                console.error("⚠️ Upload exception:", err.message);
                yield delay(2000);
            }
        }
        console.log("🎉 Migration complete!");
        yield mongoose_1.default.disconnect();
    });
}
migrateCharities();
