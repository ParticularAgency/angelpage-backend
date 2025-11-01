import { supabase } from "../../config/supabaseClient.js";

/**
 * @desc Get charity products (pagination, filters, search, and seller)
 * @route GET /api/products/all-charity-products
 * @query page, limit, category, categoryId, minPrice, maxPrice, brand, search, seller
 */
export const getCharityProducts = async (req, res) => {
    try {
        const {
            page = "1",
            limit,
            category,
            categoryId,
            minPrice,
            maxPrice,
            brand,
            search,
            seller,
        } = req.query;

        const pageNum = parseInt(page, 10);
        const limitNum = limit ? parseInt(limit, 10) : 20;
        const offset = (pageNum - 1) * limitNum;

        let query = supabase
            .from("charity_products")
            .select("*", { count: "exact" })
            .range(offset, offset + limitNum - 1)
            .order("updated_at", { ascending: false });

        // 🧩 Filters
        if (category)
            query = query.ilike("category", `%${category}%`);
        if (brand)
            query = query.ilike("brand", `%${brand}%`);
        if (seller)
            query = query.ilike("charity_seller", `%${seller}%`);
        if (minPrice)
            query = query.gte("price", parseFloat(minPrice));
        if (maxPrice)
            query = query.lte("price", parseFloat(maxPrice));
        if (search)
            query = query.or(
                `title.ilike.%${search}%,brand.ilike.%${search}%,category.ilike.%${search}%,charity_seller.ilike.%${search}%`
            );

        const { data: products, count, error } = await query;
        if (error) throw error;

        // 🧮 Facet building
        const { data: allData } = await supabase
            .from("charity_products")
            .select("category,brand,price");

        const categoryFacet = {};
        const brandFacet = {};
        const priceRange = { minPrice: null, maxPrice: null };

        for (const item of allData || []) {
            if (item.category)
                categoryFacet[item.category] = (categoryFacet[item.category] || 0) + 1;
            if (item.brand)
                brandFacet[item.brand] = (brandFacet[item.brand] || 0) + 1;
            if (item.price) {
                priceRange.minPrice =
                    priceRange.minPrice === null
                        ? item.price
                        : Math.min(priceRange.minPrice, item.price);
                priceRange.maxPrice =
                    priceRange.maxPrice === null
                        ? item.price
                        : Math.max(priceRange.maxPrice, item.price);
            }
        }

        res.json({
            success: true,
            total: count || 0,
            page: pageNum,
            pages: Math.ceil((count || 0) / limitNum),
            count: products?.length || 0,
            products: products || [],
            filters: {
                categories: Object.entries(categoryFacet).map(([k, v]) => ({
                    categoryName: k,
                    count: v,
                })),
                brands: Object.entries(brandFacet).map(([k, v]) => ({
                    brand: k,
                    count: v,
                })),
                priceRange,
            },
        });
    } catch (error) {
        console.error("❌ Error fetching charity products:", error.message);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
/**
 * @desc Get products by a specific charity seller (with pagination and filters)
 * @route GET /api/products/charity/:charityName
 * @query page, limit, category, minPrice, maxPrice, brand, search
 */
export const getProductsByCharity = async (req, res) => {
    try {
        const { charityName } = req.params;
        const {
            page = "1",
            limit,
            category,
            minPrice,
            maxPrice,
            brand,
            search,
        } = req.query;

        // 🧩 Static charity list
        const charities = [
            { name: 'British Heart Foundation', seller: 'bhf_shops', charity_ids: '225971', logo: 'https://i.ebayimg.com/thumbs/images/g/4fIAAOSwusZn2Vfg/s-l960.webp' },
            { name: 'Oxfam', seller: 'oxfam_ebay_shop', charity_ids: '202918', logo: 'https://i.ebayimg.com/thumbs/images/g/vV8AAOSwqKln2Vfg/s-l960.webp' },
            { name: 'Cancer Research UK', seller: 'cancerresearchukshop', charity_ids: '1089464', logo: 'https://i.ebayimg.com/thumbs/images/g/qjQAAOSwJCpn2Vfg/s-l960.webp' },
            { name: 'British Red Cross', seller: 'britishredcross', charity_ids: '220949', logo: 'https://i.ebayimg.com/thumbs/images/g/JdYAAOSw2edn2Vfg/s-l960.webp' },
            { name: 'Children’s Society', seller: 'the_childrens_society', charity_ids: '221124', logo: '' },
            { name: 'Royal British Legion Industries', seller: 'theroyalbritishlegion', charity_ids: '210063', logo: '' },
            { name: 'Sense', seller: 'sensecharityretail', charity_ids: '289868', logo: '' },
            { name: 'PDSA', seller: 'pdsa_charity', charity_ids: '208217', logo: 'https://i.ebayimg.com/thumbs/images/g/rvsAAOSw2Gdn2Vfg/s-l960.webp' },
            { name: "Barnardo's", seller: 'barnardos_charity', charity_ids: '216250', logo: 'https://i.ebayimg.com/thumbs/images/g/D9kAAOSwHH1n2YPN/s-l960.webp' },
            { name: 'Age UK', seller: 'ageuk', charity_ids: '1128267', logo: 'https://i.ebayimg.com/thumbs/images/g/~IsAAOSwTZJn2Vfg/s-l960.webp' },
            { name: 'Sue Ryder', seller: 'sueryderpre-loved', charity_ids: '1052076', logo: 'https://i.ebayimg.com/thumbs/images/g/DNAAAOSwTFhn2Vfg/s-l960.webp' },
            { name: 'Marie Curie', seller: 'mariecurietrading', charity_ids: '207994', logo: 'https://i.ebayimg.com/thumbs/images/g/pXEAAOSwLjln4n8M/s-l960.webp' },
        ];

        if (!charityName) {
            return res.status(400).json({
                success: false,
                message: "Charity name (seller) is required in the URL.",
            });
        }

        // 🎯 Match the charity info from static list
        const charityInfo = charities.find(
            (c) => c.seller.toLowerCase() === charityName.toLowerCase()
        );

        if (!charityInfo) {
            return res.status(404).json({
                success: false,
                message: `Charity '${charityName}' not found in supported list.`,
            });
        }

        const pageNum = parseInt(page, 10);
        const limitNum = limit ? parseInt(limit, 10) : 20;
        const offset = (pageNum - 1) * limitNum;

        let query = supabase
            .from("charity_products")
            .select("*", { count: "exact" })
            .eq("charity_seller", charityName)
            .range(offset, offset + limitNum - 1)
            .order("updated_at", { ascending: false });

        // 🧩 Optional filters
        if (category) query = query.ilike("category", `%${category}%`);
        if (brand) query = query.ilike("brand", `%${brand}%`);
        if (minPrice) query = query.gte("price", parseFloat(minPrice));
        if (maxPrice) query = query.lte("price", parseFloat(maxPrice));
        if (search)
            query = query.or(
                `title.ilike.%${search}%,brand.ilike.%${search}%,category.ilike.%${search}%`
            );

        const { data: products, count, error } = await query;
        if (error) throw error;

        // 🧮 Build category & brand filters for that charity
        const { data: allData } = await supabase
            .from("charity_products")
            .select("category,brand,price")
            .eq("charity_seller", charityName);

        const categoryFacet = {};
        const brandFacet = {};
        const priceRange = { minPrice: null, maxPrice: null };

        for (const item of allData || []) {
            if (item.category)
                categoryFacet[item.category] = (categoryFacet[item.category] || 0) + 1;
            if (item.brand)
                brandFacet[item.brand] = (brandFacet[item.brand] || 0) + 1;
            if (item.price) {
                priceRange.minPrice =
                    priceRange.minPrice === null
                        ? item.price
                        : Math.min(priceRange.minPrice, item.price);
                priceRange.maxPrice =
                    priceRange.maxPrice === null
                        ? item.price
                        : Math.max(priceRange.maxPrice, item.price);
            }
        }

        res.json({
            success: true,
            charity: {
                seller: charityInfo.seller,
                name: charityInfo.name,
                logo: charityInfo.logo,
                charity_ids: charityInfo.charity_ids,
            },
            total: count || 0,
            page: pageNum,
            pages: Math.ceil((count || 0) / limitNum),
            count: products?.length || 0,
            products: products || [],
            filters: {
                categories: Object.entries(categoryFacet).map(([k, v]) => ({
                    categoryName: k,
                    count: v,
                })),
                brands: Object.entries(brandFacet).map(([k, v]) => ({
                    brand: k,
                    count: v,
                })),
                priceRange,
            },
        });
    } catch (error) {
        console.error("❌ Error fetching products by charity:", error.message);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

/**
 * @desc Return all supported charities (with fixed logos)
 * @route GET /api/products/charities
 */
export const getAvailableCharities = async (req, res) => {
    try {
        const charities = [
            { name: 'British Heart Foundation', seller: 'bhf_shops', charity_ids: '225971', logo: 'https://i.ebayimg.com/thumbs/images/g/4fIAAOSwusZn2Vfg/s-l960.webp' },
            { name: 'Oxfam', seller: 'oxfam_ebay_shop', charity_ids: '202918', logo: 'https://i.ebayimg.com/thumbs/images/g/vV8AAOSwqKln2Vfg/s-l960.webp' },
            { name: 'Cancer Research UK', seller: 'cancerresearchukshop', charity_ids: '1089464', logo: 'https://i.ebayimg.com/thumbs/images/g/qjQAAOSwJCpn2Vfg/s-l960.webp' },
            { name: 'British Red Cross', seller: 'britishredcross', charity_ids: '220949', logo: 'https://i.ebayimg.com/thumbs/images/g/JdYAAOSw2edn2Vfg/s-l960.webp' },
            { name: 'Children’s Society', seller: 'the_childrens_society', charity_ids: '221124', logo: '' },
            { name: 'Royal British Legion Industries', seller: 'theroyalbritishlegion', charity_ids: '210063', logo: '' },
            { name: 'Sense', seller: 'sensecharityretail', charity_ids: '289868', logo: '' },
            { name: 'PDSA', seller: 'pdsa_charity', charity_ids: '208217', logo: 'https://i.ebayimg.com/thumbs/images/g/rvsAAOSw2Gdn2Vfg/s-l960.webp' },
            { name: "Barnardo's", seller: 'barnardos_charity', charity_ids: '216250', logo: 'https://i.ebayimg.com/thumbs/images/g/D9kAAOSwHH1n2YPN/s-l960.webp' },
            { name: 'Age UK', seller: 'ageuk', charity_ids: '1128267', logo: 'https://i.ebayimg.com/thumbs/images/g/~IsAAOSwTZJn2Vfg/s-l960.webp' },
            { name: 'Sue Ryder', seller: 'sueryderpre-loved', charity_ids: '1052076', logo: 'https://i.ebayimg.com/thumbs/images/g/DNAAAOSwTFhn2Vfg/s-l960.webp' },
            { name: 'Marie Curie', seller: 'mariecurietrading', charity_ids: '207994', logo: 'https://i.ebayimg.com/thumbs/images/g/pXEAAOSwLjln4n8M/s-l960.webp' },
        ];

        res.json({
            success: true,
            count: charities.length,
            charities,
        });
    } catch (error) {
        console.error("❌ Error loading charities:", error.message);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
