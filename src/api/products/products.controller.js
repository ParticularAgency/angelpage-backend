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
			// sellerType: role,
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



// Fetch all products (public access)
export const getAllProducts = async (req, res) => {
	const { isArchived , status} = req.query;

	try {
		const query = {
			...(status && { status }),
		};
		if (isArchived !== undefined) {
			query.isArchived = isArchived === "true"; // Handle archived filter
		} else {
			query.isArchived = false; 
		}

		const products = await Product.find(query)
			.populate("seller", "firstName lastName profileImage addresses charityName")
			.populate("charity", "charityName charityID profileImage addresses")
			.sort({ createdAt: -1 }); 

		if (!products || products.length === 0) {
			return res.status(404).json({ message: "No products found." });
		}
		const productsWithAddress = products.map(product => ({
			...product.toObject(),
			seller: {
				firstName: product.seller?.firstName,
				lastName: product.seller?.lastName,
				profileImage: product.seller?.profileImage,
				address: product.seller?.addresses?.[0],
			},
			charity: {
				charityName: product.charity?.charityName,
				charityID: product.charity?.charityID,
				profileImage: product.charity?.profileImage,
				address: product.charity?.addresses?.[0],
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
	const { category } = req.params; 
	const { isArchived, status } = req.query; 

	try {
		const query = {
			category,
			...(isArchived !== undefined && { isArchived: isArchived === 'true' }),
			...(status && { status }),
		};

		const products = await Product.find(query)
			.populate("seller", "firstName lastName userName profileImage  addresses charityName")
			.populate("charity", "charityName charityID profileImage   addresses")
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
			charity: {
				charityName: product.charity?.charityName,
				charityID: product.charity?.charityID,
				profileImage: product.charity?.profileImage,
				address: product.charity?.addresses?.[0],
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
	const { isArchived , status} = req.query; // Optional query to handle archived state

	try {
		const query = {
			...(status && { status }),
		}; // Initialize query object
		if (category) query.category = category; // Add category to the query if provided
		if (subcategory) query.subcategory = subcategory; // Add subcategory to the query if provided
		if (isArchived !== undefined) {
			query.isArchived = isArchived === "true"; // Handle archived filter
		} else {
			query.isArchived = false; // Default to showing only active products
		}

		const products = await Product.find(query)
			.populate("seller", "firstName lastName userName profileImage  addresses charityName")
			.populate("charity", "charityName charityID profileImage   addresses")
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
			charity: {
				charityName: product.charity?.charityName,
				charityID: product.charity?.charityID,
				profileImage: product.charity?.profileImage,
				address: product.charity?.addresses?.[0],
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
		const products = await Product.find({ isArchived: false, status: "LIVE" })
			.populate("seller", "firstName lastName userName profileImage  addresses charityName")
			.populate("charity", "charityName charityID profileImage   addresses")
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
				address: product.seller?.addresses?.[0],
			},
			charity: {
				charityName: product.charity?.charityName,
				charityID: product.charity?.charityID,
				profileImage: product.charity?.profileImage,
				address: product.charity?.addresses?.[0],
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
		const products = await Product.find({ category, isArchived: false, status: "LIVE" })
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
			charity: {
				charityName: product.charity?.charityName,
				charityID: product.charity?.charityID,
				profileImage: product.charity?.profileImage,
				address: product.charity?.addresses?.[0],
			},
		}));

		return res.status(200).json({ products: productsWithAddress });
	} catch (err) {
		console.error('Error fetching related products:', err);
		res.status(500).json({ message: 'Failed to fetch related products.' });
	}
};



// Get Product Details (Public Access)
export const getProductDetails = async (req, res) => {
	const { productId } = req.params;

	try {
		// Fetch product details by ID, including populated fields for seller and charity
		const product = await Product.findById(productId)
			.populate("seller", "_id firstName lastName profileImage  addresses")
			.populate("charity", "charityName charityID storefrontId profileImage  addresses");

		if (!product) {
			return res.status(404).json({ message: "Product not found." });
		}


		// Determine the seller type
		let sellerType = null;

		if (product.seller) {
			sellerType = "USER";
		} else if (product.charity) {
			sellerType = "CHARITY";
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
				status: product.status,
				dimensions: {
					height: product.dimensions?.height || null,
					width: product.dimensions?.width || null,
					depth: product.dimensions?.depth || null,
				},
				createdAt: product.createdAt,
				charity: {
					id: product.charity?._id,
					charityName: product.charity?.charityName,
					charityID: product.charity?.charityID,
					storefrontId: product.charity?.storefrontId,
					profileImage: product.charity?.profileImage,
					address: product.charity?.addresses?.[0],
				},
				sellerType,
				seller: {
					id: product.seller?._id,
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
	const { userId, role } = req.user; 
	const { status, isArchived } = req.query; 

	try {
		const query = {
			seller: userId, 
		};

		if (status) query.status = status; // Filter by status (e.g., DRAFT or LIVE)
		if (isArchived !== undefined) query.isArchived = isArchived === "true"; 


		if (role === "CHARITY") {
			query.$or = [{ seller: userId }, { charity: userId }];
		}

		const products = await Product.find(query)
			.populate("seller", "firstName lastName userName profileImage  addresses")
			.populate("charity", "charityName charityID profileImage addresses")
			.sort({ createdAt: -1 });

		const productsWithAddress = products.map(product => ({
			...product.toObject(),
			seller: {
				firstName: product.seller?.firstName,
				lastName: product.seller?.lastName,
				profileImage: product.seller?.profileImage,
				address: product.seller?.addresses?.[0], 
			},
		}));

		return res.status(200).json({ products: productsWithAddress });
	} catch (error) {
		console.error("Error fetching user products:", error);
		res.status(500).json({ message: "Failed to fetch user products." });
	}
};



// Edit a product
export const editProduct = async (req, res) => {
	try {
		const { productId } = req.params;
		const userId = req.user?.userId;
		const isCharity = req.user?.role === "CHARITY";

		const product = await Product.findById(productId);

		if (!product) {
			return res.status(404).json({ message: "Product not found" });
		}

		// Verify ownership
		const isOwner = isCharity
			? product.charity?.toString() === userId
			: product.seller?.toString() === userId;

		if (!isOwner) {
			return res.status(403).json({ message: "Unauthorized to edit this product" });
		}

		// Allow edits for `DRAFT` or `LIVE` only
		if (product.isArchived) {
			return res.status(400).json({ message: "Cannot edit archived products" });
		}

		Object.assign(product, req.body);
		await product.save();

		res.status(200).json({ message: "Product updated successfully", product });
	} catch (error) {
		console.error("Error editing product:", error);
		res.status(500).json({ message: "Failed to edit product" });
	}
};


// Archive (soft delete) a product
export const archiveProduct = async (req, res) => {
	try {
		const { productId } = req.params;
		const userId = req.user?.userId;
		const isCharity = req.user?.role === "CHARITY";

		const product = await Product.findById(productId);

		if (!product) {
			return res.status(404).json({ message: "Product not found" });
		}

		const isOwner = isCharity
			? product.charity?.toString() === userId
			: product.seller?.toString() === userId;

		if (!isOwner) {
			return res.status(403).json({ message: "Unauthorized to archive this product" });
		}

		product.status = "REMOVED";
		product.isArchived = true;

		await product.save();

		res.status(200).json({ message: "Product archived successfully", product });
	} catch (error) {
		console.error("Error archiving product:", error);
		res.status(500).json({ message: "Failed to archive product" });
	}
};


export const getDraftProducts = async (req, res) => {
	try {
		const userId = req.user?.userId;
		const isCharity = req.user?.role === "CHARITY";

		const query = isCharity
			? { charity: userId, status: "DRAFT", isArchived: false }
			: { seller: userId, status: "DRAFT", isArchived: false };

		const products = await Product.find(query);

		res.status(200).json({ products });
	} catch (error) {
		console.error("Error fetching draft products:", error);
		res.status(500).json({ message: "Failed to fetch draft products" });
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


// Get role-based product listings (USER or CHARITY)
export const getRoleBasedListings = async (req, res) => {
	const { userId, role } = req.user;
	const { status, isArchived } = req.query;

	try {
		const query = {
			isArchived: isArchived === "true" ? true : false,
		};

		if (role === "USER") {
			query.seller = userId;
		} else if (role === "CHARITY") {
			query.$or = [{ charity: userId }, { seller: userId }];
		} else {
			return res.status(403).json({ message: "Access denied. Invalid role." });
		}

		if (status) {
			query.status = status; // Filter by status if provided
		}

		const products = await Product.find(query)
			.populate("seller", "firstName lastName profileImage addresses")
			.populate("charity", "charityName profileImage addresses")
			.sort({ createdAt: -1 });

		const productsWithAddress = products.map(product => ({
			...product.toObject(),
			id: product._id,
			name: product.name,
			additionalInfo: product.additionalInfo,
			price: product.price,
			charityProfit: product.charityProfit,
			description: product.additionalInfo,
			selectedCharityName: product.selectedCharityName,
            selectedCharityId: product.selectedCharityId, 
			images: product.images,
			category: product.category,
			subcategory: product.subcategory,
			condition: product.condition,
			brand: product.brand,
			material: product.material,
			color: product.color,
			size: product.size,
			status: product.status,
			dimensions: {
				height: product.dimensions?.height || null,
				width: product.dimensions?.width || null,
				depth: product.dimensions?.depth || null,
			},
			createdAt: product.createdAt,
			seller: {
				firstName: product.seller?.firstName,
				lastName: product.seller?.lastName,
				profileImage: product.seller?.profileImage,
				address: product.seller?.addresses?.[0], // Include default address
			},
			charity: {
				charityName: product.charity?.charityName,
				charityID: product.charity?.charityID,
				profileImage: product.charity?.profileImage,
				address: product.charity?.addresses?.[0],
			},
		}));

		return res.status(200).json({ products: productsWithAddress });
	} catch (error) {
		console.error("Error fetching listings:", error);
		res.status(500).json({ message: "Failed to fetch listings." });
	}
};

