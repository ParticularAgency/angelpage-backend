import { Router } from "express";
import { PRODUCT_CATEGORIES } from "../../constants/productCategories.js";

const router = Router();

const slugify = (value) =>
	String(value)
		.toLowerCase()
		.replace(/&/g, "and")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");

/**
 * Public category taxonomy (source of truth for FE + AI).
 * GET /api/categories
 */
router.get("/", (_req, res) => {
	const categories = PRODUCT_CATEGORIES.map((cat) => ({
		id: slugify(cat.name),
		name: cat.name,
		subCategories: (cat.subCategories || []).map((sub) => ({
			id: slugify(sub),
			name: sub,
		})),
	}));

	res.status(200).json({
		categories,
		tangibleProductsOnly: true,
		ukShippingOnly: true,
		adminReviewRequired: true,
	});
});

export default router;
