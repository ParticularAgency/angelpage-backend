"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENT_CATEGORIES = exports.EVENT_TYPES = exports.BLOG_CATEGORIES = exports.PRODUCT_CATEGORIES = void 0;
/** Category taxonomy for AI prompts — keep in sync with frontend categoriesData.ts */
exports.PRODUCT_CATEGORIES = [
    { name: "Women", subCategories: ["Skirts", "Trousers", "Tops", "Knitwear", "Dresses", "Jeans", "Jackets", "Jumpsuits", "Coats", "Leather Jackets", "Trench Coats", "Swimwear", "Shorts"] },
    { name: "Men", subCategories: ["Shirts", "Trousers", "Jackets", "Jeans", "Coats"] },
    { name: "Children", subCategories: ["Clothing", "Shoes", "Accessories"] },
    { name: "Clothing", subCategories: ["Skirts", "Trousers", "Tops", "Knitwear", "Dresses", "Jeans", "Jackets", "Jumpsuits", "Coats", "Leather Jackets", "Trench Coats", "Swimwear", "Shorts"] },
    { name: "Shoes", subCategories: ["Boots", "Trainers", "Flats", "Sandals", "Clogs", "Heels"] },
    { name: "Bags", subCategories: ["Handbags", "Clutch Bags", "Backpacks", "Travel Bags", "Suitcases", "Luggage Bags"] },
    { name: "Accessories", subCategories: ["Sunglasses", "Wallets", "Belts", "Hats", "Scarves", "Purses", "Hair Accessories", "Pins & Brooches"] },
    { name: "Jewellery", subCategories: ["Earrings", "Necklaces", "Watches", "Rings", "Bracelets", "Jewellery Sets", "Bag Charms"] },
    { name: "Homeware", subCategories: ["Furniture", "cutlery", "bedding", "crockery", "curtains", "Decor", "Kitchenware"] },
    { name: "Books", subCategories: ["Fiction", "Non-Fiction", "Children's Books"] },
    { name: "Electronics", subCategories: ["Phones", "Laptops", "Tablets", "headphone", "light", "monitor"] },
];
exports.BLOG_CATEGORIES = [
    "general",
    "stories",
    "impact",
    "sustainability",
    "fashion",
    "community",
    "guides",
    "news",
];
exports.EVENT_TYPES = ["donation", "live_session", "general"];
exports.EVENT_CATEGORIES = [
    "community",
    "fundraiser",
    "awareness",
    "live",
    "volunteer",
];
