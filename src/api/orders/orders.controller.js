import axios from "axios";
import { Buffer } from "buffer";
import Order from "../../models/Order.model";
import Product from "../../models/Product.model";
import Cart from "../../models/Cart.model";
// import { shipStationClient } from "../../utils/shipstation";
// import { startOfWeek, subWeeks, startOfMonth, subMonths, startOfYear, subYears } from "date-fns";
import { startOfWeek, subWeeks, startOfMonth, subMonths, subYears, startOfYear, endOfWeek, endOfMonth, endOfYear } from 'date-fns';
import {
	buildPeriodRanges,
	buildOrderStatusSummary,
	buildWeeklyChart,
	buildMonthlyChart,
	buildYearlyChart,
	emptyPurchaseResponse,
	calculatePercentageChange,
} from '../../services/dashboard.service';
import {
	CHARITY_SHARE_RATE,
	PLATFORM_FEE_RATE,
} from "../../constants/platformPolicy.js";
import { calculateProfitSplit } from "../../utils/profitSplit.js";
import { assertUkShipping, currencyForCountry } from "../../utils/ukValidation.js";
import { sanitizePaymentMethodInput } from "../../utils/sanitizePayment.js";

const sanitizeShippingAddress = (address = {}) => ({
	name: address.name,
	address: address.address,
	city: address.city,
	state: address.state,
	country: address.country,
	postcode: address.postcode || address.postCode,
	email: address.email,
});

import Stripe from 'stripe';
import User from "../../models/User.model";
import { sendOrderShippedEmail } from "../../utils/email";
import {
	fireMarketingEvent,
	JOURNEY_EVENTS,
} from "../../services/marketingJourneys.service.js";
import {
	applyFailedPayment,
	applySuccessfulPayment,
} from "../../services/orderPayment.service.js";
import {
	notifySellersOrderShipped,
	notifyBuyerOrderDelivered,
} from "../../utils/notifyUser.js";
import {
	generateGuestOrderToken,
	hashGuestOrderToken,
	verifyGuestOrderToken,
	extractGuestToken,
	assertGuestMayUpdateFields,
} from "../../utils/guestOrderToken.js";
import { isAdminRole } from "../../constants/adminRoles.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2020-08-27' });

async function verifyStripePaymentForOrder(order, paymentIntentId) {
	if (!paymentIntentId) {
		throw new Error("paymentIntentId is required to confirm payment.");
	}

	const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

	if (paymentIntent.status !== "succeeded") {
		throw new Error("Payment has not succeeded.");
	}

	const metadataOrderId = paymentIntent.metadata?.orderId;
	if (metadataOrderId && metadataOrderId !== order._id.toString()) {
		throw new Error("Payment intent does not match this order.");
	}

	const expectedAmount = Math.round(order.grandTotal * 100);
	if (paymentIntent.amount !== expectedAmount) {
		throw new Error("Payment amount does not match order total.");
	}

	if (
		order.stripePaymentIntentId &&
		order.stripePaymentIntentId !== paymentIntent.id
	) {
		throw new Error("Order is linked to a different payment intent.");
	}

	return paymentIntent;
}


export const createOrder = async (req, res) => {
	function generateNumericId() {
		return Math.floor(Math.random() * 1000000000); // Generates a 9-digit numeric ID
	}

	const {
		buyerId,
		guestEmail,
		guestName,
		products,
		shippingAddress,
		paymentMethod,
		carrierCode,
		serviceCode,
		shipmentCost,
		// combinedDimensions,
		// totalWeight,
		paymentConfirmedAt,
		packageCode = "package",
		adminAccountId = process.env.STRIPE_ADMIN_ACCOUNT_ID,
	} = req.body;

	const isGuestOrder = !buyerId;
	const resolvedShipmentCost = Number(shipmentCost) || 0;

	try {
		if (
			!products ||
			products.length === 0 ||
			!shippingAddress ||
			!adminAccountId ||
			!paymentMethod
		) {
			return res.status(400).json({ error: "Invalid order details" });
		}

		if (isGuestOrder) {
			if (!guestEmail?.trim() || !guestName?.trim()) {
				return res.status(400).json({ error: "Guest email and name are required." });
			}
		} else if (!buyerId) {
			return res.status(400).json({ error: "Invalid order details" });
		}

		if (!assertUkShipping(shippingAddress, res)) {
			return;
		}

		const enrichedProducts = [];
		for (const product of products) {
			if (!product.productId) {
				return res.status(400).json({ error: "Invalid product in order." });
			}

			const listing = await Product.findById(product.productId).select(
				"seller charity weight dimensions sellerSharePercent fulfillmentType sellAreas",
			);
			if (!listing) {
				return res.status(400).json({
					error: `Product not found: ${product.productId}`,
				});
			}

			if (!isGuestOrder) {
				const sellerId = listing.seller?.toString();
				const charitySellerId = listing.charity?.toString();
				if (sellerId === buyerId || charitySellerId === buyerId) {
					return res
						.status(400)
						.json({ error: "You cannot purchase your own listing." });
				}
			}

			const charityId = product.charity || listing.charity;
			if (!charityId) {
				return res.status(400).json({
					error: "Product is missing charity association.",
				});
			}

			const productWeight = product.weight ?? listing.weight;
			const productDimensions = product.dimensions ?? listing.dimensions;
			const totalCost = product.price * product.quantity;
			const split = calculateProfitSplit(
				totalCost,
				listing.sellerSharePercent ?? 0,
			);
			const charityProfit = split.charityProfit;
			const adminFee = split.platformFee;
			const sellerProfit = split.sellerProfit;
			const totalWeight = parseFloat(productWeight || 0) * product.quantity;

			enrichedProducts.push({
				...product,
				seller: product.seller || listing.seller || null,
				charity: charityId,
				weight: productWeight,
				totalProductCost: totalCost,
				charityProfit,
				sellerProfit,
				adminFee,
				totalWeight,
				dimensions: {
					length: parseFloat(productDimensions?.depth || 0),
					width: parseFloat(productDimensions?.width || 0),
					height:
						parseFloat(productDimensions?.height || 0) * product.quantity,
				},
			});
		}
		// Calculate the total weight for all products
		const totalWeight = enrichedProducts.reduce((sum, product) => sum + product.totalWeight, 0);
		const combinedDimensions = enrichedProducts.reduce(
			(acc, product) => {
				acc.length = Math.max(acc.length, product.dimensions.length);
				acc.width = Math.max(acc.width, product.dimensions.width);
				acc.height += product.dimensions.height; 
				return acc;
			},
			{ length: 0, width: 0, height: 0 }
		);
		const totalAmount = enrichedProducts.reduce((sum, product) => sum + product.totalProductCost, 0);
		const grandTotal = totalAmount + resolvedShipmentCost;
		// Generate numeric ShipStation order ID
		const numericShipStationOrderId = generateNumericId();

		const normalizedPaymentMethod = (() => {
			const sanitized = sanitizePaymentMethodInput(paymentMethod || {});
			const holder =
				sanitized.nameAccountHolder ||
				(isGuestOrder ? guestName.trim() : "Cardholder");
			return {
				nameAccountHolder: holder,
				stripePaymentMethodId: sanitized.stripePaymentMethodId || "",
				useShippingAsBilling: sanitized.useShippingAsBilling ?? true,
				billingAddress: sanitized.billingAddress || {
					name: isGuestOrder ? guestName.trim() : holder,
					address: shippingAddress.address,
					city: shippingAddress.city,
					country: shippingAddress.country,
					postCode: shippingAddress.postcode || shippingAddress.postCode,
				},
			};
		})();

		const newOrder = new Order({
			buyerId: isGuestOrder ? undefined : buyerId,
			guestEmail: isGuestOrder ? guestEmail.trim() : undefined,
			guestName: isGuestOrder ? guestName.trim() : undefined,
			isGuestOrder,
			products: enrichedProducts,
			totalAmount,
			shipmentCost: resolvedShipmentCost,
			grandTotal,
			combinedDimensions,
			totalWeight,
			dimensions: {
				units: 'inches',
				length: combinedDimensions.length,
				width: combinedDimensions.width,
				height: combinedDimensions.height,
			},
			packageCode,
			shippingAddress: sanitizeShippingAddress(shippingAddress),
			paymentMethod: normalizedPaymentMethod,
			carrierCode: carrierCode || null,
			serviceCode: serviceCode || null,
			paymentStatus: "Pending",
			paymentConfirmed: false,
			paymentConfirmedAt,
			shipStationOrderId: numericShipStationOrderId,
			status: "OrderPlaced",
		});

		await newOrder.save();

		let guestAccessToken;
		if (isGuestOrder) {
			guestAccessToken = generateGuestOrderToken();
			newOrder.guestAccessTokenHash = hashGuestOrderToken(guestAccessToken);
			await newOrder.save();
		}

		// Create a PaymentIntent
		const paymentIntent = await stripe.paymentIntents.create({
			amount: Math.round(grandTotal * 100), // Stripe expects amount in cents
			currency: currencyForCountry(shippingAddress?.country),
			payment_method_types: ["card"],
			metadata: { orderId: newOrder._id.toString(), },

		});

		newOrder.stripePaymentIntentId = paymentIntent.id;
		await newOrder.save();


		if (!isGuestOrder && buyerId) {
			await Cart.findOneAndUpdate({ userId: buyerId }, { items: [] });
		}

		const baseResponse = {
			success: true,
			message: "Order created successfully",
			order: newOrder,
			clientSecret: paymentIntent.client_secret,
			...(guestAccessToken ? { guestAccessToken } : {}),
		};

		const canSyncShipStation =
			carrierCode &&
			serviceCode &&
			process.env.SHIPSTATION_API_KEY &&
			process.env.SHIPSTATION_API_SECRET;

		if (!canSyncShipStation) {
			return res.status(201).json({
				...baseResponse,
				message: carrierCode
					? baseResponse.message
					: "Order created — shipping carrier can be selected later.",
			});
		}

		// ShipStation integration (when carrier selected)
		const authToken = Buffer.from(
			`${process.env.SHIPSTATION_API_KEY}:${process.env.SHIPSTATION_API_SECRET}`
		).toString("base64");

		const shipStationOrderPayload = {
			orderNumber: numericShipStationOrderId.toString(),
			orderKey: newOrder._id.toString(),
			orderDate: new Date(newOrder.createdAt).toISOString(),
			orderStatus: "awaiting_shipment",
			customerEmail: shippingAddress.email || guestEmail || "customer@example.com",
			billTo: {
				name: shippingAddress.name,
				street1: shippingAddress.address,
				city: shippingAddress.city,
				state: shippingAddress.state || "N/A",
				postalCode: shippingAddress.postcode,
				country: shippingAddress.country,
				email: shippingAddress.email || guestEmail || "customer@example.com",
			},
			shipTo: {
				name: shippingAddress.name,
				street1: shippingAddress.address,
				city: shippingAddress.city,
				state: shippingAddress.state || "N/A",
				postalCode: shippingAddress.postcode,
				country: shippingAddress.country,
			},
			items: products.map(product => ({
				name: product.name,
				quantity: product.quantity,
				unitPrice: product.price,
				total: product.totalProductCost,
			})),
			amountPaid: totalAmount + resolvedShipmentCost,
			shippingAmount: resolvedShipmentCost,
			taxAmount: 0,
			packageCode: "package",
			weight: { value: totalWeight, units: 'ounces' },
			dimensions: {
				units: 'inches',
				length: combinedDimensions.length,
				width: combinedDimensions.width,
				height: combinedDimensions.height,
			},
			carrierCode,
			serviceCode,
		};

		try {
			const orderResponse = await axios.post(
				"https://ssapi.shipstation.com/orders/createorder",
				shipStationOrderPayload,
				{
					headers: {
						Authorization: `Basic ${authToken}`,
						"Content-Type": "application/json",
					},
				}
			);

			const shipStationOrderId = orderResponse.data.orderId;
			newOrder.shipStationOrderId = shipStationOrderId;
			newOrder.status = "OrderConfirmed";

			await newOrder.save();

			res.status(201).json({
				...baseResponse,
				message: "Order created successfully and synced with ShipStation",
			});
		} catch (orderError) {
			console.error("Error creating order in ShipStation:", orderError.response?.data || orderError.message);
			newOrder.status = "ShipStationOrderFailed";
			newOrder.tags.push(`ShipStationOrderFailed: ${JSON.stringify(orderError.response?.data || orderError.message)}`);
			await newOrder.save();

			res.status(201).json({
				...baseResponse,
				message: "Order created locally, but failed to sync with ShipStation",
			});
		}
	} catch (error) {
		console.error("Error creating order:", error);
		res.status(500).json({ error: error.message || "Failed to create order" });
	}
};

export const createGuestOrder = async (req, res) => {
	req.body.buyerId = undefined;
	return createOrder(req, res);
};

export const getGuestOrderConfirmation = async (req, res) => {
	try {
		const { orderId } = req.params;
		const { email, guestToken } = req.query;

		if (!email?.trim()) {
			return res.status(400).json({ error: "Email is required to view this order." });
		}
		if (!guestToken) {
			return res.status(403).json({
				error: "Guest order token is required. Use the link from checkout.",
			});
		}

		const order = await Order.findById(orderId)
			.select("+guestAccessTokenHash")
			.populate("products.productId", "name price images brand")
			.populate("products.seller", "firstName lastName profileImage")
			.populate("products.charity", "charityName profileImage");

		if (!order) {
			return res.status(404).json({ error: "Order not found" });
		}
		if (!order.isGuestOrder) {
			return res.status(403).json({ error: "Sign in to view this order." });
		}
		if (!verifyGuestOrderToken(guestToken, order.guestAccessTokenHash)) {
			return res.status(403).json({ error: "Invalid guest order token." });
		}
		if (
			order.guestEmail?.trim().toLowerCase() !==
			String(email).trim().toLowerCase()
		) {
			return res.status(403).json({ error: "Email does not match this order." });
		}

		const safeOrder = order.toObject();
		delete safeOrder.guestAccessTokenHash;

		res.status(200).json({ success: true, order: safeOrder });
	} catch (error) {
		console.error("getGuestOrderConfirmation:", error);
		res.status(500).json({ error: "Failed to fetch order." });
	}
};

export const getRates = async (req, res) => {
	const {
		carrierCode,
		serviceCode,
		fromPostalCode,
		fromCity,
		fromState,
		toPostalCode,
		toCountry,
		products,
	} = req.body;

	// Validate required fields
	if (!carrierCode || !fromPostalCode || !toPostalCode || !toCountry || !products || products.length === 0) {
		console.error("Missing required fields:", {
			carrierCode,
			serviceCode,
			fromPostalCode,
			toPostalCode,
			toCountry,
			products,
		});
		return res.status(400).json({ error: "Missing required fields for rate calculation." });
	}

	try {
		// Enrich products to calculate total weight and dimensions
		const enrichedProducts = products.map((product) => {
			const totalWeight = parseFloat(product.weight || 0) * product.quantity; // Total weight for the product
			const dimensions = {
				length: parseFloat(product.dimensions?.depth || 0), // Use `depth` as `length`
				width: parseFloat(product.dimensions?.width || 0),
				height: parseFloat(product.dimensions?.height || 0) * product.quantity, // Stack height
			};

			return {
				...product,
				totalWeight,
				dimensions,
			};
		});

		// Aggregate total weight and combined dimensions
		const totalWeight = enrichedProducts.reduce((sum, product) => sum + product.totalWeight, 0);
		const combinedDimensions = enrichedProducts.reduce(
			(acc, product) => {
				acc.length = Math.max(acc.length, product.dimensions.length); // Use the largest `length`
				acc.width = Math.max(acc.width, product.dimensions.width);   // Use the largest `width`
				acc.height += product.dimensions.height;                    // Sum the `height` (stacking)
				return acc;
			},
			{ length: 0, width: 0, height: 0 } // Initial dimensions
		);

		// Validate calculated dimensions
		if (!totalWeight || !combinedDimensions.length || !combinedDimensions.width || !combinedDimensions.height) {
			console.error("Invalid totalWeight or dimensions:", {
				totalWeight,
				combinedDimensions,
			});
			return res.status(400).json({ error: "Invalid total weight or dimensions." });
		}

		const payload = {
			carrierCode,
			serviceCode: serviceCode || null,
			fromPostalCode,
			fromCity: fromCity || null,
			fromState: fromState || null,
			toPostalCode,
			toCountry,
			weight: { value: totalWeight, units: 'ounces' },
			dimensions: {
				units: 'inches',
				length: combinedDimensions.length,
				width: combinedDimensions.width,
				height: combinedDimensions.height,
			},
			residential: true, // Assume residential address by default
		};

		const authToken = Buffer.from(
			`${process.env.SHIPSTATION_API_KEY}:${process.env.SHIPSTATION_API_SECRET}`
		).toString("base64");

		const response = await axios.post(
			"https://ssapi.shipstation.com/shipments/getrates",
			payload,
			{
				headers: {
					Authorization: `Basic ${authToken}`,
					"Content-Type": "application/json",
				},
			}
		);

		const rates = response.data;

		if (!rates.length) {
			return res.status(404).json({ error: "No shipping rates found for the given details." });
		}

		// Return the rates to the frontend
		res.status(200).json({
			success: true,
			rates,
		});
	} catch (error) {
		console.error("Error fetching shipping rates:", error.response?.data || error.message);
		res.status(500).json({
			success: false,
			message: "Failed to fetch shipping rates.",
			error: error.response?.data || error.message,
		});
	}
};


export const createLabelForOrder = async (req, res) => {
	const { orderId } = req.params;
	const requesterId = req.user?.userId;
	const requesterRole = req.user?.role;

	try {
		const order = await Order.findById(orderId);

		if (!order) {
			return res.status(404).json({ error: "Order not found" });
		}

		const isSeller = order.products?.some(
			p =>
				p.seller?.toString?.() === requesterId ||
				p.charity?.toString?.() === requesterId,
		);
		if (!requesterId || (!isSeller && !isAdminRole(requesterRole))) {
			return res.status(403).json({
				error: "Only the seller or an admin can create shipping labels.",
			});
		}

		// Check if a label has already been created for this order
		if (order.status === "LabelCreated") {
			return res.status(400).json({
				success: false,
				message: "Label has already been created for this order.",
			});
		}

		if (!order.shipStationOrderId) {
			return res.status(400).json({ error: "Order not synced with ShipStation" });
		}
 
		// Step 2: Validate if the database has all the required fields
		if (
			!order.carrierCode ||
			!order.serviceCode ||
			!order.packageCode ||
			!order.totalWeight ||
			!order.shippingAddress?.address ||
			!order.shippingAddress?.city ||
			!order.shippingAddress?.postcode ||
			!order.shippingAddress?.country
		) {
			return res.status(400).json({ error: "Order data is incomplete for label creation." });
		}

		// const authToken = Buffer.from(
		// 	`${process.env.SHIPSTATION_API_KEY}:${process.env.SHIPSTATION_API_SECRET}`
		// ).toString("base64");
		console.log(authToken);
		const labelPayload = {
			shipment: {
			orderId: order.shipStationOrderId,
				carrier_code: order.carrierCode,
				carrier_id: "se-202244",
				carrier_name: "EVRi - ShipStation Carrier Services",
				service_code: order.serviceCode,
						packageCode: order.packageCode,
				            confirmation: 'none',
								shipDate: new Date().toISOString().split("T")[0],
				packages: [
					{
						weight: {
							value: order.totalWeight,
							unit: "pound",
						},
						dimensions: {
							unit: "inch",
							length: order.combinedDimensions.length,
							width: order.combinedDimensions.width,
							height: order.combinedDimensions.height,
						},
					}
				],
				ship_to: {
					name: 'John Doe', 
					phone: "+4 444-444-4444",
					company_name: 'The Home Depot',
					address_line1: order.shippingAddress.address,
					city_locality: order.shippingAddress.city,
					state_province: order.shippingAddress.state || "N/A",
					postal_code: order.shippingAddress.postcode,
					country_code: order.shippingAddress.country || "GB",
					address_residential_indicator: "yes"
				},
				ship_from: {
					name: "Jarvin",
					company_name: "Angel Page",
					phone: "+4 555-555-5555",
					address_line1: '8 Cody Road',
					city_locality: 'London',
					state_province: order.shippingAddress.state || "N/A",
					postal_code: 'E16 4SR',
					country_code: "GB",
					address_residential_indicator: "no"
				},						
				label_download_type: 'url',
				label_format: 'pdf',
				display_scheme: 'label',
				label_layout: '4x6',
				label_image_id: 'img_DtBXupDBxREpHnwEXhTfgK',
				test_label: true,
			}
		};

		try {
			const response = await axios.post(
				"https://api.shipstation.com/v2/labelst",
				labelPayload,
				{
					headers: {
						'api-key': 'EoEsrnI8TUp1LWkK0LJwZGSgo6LyFi3JLZg4woQ2G6s',
					}
				}
			);
			const responseData = response.data;
			// Destructure the response to get the required details
			const {
				trackingNumber,
				tracking_number,
				labelData,
				label_download,
				shipmentId,
				shipment_id,
				shipmentCost,
				shipment_cost,
				label_id,
				created_at,
				tracking_status,
			} = responseData;
			if (!label_id || !shipment_id || !tracking_number || !label_download) {
				throw new Error("Missing required fields in the ShipStation response.");
			}
			// Save the label details to the database
			order.trackingNumber = trackingNumber || tracking_number;
			order.labelData = labelData;
			order.shipmentId = shipmentId || shipment_id;
			order.shipmentCost = shipmentCost | shipment_cost?.amount || 0;
			order.labelId = label_id;
			order.label_download = label_download.pdf;
			order.trackingStatus = tracking_status;
			order.status = "LabelCreated";
			order.CreateLabelAt = created_at;
			order.orderStatus = "LabelCreated";

			// Save the updated order to the database
			await order.save();

			console.log(order);
			res.status(200).json({
				success: true,
				message: "Label created successfully",
				order,
			});
		} catch (error) {
			console.error("Error generating label:", error.response?.data || error.message);
			order.status = "LabelFailed";
			order.orderStatus = "LabelFailed";
			order.tags.push(`LabelFailed: ${JSON.stringify(error.response?.data || error.message)}`);
			await order.save();

			res.status(500).json({
				success: false,
				message: "Failed to generate shipping label",
				error: error.response?.data || error.message,
			});
		}
	} catch (error) {
		console.error("Error creating label for order:", error);
		res.status(500).json({ error: error.message || "Failed to create label for order" });
	}
};


// Endpoint to update order status and payment status
export const updateOrderStatus = async (req, res) => {
	const {
		orderId,
		status,
		orderStatus,
		paymentStatus,
		paymentConfirmed,
		paymentConfirmedAt,
		paymentIntentId,
	} = req.body;
	const requesterId = req.user?.userId;
	const requesterRole = req.user?.role;

	try {
		const order = await Order.findById(orderId).select("+guestAccessTokenHash");

		if (!order) {
			return res.status(404).json({ error: 'Order not found' });
		}

		const isGuestCheckout = order.isGuestOrder || (!order.buyerId && order.guestEmail);

		if (isGuestCheckout) {
			const guestToken = extractGuestToken(req);
			if (!verifyGuestOrderToken(guestToken, order.guestAccessTokenHash)) {
				return res.status(403).json({
					error: 'Valid guest order token required for this checkout.',
				});
			}
			const fieldError = assertGuestMayUpdateFields(req.body);
			if (fieldError) {
				return res.status(403).json({ error: fieldError });
			}
		} else if (order.buyerId) {
			const isBuyer = order.buyerId?.toString() === requesterId;
			const isSeller = order.products?.some(
				p => p.seller?.toString?.() === requesterId || p.charity?.toString?.() === requesterId,
			);
			if (!requesterId || (!isBuyer && !isSeller && !isAdminRole(requesterRole))) {
				return res.status(403).json({ error: 'Not authorized to update this order.' });
			}
		} else {
			return res.status(403).json({ error: 'Not authorized to update this order.' });
		}

		const wantsPaymentSuccess =
			paymentStatus === "Paid" || paymentConfirmed === true;
		const paymentFailed = paymentStatus === "Failed";

		if (wantsPaymentSuccess) {
			const intentId =
				paymentIntentId || order.stripePaymentIntentId;
			try {
				const paymentIntent = await verifyStripePaymentForOrder(
					order,
					intentId,
				);
				if (!order.stripePaymentIntentId) {
					order.stripePaymentIntentId = paymentIntent.id;
				}
				if (status) order.status = status;
				if (orderStatus) order.orderStatus = orderStatus;
				await applySuccessfulPayment(order, {
					confirmedAt: paymentConfirmedAt
						? new Date(paymentConfirmedAt)
						: new Date(paymentIntent.created * 1000),
				});
			} catch (verifyErr) {
				return res.status(400).json({
					error: verifyErr.message || "Payment verification failed.",
				});
			}
		} else {
			if (status) order.status = status;
			if (orderStatus) order.orderStatus = orderStatus;
			if (paymentStatus) order.paymentStatus = paymentStatus;
			if (paymentConfirmed !== undefined) {
				order.paymentConfirmed = paymentConfirmed;
			}
			if (paymentConfirmedAt) {
				order.paymentConfirmedAt = paymentConfirmedAt;
			}

			if (paymentFailed) {
				await applyFailedPayment(order);
			} else {
				await order.save();
			}
		}

		res.status(200).json({ success: true, message: 'Order status updated successfully', order });
	} catch (error) {
		console.error("Error updating order status:", error);
		res.status(500).json({ error: error.message || "Failed to update order status" });
	}
};
export const orderTracking = async (req, res) => {
	const { orderId } = req.params;
	const { carrierCode, trackingNumber } = req.params;
	try {
		// Fetch the order from the database
		const order = await Order.findById(orderId);

		if (!order) {
			return res.status(404).json({ error: 'Order not found' });
		}

		if (!order.trackingNumber) {
			return res.status(400).json({ error: 'Tracking number not available for this order' });
		}

		const authToken = Buffer.from(
			`${process.env.SHIPSTATION_API_KEY}:${process.env.SHIPSTATION_API_SECRET}`
		).toString('base64');

		// Make a request to ShipStation to get tracking details
		try {
			const response = await axios.get(
				`https://ssapi.shipstation.com/shipments/tracking?carrierCode=${carrierCode}&trackingNumber=${trackingNumber}`,
				{
					headers: {
						Authorization: `Basic ${authToken}`,
						'Content-Type': 'application/json',
					},
				}
			);

			res.status(200).json({
				success: true,
				trackingDetails: response.data,
			});
		} catch (error) {
			console.error('Error fetching tracking information:', error.response?.data || error.message);
			return res.status(500).json({ error: 'Failed to fetch tracking information' });
		}
	} catch (error) {
		console.error('Error tracking order:', error);
		res.status(500).json({ error: 'Failed to track order' });
	}
};

// Get carriers from ShipStation
export const getCarriers = async (_req, res) => {
	try {
		const apiKeys = 'EoEsrnI8TUp1LWkK0LJwZGSgo6LyFi3JLZg4woQ2G6s';
		const response = await fetch(
			`https://api.shipstation.com/v2/carriers`,
			{
				method: 'GET',
				headers: {
					'api-key': 'EoEsrnI8TUp1LWkK0LJwZGSgo6LyFi3JLZg4woQ2G6s'
				}
			}
		);

		const data = await response.json();
		console.log(data);
		// Return carriers to the frontend
		res.status(200).json({ success: true, carriers: data });
	} catch (error) {
		console.error("Error fetching carriers from ShipStation:", error.response?.data || error.message);
		res.status(500).json({ error: "Failed to fetch carrier list" });
	}
};


export const getServices = async (req, res) => {
	const { carrierCode } = req.params;

	try {
		const authToken = Buffer.from(
			`${process.env.SHIPSTATION_API_KEY}:${process.env.SHIPSTATION_API_SECRET}`
		).toString("base64");

		const response = await axios.get(
			`https://ssapi.shipstation.com/carriers/listservices?carrierCode=${carrierCode}`,
			{
				headers: {
					Authorization: `Basic ${authToken}`,
				},
			}
		);

		res.status(200).json({ success: true, services: response.data });
	} catch (error) {
		console.error("Error fetching services:", error.response?.data || error.message);
		res.status(500).json({ error: "Failed to fetch service list" });
	}
};
export const getPackages = async (req, res) => {
	const { carrierCode } = req.params;

	try {
		const authToken = Buffer.from(
			`${process.env.SHIPSTATION_API_KEY}:${process.env.SHIPSTATION_API_SECRET}`
		).toString("base64");

		const response = await axios.get(
			`https://ssapi.shipstation.com/carriers/listpackages?carrierCode=${carrierCode}`,
			{
				headers: {
					Authorization: `Basic ${authToken}`,
				},
			}
		);

		res.status(200).json({ success: true, packages: response.data });
	} catch (error) {
		console.error("Error fetching packages:", error.response?.data || error.message);
		res.status(500).json({ error: "Failed to fetch package list" });
	}
};



// Get orders for a user
export const getOrdersByUser = async (req, res) => {
	const { userId } = req.params;
	const requesterId = req.user?.userId;

	if (!requesterId || requesterId !== userId) {
		return res.status(403).json({ error: "Not authorized to view these orders." });
	}

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
		// Get date ranges for comparisons
		const now = new Date();
		const weekStart = startOfWeek(now, { weekStartsOn: 1 });
		const prevWeekStart = subWeeks(weekStart, 1);
		const monthStart = startOfMonth(now);
		const prevMonthStart = subMonths(monthStart, 1);
		const yearStart = startOfYear(now);
		const prevYearStart = subYears(yearStart, 1);
		const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
		const currentMonthStart = startOfMonth(now);
		const currentYearStart = startOfYear(now);

		// Fetch orders for the given seller
		const orders = await Order.find({
			"products.seller": sellerId,
		})
			.populate("products.productId", "name price images brand seller charity quantity")
			.populate("products.charity", "charityName email profileImage _id storefrontId")
			.populate("buyerId", "firstName lastName email profileImage");

		// Transform data to include additional details
		const soldItems = orders.flatMap(order =>
			order.products
				.filter(product => product.seller?.toString() === sellerId)
				.map(product => ({
					orderId: order._id,
					status: order.status,
					orderStatus: order.orderStatus,
					label_download: order.label_download,
					shipmentId: order.shipmentId,
					labelId: order.labelId,
					trackingStatus: order.trackingStatus,
					trackingNumber: order.trackingNumber,
					buyerId: order.buyerId?._id || null,
					buyerName: `${order.buyerId?.firstName || "Unknown"} ${order.buyerId?.lastName || ""
						}`.trim(),
					buyerEmail: order.buyerId?.email || null,
					buyerProfileImage: order.buyerId?.profileImage || null,
					productId: product.productId?._id || null,
					sellerId: product.seller?._id || null,
					productName: product.productId?.name || "Unknown Product",
					charityProfit: product.charityProfit || 0,
					adminFee: product.adminFee || 0,
					productBrand: product.productId?.brand || "Unknown Product",
					productPrice: product.productId?.price || 0,
					productImages: product.productId?.images || [],
					quantity: product.quantity,
					paymentMethod: order.paymentMethod || null,
					paymentConfirmedAt: order.paymentConfirmedAt,
					paymentStatus: order.paymentStatus || null,
					paymentConfirmed: order.paymentConfirmed || null,
					shipStationOrderId: order.shipStationOrderId || null,
					shipmentCost: order.shipmentCost || null,
					totalAmount: order.totalAmount || null,
					totalProductCost: product.totalProductCost,
					charityId: product.charity?._id || null,
					charityName: product.charity?.charityName || "Unknown Charity",
					charityProfileImage: product.charity?.profileImage || product.productId?.charity?.profileImage || null,
					storefrontId: product.charity?.storefrontId || null,
					orderDate: order.createdAt,
					tracking_url: order.tracking_url,
					status_code: order.status_code,
					status_description: order.status_description,
					orderNumber: order.orderNumber,
				})),
		);
		soldItems.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
		// Function to calculate stats within a date range
		const calculateStats = (orders, rangeStart, rangeEnd) => {
			const filteredOrders = orders.filter(
				order => order.createdAt >= rangeStart && order.createdAt < rangeEnd
			);

			let totalSold = 0;
			let totalRevenue = 0;

			filteredOrders.forEach(order => {
				order.products.forEach(product => {
					if (product.seller?.toString() === sellerId) {
						totalSold += product.quantity;
						totalRevenue += product.totalProductCost;
					}
				});
			});

			return { totalSold, totalRevenue };
		};

		// Calculate stats for the current and previous week, month, and year
		const currentWeekStats = calculateStats(orders, weekStart, now);
		const previousWeekStats = calculateStats(orders, prevWeekStart, weekStart);
		const currentMonthStats = calculateStats(orders, monthStart, now);
		const previousMonthStats = calculateStats(orders, prevMonthStart, monthStart);
		const currentYearStats = calculateStats(orders, yearStart, now);
		const previousYearStats = calculateStats(orders, prevYearStart, yearStart);

		// Helper function to calculate percentage changes
		const calculatePercentageChange = (current, previous) => {
			if (previous === 0) return current > 0 ? 100 : 0;
			return ((current - previous) / previous) * 100;
		};

		// Calculate percentage changes
		const statsChanges = {
			weekly: {
				soldChange: calculatePercentageChange(currentWeekStats.totalSold, previousWeekStats.totalSold),
				revenueChange: calculatePercentageChange(currentWeekStats.totalRevenue, previousWeekStats.totalRevenue),
			},
			monthly: {
				soldChange: calculatePercentageChange(currentMonthStats.totalSold, previousMonthStats.totalSold),
				revenueChange: calculatePercentageChange(currentMonthStats.totalRevenue, previousMonthStats.totalRevenue),
			},
			yearly: {
				soldChange: calculatePercentageChange(currentYearStats.totalSold, previousYearStats.totalSold),
				revenueChange: calculatePercentageChange(currentYearStats.totalRevenue, previousYearStats.totalRevenue),
			},
		};


		// Helper function to group data by a specific period
		const groupData = (orders, start, end, periodLabel) => {
			const filteredOrders = orders.filter(
				order => order.createdAt >= start && order.createdAt <= end
			);

			let totalSold = 0;
			let totalRevenue = 0;

			filteredOrders.forEach(order => {
				order.products.forEach(product => {
					if (product.seller?.toString() === sellerId) {
						totalSold += product.quantity;
						totalRevenue += product.totalProductCost;
					}
				});
			});

			return { revenue: totalRevenue, orders: totalSold, label: periodLabel };
		};

		// Weekly data
		const weeklyData = [];
		for (let i = 4; i >= 0; i--) {
			const weekStart = subWeeks(currentWeekStart, i);
			const weekEnd = endOfWeek(weekStart);
			weeklyData.push(groupData(orders, weekStart, weekEnd, `Week ${5 - i}`));
		}

		// Monthly data
		const monthlyData = [];
		for (let i = 0; i < 12; i++) {
			const monthStart = startOfMonth(subMonths(currentMonthStart, i));
			const monthEnd = endOfMonth(monthStart);
			monthlyData.unshift(
				groupData(orders, monthStart, monthEnd, monthStart.toLocaleString("default", { month: "long" }))
			);
		}

		// Yearly data
		const yearlyData = [];
		for (let i = 0; i < 5; i++) {
			const yearStart = startOfYear(subYears(currentYearStart, i));
			const yearEnd = endOfYear(yearStart);
			yearlyData.unshift(
				groupData(orders, yearStart, yearEnd, yearStart.getFullYear().toString())
			);
		}

	

		// Prepare the response data
		const responseData = {
			success: true,
			totalSoldItems: soldItems.length,
			totalSold: currentMonthStats.totalSold,
			totalRevenue: currentMonthStats.totalRevenue,
			period: "month",
			changes: statsChanges,
			statusSummary: buildOrderStatusSummary(orders, sellerId),
			soldItems,
			weeklyData,
			monthlyData,
			yearlyData,
		};

		res.status(200).json(responseData, );
	} catch (error) {
		console.error("Error fetching sold items:", error);
		res.status(500).json({ error: "Failed to fetch sold items" });
	}
};

export const getPurchaseItems = async (req, res) => {
	const { buyerId } = req.params; // Get buyerId from request params

	try {
		// Get date ranges for comparisons
		const now = new Date();
		const weekStart = startOfWeek(now, { weekStartsOn: 1 });
		const prevWeekStart = subWeeks(weekStart, 1);
		const monthStart = startOfMonth(now);
		const prevMonthStart = subMonths(monthStart, 1);
		const yearStart = startOfYear(now);
		const prevYearStart = subYears(yearStart, 1);

		// Find all orders for the given buyerId
		const orders = await Order.find({ buyerId })
			.populate("products.productId", "name price images brand")
			.populate("products.seller", "_id firstName lastName email charityName profileImage")
			.populate("products.charity", "charityName email profileImage _id storefrontId");

		if (!orders || orders.length === 0) {
			return res.status(200).json(emptyPurchaseResponse());
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
				sellerId: product.productId?.seller?._id || product.seller?._id || product.charity?._id || null,
				sellerName: (product.seller?.firstName && product.seller?.lastName
					? `${product.seller.firstName} ${product.seller.lastName}`.trim()
					: product.charity?.charityName ||
					product.productId?.seller?.charityName ||
					product.charity?.charityName
				) || "",
				sellerEmail: product.productId?.seller?.email || product.seller?.email || product.charity?.email || null,
				sellerProfileImage: product.productId?.seller?.profileImage || product.seller?.profileImage || product.charity?.profileImage || null,
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
				paymentConfirmedAt: order.paymentConfirmedAt || null,
				paymentStatus: order.paymentStatus || null,
				paymentConfirmed: order.paymentConfirmed || null,
				shipStationOrderId: order.shipStationOrderId || null,
				shipmentCost: order.shipmentCost || null,
				totalAmount: order.totalAmount || null,
				orderStatus: order.orderStatus || "Unknown",
				status: order.status || "Unknown",
				trackingNumber: order.trackingNumber,
				label_download: order.label_download,
				tracking_url: order.tracking_url,
				status_code: order.status_code,
				status_description: order.status_description,
				orderNumber: order.orderNumber,
				shipmentId: order.shipmentId,
				labelId: order.labelId,
				trackingStatus: order.trackingStatus,
				serviceCode: order.serviceCode,
				carrierCode: order.carrierCode,
				createdAt: order.createdAt,
				updatedAt: order.updatedAt,
			}))
		);
		purchaseItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
		// Function to calculate stats within a date range
		const calculateStats = (orders, rangeStart, rangeEnd) => {
			const filteredOrders = orders.filter(
				order => order.createdAt >= rangeStart && order.createdAt < rangeEnd
			);

			let totalPurchase = 0;
			let totalSpend = 0;

			filteredOrders.forEach(order => {
				order.products.forEach(product => {
					totalPurchase += product.quantity;
					totalSpend += product.totalProductCost;
				});
			});

			return { totalPurchase, totalSpend };
		};

		// Calculate stats for the current and previous week, month, and year
		const currentWeekStats = calculateStats(orders, weekStart, now);
		const previousWeekStats = calculateStats(orders, prevWeekStart, weekStart);
		const currentMonthStats = calculateStats(orders, monthStart, now);
		const previousMonthStats = calculateStats(orders, prevMonthStart, monthStart);
		const currentYearStats = calculateStats(orders, yearStart, now);
		const previousYearStats = calculateStats(orders, prevYearStart, yearStart);

		// Helper function to calculate percentage changes
		const calculatePercentageChange = (current, previous) => {
			if (previous === 0) return current > 0 ? 100 : 0;
			return ((current - previous) / previous) * 100;
		};

		// Calculate percentage changes
		const statsChanges = {
			weekly: {
				purchaseChange: calculatePercentageChange(currentWeekStats.totalPurchase, previousWeekStats.totalPurchase),
				spendChange: calculatePercentageChange(currentWeekStats.totalSpend, previousWeekStats.totalSpend),
			},
			monthly: {
				purchaseChange: calculatePercentageChange(currentMonthStats.totalPurchase, previousMonthStats.totalPurchase),
				spendChange: calculatePercentageChange(currentMonthStats.totalSpend, previousMonthStats.totalSpend),
			},
			yearly: {
				purchaseChange: calculatePercentageChange(currentYearStats.totalPurchase, previousYearStats.totalPurchase),
				spendChange: calculatePercentageChange(currentYearStats.totalSpend, previousYearStats.totalSpend),
			},
		};

		const ranges = buildPeriodRanges();

		// Prepare the response data
		const responseData = {
			success: true,
			totalPurchaseItems: purchaseItems.length,
			totalPurchase: currentMonthStats.totalPurchase,
			totalSpend: currentMonthStats.totalSpend,
			period: "month",
			changes: statsChanges,
			statusSummary: buildOrderStatusSummary(orders),
			purchaseItems,
			weeklyData: buildWeeklyChart(orders, ranges.currentWeekStart),
			monthlyData: buildMonthlyChart(orders, ranges.currentMonthStart),
			yearlyData: buildYearlyChart(orders, ranges.currentYearStart),
		};

		res.status(200).json(responseData);
	} catch (error) {
		console.error("Error fetching purchase items:", error);
		res.status(500).json({ error: "Failed to fetch purchase items" });
	}
};


// Get total sold items and revenue
export const getTotalSoldItems = async (req, res) => {
	const { sellerId } = req.params;

	try {
		const now = new Date();
		const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
		const currentMonthStart = startOfMonth(now);
		const currentYearStart = startOfYear(now);
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
		// Helper function to group data by a specific period
		const groupData = (orders, start, end, periodLabel) => {
			const filteredOrders = orders.filter(
				order => order.createdAt >= start && order.createdAt <= end
			);

			let totalSold = 0;
			let totalRevenue = 0;

			filteredOrders.forEach(order => {
				order.products.forEach(product => {
					if (product.seller?.toString() === sellerId) {
						totalSold += product.quantity;
						totalRevenue += product.totalProductCost;
					}
				});
			});

			return { revenue: totalRevenue, orders: totalSold, label: periodLabel };
		};

		// Weekly data
		const weeklyData = [];
		for (let i = 4; i >= 0; i--) {
			const weekStart = subWeeks(currentWeekStart, i);
			const weekEnd = endOfWeek(weekStart);
			weeklyData.push(groupData(orders, weekStart, weekEnd, `Week ${5 - i}`));
		}

		// Monthly data
		const monthlyData = [];
		for (let i = 0; i < 12; i++) {
			const monthStart = startOfMonth(subMonths(currentMonthStart, i));
			const monthEnd = endOfMonth(monthStart);
			monthlyData.unshift(
				groupData(orders, monthStart, monthEnd, monthStart.toLocaleString("default", { month: "long" }))
			);
		}

		// Yearly data
		const yearlyData = [];
		for (let i = 0; i < 5; i++) {
			const yearStart = startOfYear(subYears(currentYearStart, i));
			const yearEnd = endOfYear(yearStart);
			yearlyData.unshift(
				groupData(orders, yearStart, yearEnd, yearStart.getFullYear().toString())
			);
		}

		// Response data structure
		const responseData = {
			weeklyData,
			monthlyData,
			yearlyData,
		};

		// res.status(200).json({
		// 	success: true,
		// 	data: responseData,
		// });
		res.status(200).json({
			success: true,
			totalQuantity: totalDetails.totalQuantity,
			totalRevenue: totalDetails.totalRevenue,
			items: totalDetails.items,
			data: responseData,
		});
	} catch (error) {
		console.error("Error fetching total sold items:", error);
		res.status(500).json({ error: "Failed to fetch total sold items" });
	}
};

// Get purchases for a buyer
export const getBuyerPurchases = async (req, res) => {
	const { buyerId } = req.params;
	const requesterId = req.user?.userId;
	const requesterRole = req.user?.role;

	if (!requesterId || (buyerId !== requesterId && !isAdminRole(requesterRole))) {
		return res.status(403).json({ error: "Not authorized to view these purchases." });
	}

	try {
		// Fetch orders placed by the buyer
		const orders = await Order.find({ buyerId })
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

export const updateOrderStatusToShipped = async (req, res) => {
	const { orderId } = req.params;
	const {
		trackingNumber,
		carrierCode,
		labelId,
		serviceCode,
		notifyCustomer = false,
		notifySalesChannel = false,
	} = req.body;

	try {
		// Validate the input
		if (!trackingNumber) {
			return res.status(400).json({ error: "Tracking number is required" });
		}
		if (!carrierCode) {
			return res.status(400).json({ error: "Carrier code is required" });
		}

		// Find the order in the database
		const order = await Order.findById(orderId);
		if (!order) {
			return res.status(404).json({ error: "Order not found" });
		}

		// Check if the order is synced with ShipStation
		if (!order.shipStationOrderId) {
			return res.status(400).json({ error: "Order is not synced with ShipStation" });
		}

		// Prepare the payload for ShipStation
		const shipStationPayload = {
			orderId: order.shipStationOrderId,
			carrierCode, // Use carrierCode from the request body
			shipDate: new Date().toISOString().split("T")[0],
			trackingNumber,
			notifyCustomer,
			notifySalesChannel,
		};

		// Authenticate with ShipStation
		const authToken = Buffer.from(
			`${process.env.SHIPSTATION_API_KEY}:${process.env.SHIPSTATION_API_SECRET}`
		).toString("base64");

		// Mark the order as shipped in ShipStation
		let markShippeddata;
		try {
			const shipStationResponse = await axios.post(
				"https://ssapi.shipstation.com/orders/markasshipped",
				shipStationPayload,
				{
					headers: {
						Authorization: `Basic ${authToken}`,
						"Content-Type": "application/json",
					},
				}
			);

			console.log("ShipStation response:", shipStationResponse.data);
			markShippeddata = shipStationResponse.data;
		} catch (shipStationError) {
			console.error(
				"Error marking order as shipped in ShipStation:",
				shipStationError.response?.data || shipStationError.message
			);
			return res.status(500).json({
				success: false,
				message: "Failed to mark order as shipped in ShipStation",
				error: shipStationError.response?.data || shipStationError.message,
			});
		}

		// Fetch tracking data from ShipStation
		let trackingData;
		try {
			const trackingResponse = await axios.get(
				`https://api.shipstation.com/v2/labels/${labelId}/track`,
				{
					headers: {
						'api-key': 'EoEsrnI8TUp1LWkK0LJwZGSgo6LyFi3JLZg4woQ2G6s',
					}
				}
			);
			trackingData = trackingResponse.data;
			console.log("Tracking data:", trackingData);
		} catch (trackingError) {
			console.error(
				"Error fetching tracking data from ShipStation:",
				trackingError.response?.data || trackingError.message
			);
			return res.status(500).json({
				success: false,
				message: "Failed to fetch tracking data from ShipStation",
				error: trackingError.response?.data || trackingError.message,
			});
		}

		// Update the order status in the database
		order.trackingNumber = trackingNumber;
		order.carrierCode = carrierCode;
		order.labelId = labelId;
		order.serviceCode = serviceCode;
		order.status = "ItemShipped";
		order.orderStatus = "ItemShipped";
		order.ItemShippedAt = new Date();
		order.status_code = trackingData.status_code || "Unknown";
		order.status_detail_code = trackingData.status_detail_code || "Unknown";
		order.status_description = trackingData.status_description || "Unknown";
		order.estimated_delivery_date = trackingData.estimated_delivery_date || null;
		order.actual_delivery_date = trackingData.actual_delivery_date || null;
		order.tracking_url = trackingData.tracking_url || null;
		order.orderNumber = markShippeddata.orderNumber;
		order.trackingEvents = trackingData.events || [];

		await order.save();

		try {
			let buyerEmail;
			let firstName = "there";
			if (order.isGuestOrder) {
				buyerEmail = order.guestEmail;
				firstName = order.guestName?.split(" ")[0] || firstName;
			} else {
				const buyer = await User.findById(order.buyerId).select("email firstName");
				buyerEmail = buyer?.email;
				firstName = buyer?.firstName || firstName;
			}
			if (buyerEmail) {
				await sendOrderShippedEmail({
					email: buyerEmail,
					firstName,
					orderId: order._id.toString(),
					trackingNumber,
					carrierCode,
				});
				fireMarketingEvent(JOURNEY_EVENTS.ORDER_SHIPPED, {
					email: buyerEmail,
					orderId: order._id.toString(),
					trackingNumber,
					carrierCode,
				});
			}
		} catch (notifyErr) {
			console.error("Ship notification failed:", notifyErr);
		}

		notifySellersOrderShipped(order, trackingNumber).catch((err) =>
			console.error("Shipped notification failed:", err),
		);

		res.status(200).json({
			success: true,
			message: "Order marked as shipped successfully",
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

		try {
			let buyerEmail;
			if (order.isGuestOrder) {
				buyerEmail = order.guestEmail;
			} else {
				const buyer = await User.findById(order.buyerId).select("email");
				buyerEmail = buyer?.email;
			}
			if (buyerEmail) {
				fireMarketingEvent(JOURNEY_EVENTS.ORDER_DELIVERED, {
					email: buyerEmail,
					orderId: order._id.toString(),
				});
			}
		} catch (journeyErr) {
			console.error("Order delivered journey failed:", journeyErr);
		}

		notifyBuyerOrderDelivered(order).catch(console.error);

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
export const getTotalSalesStats = async (req, res) => {
	try {
		const period = (req.query.period || "month").toString().toLowerCase();
		const orders = await Order.find({
			paymentStatus: "Paid",
		}).sort({ createdAt: -1 });

		const stats = orders.reduce(
			(acc, order) => {
				order.products.forEach(product => {
					acc.totalProductsSold += product.quantity;
					acc.totalRevenue += product.totalProductCost;

					acc.productDetails.push({
						productId: product.productId?._id || null,
						productName: product.productId?.name || product.name || "Unknown Product",
						quantitySold: product.quantity,
						totalRevenueGenerated: product.totalProductCost,
						sellerId: product.seller?._id || null,
						sellerName: product.seller
							? `${product.seller.firstName || ""} ${product.seller.lastName || ""}`.trim()
							: "Unknown Seller",
						charityId: product.charity?._id || null,
						charityName: product.charity?.charityName || "Unknown Charity",
						status: order.status,
						paymentStatus: order.paymentStatus,
						createdAt: order.createdAt,
					});
				});
				return acc;
			},
			{
				totalProductsSold: 0,
				totalRevenue: 0,
				productDetails: [],
			},
		);

		const ranges = buildPeriodRanges();
		const monthlyData = buildMonthlyChart(orders, ranges.currentMonthStart);
		const weeklyData = buildWeeklyChart(orders, ranges.currentWeekStart);
		const yearlyData = buildYearlyChart(orders, ranges.currentYearStart);

		const currentWeekRevenue = weeklyData.length
			? weeklyData[weeklyData.length - 1]?.revenue || 0
			: 0;
		const previousWeekRevenue =
			weeklyData.length > 1 ? weeklyData[weeklyData.length - 2]?.revenue || 0 : 0;
		const salesChangePercent =
			previousWeekRevenue > 0
				? ((currentWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100
				: currentWeekRevenue > 0
					? 100
					: 0;

		const periodKey =
			period === "week" ? "week" : period === "year" ? "year" : "month";
		const periodChart =
			periodKey === "week"
				? weeklyData
				: periodKey === "year"
					? yearlyData
					: monthlyData;
		const periodRevenue = periodChart.reduce((s, d) => s + (d.revenue || 0), 0);

		res.status(200).json({
			success: true,
			totalProductsSold: stats.totalProductsSold,
			soldItemsCount: stats.totalProductsSold,
			totalRevenue: stats.totalRevenue,
			periodRevenue,
			period: periodKey,
			salesChange: salesChangePercent,
			productDetails: stats.productDetails,
			statusSummary: buildOrderStatusSummary(orders),
			weeklyData,
			monthlyData,
			yearlyData,
			chartData: periodChart,
		});
	} catch (error) {
		console.error("Error fetching sales stats:", error);
		res.status(500).json({ error: "Failed to fetch sales statistics" });
	}
};

export const getFailedPaymentOrders = async (_req, res) => {
	try {
		const orders = await Order.find({
			$or: [{ paymentStatus: "Failed" }, { paymentConfirmed: false, status: "OrderPlaced" }],
		})
			.sort({ updatedAt: -1 })
			.limit(100)
			.populate("buyerId", "firstName lastName email");

		res.status(200).json({
			success: true,
			count: orders.length,
			orders: orders.map((o) => ({
				_id: o._id,
				status: o.status,
				paymentStatus: o.paymentStatus,
				grandTotal: o.grandTotal,
				createdAt: o.createdAt,
				buyer: o.isGuestOrder
					? { email: o.guestEmail, name: o.guestName }
					: o.buyerId,
				isGuestOrder: o.isGuestOrder,
			})),
		});
	} catch (error) {
		res.status(500).json({ error: "Failed to fetch failed payments" });
	}
};


export const getCurretnUserSoldItems = async (req, res) => {
	const { sellerId } = req.params;

	try {
		// Get date ranges for comparisons
		const now = new Date();
		const weekStart = startOfWeek(now, { weekStartsOn: 1 });
		const prevWeekStart = subWeeks(weekStart, 1);
		const monthStart = startOfMonth(now);
		const prevMonthStart = subMonths(monthStart, 1);
		const yearStart = startOfYear(now);
		const prevYearStart = subYears(yearStart, 1);

		// Fetch orders for the seller
		const orders = await Order.find({ "products.seller": sellerId })
			.populate("products.productId", "name price images brand")
			.sort({ createdAt: -1 });

		// Function to calculate stats within a date range
		const calculateStats = (orders, rangeStart, rangeEnd) => {
			const filteredOrders = orders.filter(
				(order) => order.createdAt >= rangeStart && order.createdAt < rangeEnd
			);

			let totalSold = 0;
			let totalRevenue = 0;

			filteredOrders.forEach((order) => {
				order.products.forEach((product) => {
					if (product.seller?.toString() === sellerId) {
						totalSold += product.quantity;
						totalRevenue += product.totalProductCost;
					}
				});
			});

			return { totalSold, totalRevenue };
		};

		// Calculate stats for the current and previous week, month, and year
		const currentWeekStats = calculateStats(orders, weekStart, now);
		const previousWeekStats = calculateStats(orders, prevWeekStart, weekStart);
		const currentMonthStats = calculateStats(orders, monthStart, now);
		const previousMonthStats = calculateStats(orders, prevMonthStart, monthStart);
		const currentYearStats = calculateStats(orders, yearStart, now);
		const previousYearStats = calculateStats(orders, prevYearStart, yearStart);

		// Helper function to calculate percentage changes
		const calculatePercentageChange = (current, previous) => {
			if (previous === 0) return current > 0 ? 100 : 0;
			return ((current - previous) / previous) * 100;
		};

		// Calculate percentage changes
		const statsChanges = {
			weekly: {
				soldChange: calculatePercentageChange(currentWeekStats.totalSold, previousWeekStats.totalSold),
				revenueChange: calculatePercentageChange(currentWeekStats.totalRevenue, previousWeekStats.totalRevenue),
			},
			monthly: {
				soldChange: calculatePercentageChange(currentMonthStats.totalSold, previousMonthStats.totalSold),
				revenueChange: calculatePercentageChange(currentMonthStats.totalRevenue, previousMonthStats.totalRevenue),
			},
			yearly: {
				soldChange: calculatePercentageChange(currentYearStats.totalSold, previousYearStats.totalSold),
				revenueChange: calculatePercentageChange(currentYearStats.totalRevenue, previousYearStats.totalRevenue),
			},
		};

		// Prepare the response data
		const responseData = {
			current: {
				totalSold: currentWeekStats.totalSold,
				totalRevenue: currentWeekStats.totalRevenue,
			},
			changes: statsChanges,
		};

		res.status(200).json({
			success: true,
			data: responseData,
		});
	} catch (error) {
		console.error("Error fetching sold items:", error);
		res.status(500).json({ error: "Failed to fetch sold items" });
	}
};


export const getCurrentUserPurchaseItems = async (req, res) => {
	const { buyerId } = req.params;

	try {
		// Get date ranges for comparisons
		const now = new Date();
		const weekStart = startOfWeek(now, { weekStartsOn: 1 });
		const prevWeekStart = subWeeks(weekStart, 1);
		const monthStart = startOfMonth(now);
		const prevMonthStart = subMonths(monthStart, 1);
		const yearStart = startOfYear(now);
		const prevYearStart = subYears(yearStart, 1);

		// Fetch orders for the buyer
		const orders = await Order.find({ buyerId })
			.populate("products.productId", "name price images brand")
			.sort({ createdAt: -1 });

		// Function to calculate stats within a date range
		const calculateStats = (orders, rangeStart, rangeEnd) => {
			const filteredOrders = orders.filter(
				(order) => order.createdAt >= rangeStart && order.createdAt < rangeEnd
			);

			let totalPurchased = 0;
			let totalSpent = 0;

			filteredOrders.forEach((order) => {
				order.products.forEach((product) => {
					totalPurchased += product.quantity;
					totalSpent += product.totalProductCost;
				});
			});

			return { totalPurchased, totalSpent };
		};

		// Calculate stats for the current and previous week, month, and year
		const currentWeekStats = calculateStats(orders, weekStart, now);
		const previousWeekStats = calculateStats(orders, prevWeekStart, weekStart);
		const currentMonthStats = calculateStats(orders, monthStart, now);
		const previousMonthStats = calculateStats(orders, prevMonthStart, monthStart);
		const currentYearStats = calculateStats(orders, yearStart, now);
		const previousYearStats = calculateStats(orders, prevYearStart, yearStart);

		// Helper function to calculate percentage changes
		const calculatePercentageChange = (current, previous) => {
			if (previous === 0) return current > 0 ? 100 : 0;
			return ((current - previous) / previous) * 100;
		};

		// Calculate percentage changes
		const statsChanges = {
			weekly: {
				purchasedChange: calculatePercentageChange(
					currentWeekStats.totalPurchased,
					previousWeekStats.totalPurchased
				),
				spentChange: calculatePercentageChange(currentWeekStats.totalSpent, previousWeekStats.totalSpent),
			},
			monthly: {
				purchasedChange: calculatePercentageChange(
					currentMonthStats.totalPurchased,
					previousMonthStats.totalPurchased
				),
				spentChange: calculatePercentageChange(currentMonthStats.totalSpent, previousMonthStats.totalSpent),
			},
			yearly: {
				purchasedChange: calculatePercentageChange(
					currentYearStats.totalPurchased,
					previousYearStats.totalPurchased
				),
				spentChange: calculatePercentageChange(currentYearStats.totalSpent, previousYearStats.totalSpent),
			},
		};

		// Prepare the response data
		const responseData = {
			current: {
				totalPurchased: currentWeekStats.totalPurchased,
				totalSpent: currentWeekStats.totalSpent,
			},
			changes: statsChanges,
		};

		res.status(200).json({
			success: true,
			data: responseData,
		});
	} catch (error) {
		console.error("Error fetching purchase items:", error);
		res.status(500).json({ error: "Failed to fetch purchase items" });
	}
};

export const openOrderDispute = async (req, res) => {
	const { orderId } = req.params;
	const { notes } = req.body;
	const userId = req.user?.userId;

	try {
		const order = await Order.findById(orderId);
		if (!order) {
			return res.status(404).json({ error: "Order not found" });
		}

		const isBuyer = order.buyerId?.toString() === userId;
		const isSeller = order.products?.some(
			p =>
				p.seller?.toString?.() === userId ||
				p.charity?.toString?.() === userId,
		);

		if (!isBuyer && !isSeller) {
			return res.status(403).json({ error: "Not authorized to open a dispute on this order." });
		}

		if (order.disputeStatus === "OPEN") {
			return res.status(400).json({ error: "A dispute is already open for this order." });
		}

		order.disputeStatus = "OPEN";
		order.disputeOpenedAt = new Date();
		order.disputeNotes = notes || "";
		order.escrowStatus = "DISPUTED";
		await order.save();

		res.status(200).json({
			success: true,
			message: "Dispute opened. Buyer and seller should resolve directly; Angelpage mediation is in development.",
			order,
		});
	} catch (error) {
		console.error("Error opening dispute:", error);
		res.status(500).json({ error: "Failed to open dispute" });
	}
};
