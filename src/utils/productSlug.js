const slugify = (text) =>
	String(text || "")
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "")
		.replace(/[\s_-]+/g, "-")
		.replace(/^-+|-+$/g, "");

const isMongoObjectId = (value) =>
	/^[a-f\d]{24}$/i.test(String(value || ""));

async function buildUniqueProductSlug(name, excludeId = null) {
	const mongoose = require("mongoose");
	const Product =
		mongoose.models.Product ||
		mongoose.model(
			"Product",
			new mongoose.Schema(
				{ slug: { type: String, unique: true, sparse: true } },
				{ collection: "products", strict: false },
			),
		);
	let base = slugify(name);
	if (!base) base = "product";

	let slug = base;
	let suffix = 0;

	while (true) {
		const query = { slug };
		if (excludeId) {
			query._id = { $ne: excludeId };
		}
		const exists = await Product.findOne(query).select("_id").lean();
		if (!exists) return slug;
		suffix += 1;
		slug = `${base}-${suffix}`;
	}
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
