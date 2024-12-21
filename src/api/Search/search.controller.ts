import { Request, Response } from "express";
import Product from "../../models/Product.model"; 
import Charity from "../../models/Charity.model"; 

export const getSearchSuggestions = async (req: Request, res: Response) => {
	const { query } = req.query;

	if (!query || typeof query !== "string") {
		return res.status(400).json({ message: "Invalid query parameter" });
	}

	try {
		// Search for products by name, category, subcategory, or brand
		const products = await Product.find({
			$or: [
				{ name: { $regex: query, $options: "i" } },
				{ category: { $regex: query, $options: "i" } },
				{ subcategory: { $regex: query, $options: "i" } },
				{ brand: { $regex: query, $options: "i" } },
			],
		}).select("_id name category subcategory brand");

		// Search for charities by charityName, storefrontId, or charityID
		const charities = await Charity.find({
			$or: [
				{ charityName: { $regex: query, $options: "i" } },
				{ storefrontId: { $regex: query, $options: "i" } },
				{ charityID: { $regex: query, $options: "i" } },
			],
		}).select("charityName storefrontId charityID");

		// Combine product and charity results
		const suggestions = [
			...products.map(product => ({
				id: product._id,
				name: product.name,
				category: product.category,
				subcategory: product.subcategory,
				brand: product.brand,
				type: "Product",
			})),
			...charities.map(charity => ({
				id: charity.charityID,
				storefrontId: charity.storefrontId,
				name: charity.charityName,
				type: "Charity",
			})),
		];

		res.status(200).json(suggestions);
	} catch (error) {
		console.error("Error fetching search suggestions:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};
