// import { Request, Response } from "express";
import Product from "../../models/Product.model";
import User from "../../models/User.model";
import Charity from "../../models/Charity.model";
import cloudinary from "../../config/cloudinary";

// Create a new product
export const createProduct = async (req, res) => {
	const {
		name,
		price,
		charityProfit,
		category,
		charity,
		additionalInfo,
		subcategory,
		condition,
		brand,
		material,
		color,
		size,
		dimensions,
		selectedCharityName,
		selectedCharityId,
		status,
	} = req.body;

	const { userId, role } = req.user;

	try {
		if (!name || !price || !category) {
			return res
				.status(400)
				.json({ message: "Name, price, and category are required." });
		}
		// Parse dimensions if it's a string
		let parsedDimensions = null;
		if (dimensions) {
			if (typeof dimensions === "string") {
				try {
					parsedDimensions = JSON.parse(dimensions);
				} catch (err) {
					return res.status(400).json({
						message:
							"Invalid dimensions format. It must be a valid JSON object.",
					});
				}
			} else if (typeof dimensions === "object") {
				parsedDimensions = dimensions;
			} else {
				return res.status(400).json({
					message:
						"Invalid dimensions format. It must be an object or a JSON string.",
				});
			}
		}
		// Handle file uploads if provided
		const images = [];
		if (req.files && Array.isArray(req.files)) {
			for (const file of req.files) {
				const result = await cloudinary.uploader.upload(file.path, {
					folder: "products",
				});
				images.push({ url: result.secure_url, altText: name || "" });
			}
		}

		// Determine the charity association based on the role
		let charityId = null;
		if (role === "USER") {
			if (!charity && status !== "DRAFT") {
				return res
					.status(400)
					.json({ message: "Charity is required for USER role." });
			}
			charityId = charity || null;
		} else if (role === "CHARITY") {
			charityId = userId;
		}

		// Create a new product
		const newProduct = new Product({
			name,
			price,
			charityProfit,
			category,
			charity: charityId,
			additionalInfo,
			subcategory,
			condition,
			brand,
			material,
			color,
			size,
			dimensions: parsedDimensions,
			selectedCharityName,
			selectedCharityId,
			seller: userId,
			images,
			status: status || "DRAFT",
			isArchived: false,
		});

		const savedProduct = await newProduct.save();

		// Add the product to the respective user or charity's listedProducts
		const model = role === "USER" ? User : Charity;
		await model.findByIdAndUpdate(userId, {
			$push: { listedProducts: savedProduct._id },
		});

		// If the product is associated with a selected charity, add it to their listedProducts
		if (selectedCharityId) {
			await Charity.findByIdAndUpdate(selectedCharityId, {
				$push: { listedProducts: savedProduct._id },
			});
		}

		return res.status(201).json({
			message: "Product created successfully",
			product: savedProduct,
		});
	} catch (error) {
		console.error("Error creating product:", error);
		return res.status(500).json({ message: "Failed to create product." });
	}
};

// Edit a product
export const editProduct = async (req, res) => {
	const { productId } = req.params;
	const updates = req.body;

	try {
		const updatedProduct = await Product.findByIdAndUpdate(productId, updates, {
			new: true,
		});
		if (!updatedProduct) {
			return res.status(404).json({ message: "Product not found." });
		}

		return res.status(200).json({
			message: "Product updated successfully.",
			product: updatedProduct,
		});
	} catch (error) {
		console.error("Error editing product:", error);
		return res.status(500).json({ message: "Failed to update product." });
	}
};

// Archive (soft delete) a product
export const archiveProduct = async (req, res) => {
	const { productId } = req.params;

	try {
		const archivedProduct = await Product.findByIdAndUpdate(
			productId,
			{ isArchived: true },
			{ new: true },
		);
		if (!archivedProduct) {
			return res.status(404).json({ message: "Product not found." });
		}

		return res.status(200).json({
			message: "Product archived successfully.",
			product: archivedProduct,
		});
	} catch (error) {
		console.error("Error archiving product:", error);
		return res.status(500).json({ message: "Failed to archive product." });
	}
};

// Permanently delete a product
export const deleteProduct = async (req, res) => {
	const { productId } = req.params;

	try {
		const deletedProduct = await Product.findByIdAndDelete(productId);
		if (!deletedProduct) {
			return res.status(404).json({ message: "Product not found." });
		}

		// Remove product reference from the respective user/charity
		await User.updateMany(
			{ listedProducts: productId },
			{ $pull: { listedProducts: productId } },
		);
		await Charity.updateMany(
			{ listedProducts: productId },
			{ $pull: { listedProducts: productId } },
		);

		return res.status(200).json({ message: "Product deleted successfully." });
	} catch (error) {
		console.error("Error deleting product:", error);
		return res.status(500).json({ message: "Failed to delete product." });
	}
};

// Fetch all products (public access)
export const getAllProducts = async (req, res) => {
	const { isArchived } = req.query; // Optional query to handle archived state

	try {
		const query = {}; // Initialize query object
		if (isArchived !== undefined) {
			query.isArchived = isArchived === "true"; // Handle archived filter
		} else {
			query.isArchived = false; // Default to showing only active products
		}

		const products = await Product.find(query)
			.populate("seller", "firstName lastName userName profileImage addresses")
			.populate("charity", "charityName charityID profileImage")
			.sort({ createdAt: -1 }); // Sort by creation date (newest first)

		if (!products || products.length === 0) {
			return res.status(404).json({ message: "No products found." });
		}
		const productsWithAddress = products.map(product => ({
			...product.toObject(),
			seller: {
				firstName: product.seller?.firstName,
				lastName: product.seller?.lastName,
				profileImage: product.seller?.profileImage,
				address: product.seller?.addresses?.[0], // Include default address
			},
		}));

		return res.status(200).json({ products: productsWithAddress });
	} catch (error) {
		console.error("Error fetching all products:", error);
		return res.status(500).json({ message: "Failed to fetch all products." });
	}
};

// Fetch products by category (public access)
export const getProductsByCategory = async (req, res) => {
	const { category } = req.params; // Extract category from the URL params
	const { isArchived } = req.query; // Optional query to handle archived state

	try {
		const query = { category }; // Base query to filter by category
		if (isArchived !== undefined) {
			query.isArchived = isArchived === "true"; // Handle archived filter
		} else {
			query.isArchived = false; // Default to showing only active products
		}

		const products = await Product.find(query)
			.populate("seller", "firstName lastName userName profileImage  addresses")
			.populate("charity", "charityName charityID profileImage")
			.sort({ createdAt: -1 }); // Sort products by the latest creation date

		if (!products || products.length === 0) {
			return res.status(404).json({ message: "No products found for this category." });
		}
		const productsWithAddress = products.map(product => ({
			...product.toObject(),
			seller: {
				firstName: product.seller?.firstName,
				lastName: product.seller?.lastName,
				profileImage: product.seller?.profileImage,
				address: product.seller?.addresses?.[0], // Include default address
			},
		}));

		return res.status(200).json({ products: productsWithAddress });
	} catch (error) {
		console.error("Error fetching products by category:", error);
		return res.status(500).json({ message: "Failed to fetch products by category." });
	}
};

// Fetch products by category or subcategory (public access)
export const getCategoryProducts = async (req, res) => {
	const { category, subcategory } = req.query; // Extract category and subcategory from query parameters
	const { isArchived } = req.query; // Optional query to handle archived state

	try {
		const query = {}; // Initialize query object
		if (category) query.category = category; // Add category to the query if provided
		if (subcategory) query.subcategory = subcategory; // Add subcategory to the query if provided
		if (isArchived !== undefined) {
			query.isArchived = isArchived === "true"; // Handle archived filter
		} else {
			query.isArchived = false; // Default to showing only active products
		}

		const products = await Product.find(query)
			.populate("seller", "firstName lastName userName profileImage addresses")
			.populate("charity", "charityName charityID profileImage")
			.sort({ createdAt: -1 }); // Sort by creation date (newest first)

		if (!products || products.length === 0) {
			return res
				.status(404)
				.json({ message: "No products found for the selected category." });
		}
		const productsWithAddress = products.map(product => ({
			...product.toObject(),
			seller: {
				firstName: product.seller?.firstName,
				lastName: product.seller?.lastName,
				profileImage: product.seller?.profileImage,
				address: product.seller?.addresses?.[0], // Include default address
			},
		}));

		return res.status(200).json({ products: productsWithAddress });
	} catch (error) {
		console.error("Error fetching category products:", error);
		return res.status(500).json({ message: "Failed to fetch category products." });
	}
};

// Fetch latest 10 products (public access)
export const getProductsByLatest = async (_req, res) => {
	try {
		const products = await Product.find({ isArchived: false })
			.populate("seller", "firstName lastName userName profileImage addresses")
			.populate("charity", "charityName charityID profileImage")
			.sort({ createdAt: -1 })
			.limit(10);

		if (!products || products.length === 0) {
			return res.status(404).json({ message: "No products found." });
		} 

		const productsWithAddress = products.map(product => ({
			...product.toObject(),
			seller: {
				firstName: product.seller?.firstName,
				lastName: product.seller?.lastName,
				profileImage: product.seller?.profileImage,
				address: product.seller?.addresses?.[0], // Include default address
			},
		}));

		return res.status(200).json({ products: productsWithAddress });
	} catch (error) {
		console.error("Error fetching latest products:", error);
		return res.status(500).json({ message: "Failed to fetch latest products." });
	}
};

// Controller for fetching related products
export const getRelatedProducts = async (req, res) => {
	const { category } = req.query;

	try {
		const products = await Product.find({ category, isArchived: false })
			.sort({ createdAt: -1 })
			.limit(10)
			.populate('charity', 'charityName profileImage');

		if (!products.length) {
			return res.status(404).json({ message: 'No related products found.' });
		}

		const productsWithAddress = products.map(product => ({
			...product.toObject(),
			seller: {
				firstName: product.seller?.firstName,
				lastName: product.seller?.lastName,
				profileImage: product.seller?.profileImage,
				address: product.seller?.addresses?.[0], // Include default address
			},
		}));

		return res.status(200).json({ products: productsWithAddress });
	} catch (err) {
		console.error('Error fetching related products:', err);
		res.status(500).json({ message: 'Failed to fetch related products.' });
	}
};


// Get role-based product listings (USER or CHARITY)
export const getRoleBasedListings = async (req, res) => {
	const { userId, role } = req.user;

	try {
		let products;

		if (role === "USER") {
			products = await Product.find({ seller: userId, isArchived: false });
		} else if (role === "CHARITY") {
			products = await Product.find({
				$or: [{ seller: userId }, { charity: userId }],
				isArchived: false,
			});
		} else {
			return res.status(403).json({ message: "Access denied. Invalid role." });
		}

		const productsWithAddress = products.map(product => ({
			...product.toObject(),
			seller: {
				firstName: product.seller?.firstName,
				lastName: product.seller?.lastName,
				profileImage: product.seller?.profileImage,
				address: product.seller?.addresses?.[0], // Include default address
			},
		}));

		return res.status(200).json({ products: productsWithAddress });
	} catch (error) {
		console.error("Error fetching role-based listings:", error);
		return res.status(500).json({ message: "Failed to fetch listings." });
	}
};

// Get Product Details (Public Access)
export const getProductDetails = async (req, res) => {
	const { productId } = req.params;

	try {
		// Fetch product details by ID, including populated fields for seller and charity
		const product = await Product.findById(productId)
			.populate("seller", "firstName lastName profileImage  addresses")
			.populate("charity", "charityName charityID storefrontId profileImage");

		if (!product) {
			return res.status(404).json({ message: "Product not found." });
		}



		// Return product details with charity and seller info
		return res.status(200).json({
			product: {
				id: product._id,
				name: product.name,
				additionalInfo: product.additionalInfo,
				price: product.price,
				charityProfit: product.charityProfit,
				description: product.additionalInfo,
				images: product.images,
				category: product.category,
				subcategory: product.subcategory,
				condition: product.condition,
				brand: product.brand,
				material: product.material,
				color: product.color,
				size: product.size,
				dimensions: {
					height: product.dimensions?.height || null,
					width: product.dimensions?.width || null,
					depth: product.dimensions?.depth || null,
				},
				createdAt: product.createdAt,
				charity: {
					charityName: product.charity?.charityName,
					charityID: product.charity?.charityID,
					storefrontId: product.charity?.storefrontId,
					profileImage: product.charity?.profileImage,
				},
				seller: {
					firstName: product.seller?.firstName,
					lastName: product.seller?.lastName,
					profileImage: product.seller?.profileImage,
					address: product.seller?.addresses?.[0],
				},
			},
		});
	} catch (error) {
		console.error("Error fetching product details:", error);
		return res
			.status(500)
			.json({ message: "Failed to fetch product details." });
	}
};



export const getListingProducts = async (req, res) => {
	const { userId, role } = req.user; // Extract userId and role from the authenticated request
	const { status, isArchived } = req.query; // Optional filters for status and archived state

	try {
		const query = {
			seller: userId, // Only fetch products posted by the current user/charity
		};

		if (status) query.status = status; // Filter by status (e.g., DRAFT or LIVE)
		if (isArchived !== undefined) query.isArchived = isArchived === "true"; // Handle archived filter

		// For CHARITY, also include products where the charity is explicitly associated
		if (role === "CHARITY") {
			query.$or = [{ seller: userId }, { charity: userId }];
		}

		const products = await Product.find(query)
			.populate("seller", "firstName lastName userName profileImage  addresses")
			.populate("charity", "charityName charityID profileImage")
			.sort({ createdAt: -1 }); // Sort by latest created products

		const productsWithAddress = products.map(product => ({
			...product.toObject(),
			seller: {
				firstName: product.seller?.firstName,
				lastName: product.seller?.lastName,
				profileImage: product.seller?.profileImage,
				address: product.seller?.addresses?.[0], // Include default address
			},
		}));

		return res.status(200).json({ products: productsWithAddress });
	} catch (error) {
		console.error("Error fetching user products:", error);
		res.status(500).json({ message: "Failed to fetch user products." });
	}
};

