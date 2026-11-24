// migrateCharitiesToSupabase.js
import dotenv from "dotenv";
import mongoose from "mongoose";
import { createClient } from "@supabase/supabase-js";
import Charity from "./models/charities.model.js";

dotenv.config();

// MongoDB connection
await mongoose.connect(process.env.MONGO_URI);
console.log("✅ Connected to MongoDB");

// Supabase connection
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log("✅ Connected to Supabase");
/* --------------------------- 🔁 Helper: delay --------------------------- */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/* --------------------------- 🚀 Migration Logic --------------------------- */
async function migrateCharities() {


    console.log("✅ Connected to Supabase");
    const charities = await Charity.find();
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
            const { error } = await supabase
                .from("charity_data_lists")
                .insert(batch, { ignoreDuplicates: true });

            if (error) {
                console.error("❌ Error uploading:", error);
            } else {
                console.log(`✅ Uploaded ${batch.length} charities (${i + batch.length}/${charities.length})`);
            }

            await delay(500); // small pause between batches
        } catch (err) {
            console.error("⚠️ Upload exception:", err.message);
            await delay(2000);
        }
    }

    console.log("🎉 Migration complete!");
    await mongoose.disconnect();
}

migrateCharities();