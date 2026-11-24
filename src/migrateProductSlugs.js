const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { buildUniqueProductSlug } = require("./utils/productSlug.js");

dotenv.config();

const productSchema = new mongoose.Schema(
	{
		name: String,
		slug: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
	},
	{ collection: "products", strict: false },
);

const Product = mongoose.models.Product || mongoose.model("Product", productSchema);

async function migrateProductSlugs() {
	const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
	if (!uri) {
		console.error("Missing MONGODB_URI / MONGO_URI");
		process.exit(1);
	}

	await mongoose.connect(uri);

	const products = await Product.find({
		$or: [{ slug: { $exists: false } }, { slug: null }, { slug: "" }],
	}).select("_id name slug");

	let updated = 0;
	for (const product of products) {
		const slug = await buildUniqueProductSlug(
			product.name || `product-${product._id}`,
			product._id,
		);
		await Product.updateOne({ _id: product._id }, { $set: { slug } });
		updated += 1;
		console.log(`Updated ${product._id} -> ${slug}`);
	}

	console.log(`Done. Updated ${updated} product(s).`);
	await mongoose.disconnect();
}

migrateProductSlugs().catch((err) => {
	console.error(err);
	process.exit(1);
});
