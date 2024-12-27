import axios from "axios";
import { Buffer } from "buffer";
import Order from "../../models/Order.model";
import Cart from "../../models/Cart.model";
// import { shipStationClient } from "../../utils/shipstation";

// Create a new order
export const createOrder = async (req, res) => {
 const {
		buyerId,
		products,
		shippingAddress,
		paymentMethod,
		// carrierCode,
		// serviceCode
 } = req.body;

 
	try {
		if (
			!buyerId ||
			!products ||
			products.length === 0 || 
			!shippingAddress ||
			!paymentMethod  
		
		) {
			return res.status(400).json({ error: "Invalid order details" });
		}

		const enrichedProducts = products.map((product) => {
			if (
				!product.productId ||
				!product.charity ||
				!product.name ||
				!product.price ||
				!product.quantity
			) {
				throw new Error(
					`Missing required product data: ${JSON.stringify(product)}`,
				);
			}

			const totalCost = product.price * product.quantity;
			const charityProfit = totalCost * 0.9;
			const adminFee = totalCost * 0.1;

			return {
				...product,
				seller: product.seller || null, // Allow null for optional seller
				totalProductCost: totalCost,
				charityProfit,
				adminFee,
			};
		});

		const totalAmount = enrichedProducts.reduce(
			(sum, product) => sum + product.totalProductCost,
			0,
		);

		// Create a new order in the database
		const newOrder = new Order({
			buyerId,
			products: enrichedProducts,
			totalAmount,
			shippingAddress,
			paymentMethod,
			// carrierCode,
			// serviceCode,
			paymentStatus: "Pending",
			paymentConfirmed: false,
			status: "OrderConfirmed",
		});

		await newOrder.save();
		// Clear the cart for the user after successful order creation
		await Cart.findOneAndUpdate({ userId: buyerId }, { items: [] });

		// // Generate label for the created order
		// const authToken = Buffer.from(
		// 	`${process.env.SHIPSTATION_API_KEY}:${process.env.SHIPSTATION_API_SECRET}`
		// ).toString("base64");

		// const labelPayload = {
		// 	orderId: newOrder._id, // Replace with actual ShipStation order ID if needed
		// 	carrierCode,
		// 	serviceCode,
		// 	shipDate: new Date().toISOString().split("T")[0],
		// 	weight: {
		// 		value: 2, // Replace with actual weight
		// 		units: "pounds",
		// 	},
		// 	testLabel: false,
		// };

		// const labelResponse = await axios.post(
		// 	"https://ssapi.shipstation.com/orders/createlabelfororder",
		// 	labelPayload,
		// 	{
		// 		headers: {
		// 			Authorization: `Basic ${authToken}`,
		// 			"Content-Type": "application/json",
		// 		},
		// 	}
		// );

		// const { trackingNumber, labelUrl } = labelResponse.data;

		// // Update the order with the tracking number and label URL
		// newOrder.trackingNumber = trackingNumber;
		// newOrder.labelUrl = labelUrl;
		// newOrder.status = "OrderConfirmed";

		// await newOrder.save();

		res.status(201).json({
			success: true,
			message: "Order created and shipping label generated successfully",
			order: newOrder,
			// trackingNumber,
			// labelUrl,
		});
	} catch (error) {
		console.error("Error creating order:", error);
		res.status(500).json({ error: error.message || "Failed to create order" });
	}
};

// Get carriers from ShipStation
// export const getCarriers = async (_req, res) => {
// 	try {
// 		const authToken = Buffer.from(
// 			`${process.env.SHIPSTATION_API_KEY}:${process.env.SHIPSTATION_API_SECRET}`
// 		).toString("base64");
// 		const response = await axios.get("https://ssapi.shipstation.com/carriers", {
// 			headers: {
// 				Authorization: `Basic ${authToken}`,
// 			},
// 		});

// 		// Return carriers to the frontend
// 		res.status(200).json({ success: true, carriers: response.data });
// 	} catch (error) {
// 		console.error("Error fetching carriers from ShipStation:", error.response?.data || error.message);
// 		res.status(500).json({ error: "Failed to fetch carrier list" });
// 	}
// };


// export const getServices = async (req, res) => {
// 	const { carrierCode } = req.params;

// 	try {
// 		const authToken = Buffer.from(
// 			`${process.env.SHIPSTATION_API_KEY}:${process.env.SHIPSTATION_API_SECRET}`
// 		).toString("base64");

// 		const response = await axios.get(
// 			`https://ssapi.shipstation.com/carriers/listservices?carrierCode=${carrierCode}`,
// 			{
// 				headers: {
// 					Authorization: `Basic ${authToken}`,
// 				},
// 			}
// 		);

// 		res.status(200).json({ success: true, services: response.data });
// 	} catch (error) {
// 		console.error("Error fetching services:", error.response?.data || error.message);
// 		res.status(500).json({ error: "Failed to fetch service list" });
// 	}
// };


// export const getPackages = async (req, res) => {
// 	const { carrierCode } = req.params;

// 	try {
// 		const authToken = Buffer.from(
// 			`${process.env.SHIPSTATION_API_KEY}:${process.env.SHIPSTATION_API_SECRET}`
// 		).toString("base64");

// 		const response = await axios.get(
// 			`https://ssapi.shipstation.com/carriers/listpackages?carrierCode=${carrierCode}`,
// 			{
// 				headers: {
// 					Authorization: `Basic ${authToken}`,
// 				},
// 			}
// 		);

// 		res.status(200).json({ success: true, packages: response.data });
// 	} catch (error) {
// 		console.error("Error fetching packages:", error.response?.data || error.message);
// 		res.status(500).json({ error: "Failed to fetch package list" });
// 	}
// };



// Get orders for a user
export const getOrdersByUser = async (req, res) => {
	const { userId } = req.params;

	try {
		const orders = await Order.find({ buyerId: userId })
			.populate("products.productId", "name price")
			.populate("products.seller", "firstName lastName")
			.populate("products.charity", "charityName");

		res.status(200).json({ success: true, orders });
	} catch (error) {
		console.error("Error fetching orders:", error);
		res.status(500).json({ error: "Failed to fetch orders" });
	}
};

 
export const getSoldItems = async (req, res) => {
	const { sellerId } = req.params;

	try {
		// Find all orders containing products sold by the given seller
		const orders = await Order.find({
			"products.seller": sellerId,
		})
			.populate("products.productId", "name price images brand")
			.populate("products.charity", "charityName profileImage _id storefrontId")
			.populate("buyerId", "firstName lastName email profileImage");

		// Transform data to include additional details
		const soldItems = orders.flatMap(order =>
			order.products
				.filter(product => product.seller?.toString() === sellerId)
				.map(product => ({
					orderId: order._id,
					status: order.status,
					orderStatus: order.orderStatus,
					buyerId: order.buyerId?._id || null,
					buyerName: `${order.buyerId?.firstName || "Unknown"} ${
						order.buyerId?.lastName || ""
					}`.trim(),
					buyerEmail: order.buyerId?.email || null,
					buyerProfileImage: order.buyerId?.profileImage || null,
					productId: product.productId?._id || null,
					productName: product.productId?.name || "Unknown Product",
					charityProfit: order.products[0]?.charityProfit || "Unknown Profit",
					adminFee: order.products[0]?.adminFee || "Unknown admin fees",
					productBrand: product.productId?.brand || "Unknown Product",
					productPrice: product.productId?.price || 0,
					productImages: product.productId?.images || [],
					quantity: product.quantity,
					totalProductCost: product.totalProductCost,
					charityId: product.charity?._id || null,
					charityName: product.charity?.charityName || "Unknown Charity",
					charityProfileImage: product.charity?.profileImage || null,
					storefrontId: product.charity?.storefrontId || null,
					orderDate: order.createdAt,
				})),
		);

		res.status(200).json({
			success: true,
			totalSoldItems: soldItems.length,
			soldItems,
		});
	} catch (error) {
		console.error("Error fetching sold items:", error);
		res.status(500).json({ error: "Failed to fetch sold items" });
	}
};

export const getPurchaseItems = async (req, res) => {
	const { buyerId } = req.params; // Get buyerId from request params

	try {
		// Find all orders for the given buyerId
		const orders = await Order.find({ buyerId })
			.populate("products.productId", "name price images brand")
			.populate("products.seller", "firstName lastName email profileImage")
			.populate("products.charity", "charityName profileImage _id storefrontId");

		if (!orders || orders.length === 0) {
			return res.status(404).json({ success: false, message: "No purchases found" });
		}

		// Transform data to include additional details
		const purchaseItems = orders.flatMap(order =>
			order.products.map(product => ({
				orderId: order._id,
				buyerId: order.buyerId,
				buyerName: `${order.shippingAddress?.name || "Unknown Buyer"}`,
				productId: product.productId?._id || null,
				productName: product.productId?.name || product.name || "Unknown Product",
				productBrand: product.productId?.brand || product.brand || "Unknown Brand",
				productPrice: product.productId?.price || product.price || 0,
				charityProfit: product.charityProfit || 0,
				adminFee: product.adminFee || 0,
				productImages: product.productId?.images || [],
				sellerId: product.seller?._id || null,
				sellerName: `${product.seller?.firstName || "Unknown"} ${product.seller?.lastName || ""
					}`.trim(),
				sellerEmail: product.seller?.email || null,
				sellerProfileImage: product.seller?.profileImage || null,
				charityId: product.charity?._id || null,
				charityName: product.charity?.charityName || "Unknown Charity",
				charityProfileImage: product.charity?.profileImage || null,
				quantity: product.quantity,
				totalProductCost: product.totalProductCost || 0,
				shippingAddress: {
					name: order.shippingAddress?.name || "",
					address: order.shippingAddress?.address || "",
					city: order.shippingAddress?.city || "",
					country: order.shippingAddress?.country || "",
					postcode: order.shippingAddress?.postcode || "",
				},
				paymentMethod: order.paymentMethod || null,
				orderStatus: order.orderStatus || "Unknown",
				status: order.status || "Unknown",
				createdAt: order.createdAt,
				updatedAt: order.updatedAt,
			}))
		);

		res.status(200).json({
			success: true,
			totalPurchaseItems: purchaseItems.length,
			purchaseItems,
		});
	} catch (error) {
		console.error("Error fetching purchase items:", error);
		res.status(500).json({ error: "Failed to fetch purchase items" });
	}
};




// Get total sold items and revenue
export const getTotalSoldItems = async (_req, res) => {
	const { sellerId } = req.params;

	try {
		// Find all orders containing products sold by the given seller
		const orders = await Order.find({
			"products.seller": sellerId,
		})
			.populate("products.productId", "name price")
			.populate("products.seller", "firstName lastName email")
			.populate("products.charity", "charityName");

		// Aggregate total sold items and details
		const totalDetails = orders.reduce(
			(acc, order) => {
				order.products.forEach(product => {
					// Increment total quantity and revenue
					acc.totalQuantity += product.quantity;
					acc.totalRevenue += product.totalProductCost;

					// Add each product to the items list with details
					acc.items.push({
						orderId: order._id,
						buyerId: order.buyerId,
						productId: product.productId?._id || null,
						productName: product.productId?.name || "Unknown Product",
						productBrand: product.productId?.brand || "Unknown Brand",
						sellerId: product.seller?._id || null,
						sellerName: `${product.seller?.firstName || "Unknown"} ${
							product.seller?.lastName || ""
						}`.trim(),
						quantity: product.quantity,
						itemPrice: product.productId?.price || 0,
						totalProductCost: product.totalProductCost,
						charityId: product.charity?._id || null,
						charityName: product.charity?.charityName || "Unknown Charity",
						orderDate: order.createdAt,
					});
				});

				return acc;
			},
			{
				totalQuantity: 0, // Total items sold
				totalRevenue: 0, // Total revenue generated
				items: [], // List of sold products
			},
		);

		res.status(200).json({
			success: true,
			totalQuantity: totalDetails.totalQuantity,
			totalRevenue: totalDetails.totalRevenue,
			items: totalDetails.items,
		});
	} catch (error) {
		console.error("Error fetching total sold items:", error);
		res.status(500).json({ error: "Failed to fetch total sold items" });
	}
};

// Get purchases for a buyer
export const getBuyerPurchases = async (req, res) => {
	const { userId } = req.params;

	try {
		// Fetch orders placed by the buyer
		const orders = await Order.find({ buyerId: userId })
			.populate("products.productId", "name price images")
			.populate("products.seller", "firstName lastName email profileImage")
			.populate("products.charity", "charityName profileImage id storefrontId");

		// Aggregate purchase information
		const purchaseDetails = orders.reduce(
			(acc, order) => {
				const orderItems = order.products.map(product => ({
					status: order.status,
					orderId: order._id,
					productId: product.productId._id,
					productName: product.productId.name,
					quantity: product.quantity,
					itemPrice: product.productId.price,
					totalProductCost: product.totalProductCost,
					sellerId: product.seller._id,
					sellerName: `${product.seller?.firstName} ${product.seller?.lastName}`,
					charityId: product.charity?._id,
					charityName: product.charity?.charityName,
					orderDate: order.createdAt,
				}));

				acc.items.push(...orderItems);
				acc.totalItems += order.products.length;
				acc.totalSpent += order.products.reduce(
					(sum, product) => sum + product.totalProductCost,
					0,
				);
				return acc;
			},
			{ totalItems: 0, totalSpent: 0, items: [] },
		);

		res.status(200).json({
			success: true,
			totalItems: purchaseDetails.totalItems,
			totalSpent: purchaseDetails.totalSpent,
			items: purchaseDetails.items,
		});
	} catch (error) {
		console.error("Error fetching buyer purchases:", error);
		res.status(500).json({ error: "Failed to fetch purchase details" });
	}
};



export const getAllOrdersForSeller = async (req, res) => {
	const { userId } = req.params;
	try {
		// Log the authenticated user and requested seller ID
		console.log("Authenticated user ID:", req.user.id);
		console.log("Requested user ID:", userId);
		
		// Fetch orders where the seller is involved
		const orders = await Order.find({ sellerId: userId })
			.populate("products.productId", "name price images")
			.populate("products.charity", "charityName")
			.populate("buyerId", "firstName lastName email");

		if (!orders || orders.length === 0) {
			return res.status(404).json({ error: "No orders found for this seller" });
		}

		// Format the data
		const formattedOrders = orders.map(order => ({
			orderId: order._id,
			buyerId: order.buyerId._id,
			buyerName: `${order.buyerId.firstName} ${order.buyerId.lastName}`,
			buyerEmail: order.buyerId.email,
			products: order.products.map(product => ({
				productId: product.productId?._id || null,
				productName: product.productId?.name || "Unknown Product",
				productImage: product.productId?.images?.[0]?.url || null,
				quantity: product.quantity,
				itemPrice: product.productId?.price || 0,
				totalProductCost: product.totalProductCost,
				charityName: product.charity?.charityName || "Unknown Charity",
			})),
			totalAmount: order.totalAmount,
			shippingAddress: order.shippingAddress,
			status: order.status,
			createdAt: order.createdAt,
		}));

		res.status(200).json({ success: true, orders: formattedOrders });
	} catch (error) {
		console.error("Error fetching orders for seller:", error);
		res.status(500).json({ error: "Failed to fetch orders for seller" });
	}
};

// Update Order Status to ItemShipped
export const updateOrderStatusToShipped = async (req, res) => {
	const { orderId } = req.params;
	const { trackingNumber, carrierCode, labelId, serviceCode, orderStatus } = req.body;

	try {
		// Validate the input
		if (!trackingNumber) {
			return res.status(400).json({ error: "Tracking number is required" });
		}

		// Find and update the order
		const order = await Order.findById(orderId);

		if (!order) {
			return res.status(404).json({ error: "Order not found" });
		}

		// Update the order details
		order.trackingNumber = trackingNumber;
		order.carrierCode = carrierCode;
		order.labelId = labelId;
		order.serviceCode = serviceCode;
		order.status = orderStatus;
		order.orderStatus = "ItemShipped";

		await order.save();

		res.status(200).json({
			success: true,
			message: "Order status updated to ItemShipped",
			order,
		});
	} catch (error) {
		console.error("Error updating order status:", error);
		res.status(500).json({ error: "Failed to update order status" });
	}
};

export const updateOrderStatusToDelivered = async (req, res) => {
	const { orderId } = req.params;

	try {
		const order = await Order.findById(orderId);

		if (!order) {
			return res.status(404).json({ error: "Order not found" });
		}

		// Ensure the current status allows delivery confirmation
		if (order.status !== "ItemShipped" && order.status !== "InTransit") {
			return res
				.status(400)
				.json({ error: "Order is not eligible for delivery confirmation" });
		}

		// Update the status to Delivered
		order.status = "Delivered";

		await order.save();

		res.status(200).json({
			success: true,
			message: "Order status updated to Delivered",
			order,
		});
	} catch (error) {
		console.error("Error updating order status:", error);
		res.status(500).json({ error: "Failed to update order status" });
	}
}; 



export const getOrderById = async (req, res) => {
	const { orderId } = req.params;

	try {
		const order = await Order.findById(orderId)
			.populate("products.productId", "name price images brand")
			.populate("products.seller", "firstName lastName profileImage")
			.populate("products.charity", "charityName profileImage");

		if (!order) {
			return res.status(404).json({ error: "Order not found" });
		}

		res.status(200).json({ success: true, order });
	} catch (error) {
		console.error("Error fetching order:", error);
		res.status(500).json({ error: "Failed to fetch order" });
	}
};

// Get total sold products and sales revenue (Admin View)
export const getTotalSalesStats = async (_req, res) => {
	try {
		// Find all completed orders
		const orders = await Order.find({ status: { $in: ["Delivered", "OrderConfirmed"] } });

		// Aggregate statistics
		const stats = orders.reduce(
			(acc, order) => {
				order.products.forEach(product => {
					// Increment total sold quantity and revenue
					acc.totalProductsSold += product.quantity;
					acc.totalRevenue += product.totalProductCost;

					// Collect product details for a breakdown
					acc.productDetails.push({
						productId: product.productId?._id || null,
						productName: product.productId?.name || "Unknown Product",
						quantitySold: product.quantity,
						totalRevenueGenerated: product.totalProductCost,
						sellerId: product.seller?._id || null,
						sellerName: product.seller
							? `${product.seller.firstName} ${product.seller.lastName}`
							: "Unknown Seller",
						charityId: product.charity?._id || null,
						charityName: product.charity?.charityName || "Unknown Charity",
						status: order.status,
						createdAt: order.createdAt,
					});
				});
				return acc;
			},
			{
				totalProductsSold: 0, // Total products sold
				totalRevenue: 0, // Total revenue generated
				productDetails: [], // Breakdown of product sales
			},
		);

		res.status(200).json({
			success: true,
			totalProductsSold: stats.totalProductsSold,
			totalRevenue: stats.totalRevenue,
			productDetails: stats.productDetails,
		});
	} catch (error) {
		console.error("Error fetching sales stats:", error);
		res.status(500).json({ error: "Failed to fetch sales statistics" });
	}
};