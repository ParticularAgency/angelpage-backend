import { supabase } from '../config/supabaseClient.js';

/**
 * Upsert (insert or update) a single charity product
 */
export async function upsertCharityProduct(product) {
    const { error } = await supabase
        .from('charity_products')
        .upsert(
            {
                item_id: product.itemId,
                charity_seller: product.charitySeller,
                title: product.title,
                price: product.price ?? null,
                currency: product.currency ?? null,
                image: product.image ?? null,
                thumbnail_images: product.thumbnailImages ?? [],
                additional_images: product.additionalImages ?? [],
                categories: product.categories ?? [],
                category: product.category ?? null,
                condition: product.condition ?? null,
                brand: product.brand ?? null,
                seller: product.seller ?? {},
                buying_options: product.buyingOptions ?? [],
                shipping_options: product.shippingOptions ?? [],
                item_location: product.itemLocation ?? {},
                affiliate_url: product.affiliateUrl ?? null,
                updated_at: product.updatedAt ?? new Date().toISOString(),
            },
            { onConflict: 'item_id' }
        );

    if (error) {
        console.error(`❌ Supabase upsert error for ${product.itemId}:`, error.message);
    }
}

/**
 * Bulk upsert products (faster for many items)
 */
export async function bulkUpsertCharityProducts(products = []) {
    if (!products.length) return;

    const formatted = products.map(p => ({
        item_id: p.itemId,
        charity_seller: p.charitySeller,
        title: p.title,
        price: p.price ?? null,
        currency: p.currency ?? null,
        image: p.image ?? null,
        thumbnail_images: p.thumbnailImages ?? [],
        additional_images: p.additionalImages ?? [],
        categories: p.categories ?? [],
        category: p.category ?? null,
        condition: p.condition ?? null,
        brand: p.brand ?? null,
        seller: p.seller ?? {},
        buying_options: p.buyingOptions ?? [],
        shipping_options: p.shippingOptions ?? [],
        item_location: p.itemLocation ?? {},
        affiliate_url: p.affiliateUrl ?? null,
        updated_at: p.updatedAt ?? new Date().toISOString(),
    }));

    const { error } = await supabase
        .from('charity_products')
        .upsert(formatted, { onConflict: 'item_id' });

    if (error) {
        console.error(`❌ Bulk upsert failed:`, error.message);
    } else {
        console.log(`✅ Saved/updated ${products.length} charity products in Supabase.`);
    }
}
