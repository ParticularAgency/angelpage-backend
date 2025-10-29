import { supabase } from '../config/supabaseClient.js';

/**
 * Upsert or update charity shop info
 */
export async function upsertCharityShop({ seller, userName, totalProducts }) {
    const { error } = await supabase
        .from('charity_shops')
        .upsert(
            {
                seller,
                user_name: userName ?? seller,
                total_products: totalProducts ?? 0,
                last_updated: new Date().toISOString(),
            },
            { onConflict: 'seller' }
        );

    if (error) {
        console.error(`❌ Supabase charity upsert failed (${seller}):`, error.message);
    } else {
        console.log(`🏪 Updated charity shop: ${seller} (${totalProducts} products)`);
    }
}
