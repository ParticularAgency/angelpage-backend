"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openOrderDispute = exports.getCurrentUserPurchaseItems = exports.getCurretnUserSoldItems = exports.getFailedPaymentOrders = exports.getTotalSalesStats = exports.getOrderById = exports.updateOrderStatusToDelivered = exports.updateOrderStatusToShipped = exports.getAllOrdersForSeller = exports.getBuyerPurchases = exports.getTotalSoldItems = exports.getPurchaseItems = exports.getSoldItems = exports.getOrdersByUser = exports.getPackages = exports.getServices = exports.getCarriers = exports.orderTracking = exports.updateOrderStatus = exports.createLabelForOrder = exports.getRates = exports.getGuestOrderConfirmation = exports.createGuestOrder = exports.createOrder = void 0;
const axios_1 = __importDefault(require("axios"));
const buffer_1 = require("buffer");
const Order_model_1 = __importDefault(require("../../models/Order.model"));
const Product_model_1 = __importDefault(require("../../models/Product.model"));
const Cart_model_1 = __importDefault(require("../../models/Cart.model"));
// import { shipStationClient } from "../../utils/shipstation";
// import { startOfWeek, subWeeks, startOfMonth, subMonths, startOfYear, subYears } from "date-fns";
const date_fns_1 = require("date-fns");
const dashboard_service_1 = require("../../services/dashboard.service");
const platformPolicy_js_1 = require("../../constants/platformPolicy.js");
const ukValidation_js_1 = require("../../utils/ukValidation.js");
const sanitizeShippingAddress = (address = {}) => ({
    name: address.name,
    address: address.address,
    city: address.city,
    state: address.state,
    country: address.country,
    postcode: address.postcode || address.postCode,
    email: address.email,
});
const stripe_1 = __importDefault(require("stripe"));
const User_model_1 = __importDefault(require("../../models/User.model"));
const email_1 = require("../../utils/email");
const marketingJourneys_service_js_1 = require("../../services/marketingJourneys.service.js");
const orderPayment_service_js_1 = require("../../services/orderPayment.service.js");
const notifyUser_js_1 = require("../../utils/notifyUser.js");
const guestOrderToken_js_1 = require("../../utils/guestOrderToken.js");
const adminRoles_js_1 = require("../../constants/adminRoles.js");
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, { apiVersion: '2020-08-27' });
function verifyStripePaymentForOrder(order, paymentIntentId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!paymentIntentId) {
            throw new Error("paymentIntentId is required to confirm payment.");
        }
        const paymentIntent = yield stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status !== "succeeded") {
            throw new Error("Payment has not succeeded.");
        }
        const metadataOrderId = (_a = paymentIntent.metadata) === null || _a === void 0 ? void 0 : _a.orderId;
        if (metadataOrderId && metadataOrderId !== order._id.toString()) {
            throw new Error("Payment intent does not match this order.");
        }
        const expectedAmount = Math.round(order.grandTotal * 100);
        if (paymentIntent.amount !== expectedAmount) {
            throw new Error("Payment amount does not match order total.");
        }
        if (order.stripePaymentIntentId &&
            order.stripePaymentIntentId !== paymentIntent.id) {
            throw new Error("Order is linked to a different payment intent.");
        }
        return paymentIntent;
    });
}
const createOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g;
    function generateNumericId() {
        return Math.floor(Math.random() * 1000000000); // Generates a 9-digit numeric ID
    }
    const { buyerId, guestEmail, guestName, products, shippingAddress, paymentMethod, carrierCode, serviceCode, shipmentCost, 
    // combinedDimensions,
    // totalWeight,
    paymentConfirmedAt, packageCode = "package", adminAccountId = process.env.STRIPE_ADMIN_ACCOUNT_ID, } = req.body;
    const isGuestOrder = !buyerId;
    const resolvedShipmentCost = Number(shipmentCost) || 0;
    try {
        if (!products ||
            products.length === 0 ||
            !shippingAddress ||
            !adminAccountId ||
            !paymentMethod) {
            return res.status(400).json({ error: "Invalid order details" });
        }
        if (isGuestOrder) {
            if (!(guestEmail === null || guestEmail === void 0 ? void 0 : guestEmail.trim()) || !(guestName === null || guestName === void 0 ? void 0 : guestName.trim())) {
                return res.status(400).json({ error: "Guest email and name are required." });
            }
        }
        else if (!buyerId) {
            return res.status(400).json({ error: "Invalid order details" });
        }
        if (!(0, ukValidation_js_1.assertUkShipping)(shippingAddress, res)) {
            return;
        }
        const enrichedProducts = [];
        for (const product of products) {
            if (!product.productId) {
                return res.status(400).json({ error: "Invalid product in order." });
            }
            const listing = yield Product_model_1.default.findById(product.productId).select("seller charity weight dimensions");
            if (!listing) {
                return res.status(400).json({
                    error: `Product not found: ${product.productId}`,
                });
            }
            if (!isGuestOrder) {
                const sellerId = (_a = listing.seller) === null || _a === void 0 ? void 0 : _a.toString();
                const charitySellerId = (_b = listing.charity) === null || _b === void 0 ? void 0 : _b.toString();
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
            const productWeight = (_c = product.weight) !== null && _c !== void 0 ? _c : listing.weight;
            const productDimensions = (_d = product.dimensions) !== null && _d !== void 0 ? _d : listing.dimensions;
            const totalCost = product.price * product.quantity;
            const charityProfit = totalCost * platformPolicy_js_1.CHARITY_SHARE_RATE;
            const adminFee = totalCost * platformPolicy_js_1.PLATFORM_FEE_RATE;
            const totalWeight = parseFloat(productWeight || 0) * product.quantity;
            enrichedProducts.push(Object.assign(Object.assign({}, product), { seller: product.seller || listing.seller || null, charity: charityId, weight: productWeight, totalProductCost: totalCost, charityProfit,
                adminFee,
                totalWeight, dimensions: {
                    length: parseFloat((productDimensions === null || productDimensions === void 0 ? void 0 : productDimensions.depth) || 0),
                    width: parseFloat((productDimensions === null || productDimensions === void 0 ? void 0 : productDimensions.width) || 0),
                    height: parseFloat((productDimensions === null || productDimensions === void 0 ? void 0 : productDimensions.height) || 0) * product.quantity,
                } }));
        }
        // Calculate the total weight for all products
        const totalWeight = enrichedProducts.reduce((sum, product) => sum + product.totalWeight, 0);
        const combinedDimensions = enrichedProducts.reduce((acc, product) => {
            acc.length = Math.max(acc.length, product.dimensions.length);
            acc.width = Math.max(acc.width, product.dimensions.width);
            acc.height += product.dimensions.height;
            return acc;
        }, { length: 0, width: 0, height: 0 });
        const totalAmount = enrichedProducts.reduce((sum, product) => sum + product.totalProductCost, 0);
        const grandTotal = totalAmount + resolvedShipmentCost;
        // Generate numeric ShipStation order ID
        const numericShipStationOrderId = generateNumericId();
        const normalizedPaymentMethod = isGuestOrder
            ? Object.assign(Object.assign({}, paymentMethod), { nameAccountHolder: (paymentMethod === null || paymentMethod === void 0 ? void 0 : paymentMethod.nameAccountHolder) || guestName.trim(), accountNumber: (paymentMethod === null || paymentMethod === void 0 ? void 0 : paymentMethod.accountNumber) || "stripe", expiryDate: (paymentMethod === null || paymentMethod === void 0 ? void 0 : paymentMethod.expiryDate) || "N/A", cvvNumber: (paymentMethod === null || paymentMethod === void 0 ? void 0 : paymentMethod.cvvNumber) || "N/A", useShippingAsBilling: (_e = paymentMethod === null || paymentMethod === void 0 ? void 0 : paymentMethod.useShippingAsBilling) !== null && _e !== void 0 ? _e : true, billingAddress: (paymentMethod === null || paymentMethod === void 0 ? void 0 : paymentMethod.billingAddress) || {
                    name: guestName.trim(),
                    address: shippingAddress.address,
                    city: shippingAddress.city,
                    country: shippingAddress.country,
                    postCode: shippingAddress.postcode || shippingAddress.postCode,
                } }) : paymentMethod;
        const newOrder = new Order_model_1.default({
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
        yield newOrder.save();
        let guestAccessToken;
        if (isGuestOrder) {
            guestAccessToken = (0, guestOrderToken_js_1.generateGuestOrderToken)();
            newOrder.guestAccessTokenHash = (0, guestOrderToken_js_1.hashGuestOrderToken)(guestAccessToken);
            yield newOrder.save();
        }
        // Create a PaymentIntent
        const paymentIntent = yield stripe.paymentIntents.create({
            amount: Math.round(grandTotal * 100), // Stripe expects amount in cents
            currency: "gbp",
            payment_method_types: ["card"],
            metadata: { orderId: newOrder._id.toString(), },
        });
        newOrder.stripePaymentIntentId = paymentIntent.id;
        yield newOrder.save();
        if (!isGuestOrder && buyerId) {
            yield Cart_model_1.default.findOneAndUpdate({ userId: buyerId }, { items: [] });
        }
        const baseResponse = Object.assign({ success: true, message: "Order created successfully", order: newOrder, clientSecret: paymentIntent.client_secret }, (guestAccessToken ? { guestAccessToken } : {}));
        const canSyncShipStation = carrierCode &&
            serviceCode &&
            process.env.SHIPSTATION_API_KEY &&
            process.env.SHIPSTATION_API_SECRET;
        if (!canSyncShipStation) {
            return res.status(201).json(Object.assign(Object.assign({}, baseResponse), { message: carrierCode
                    ? baseResponse.message
                    : "Order created — shipping carrier can be selected later." }));
        }
        // ShipStation integration (when carrier selected)
        const authToken = buffer_1.Buffer.from(`${process.env.SHIPSTATION_API_KEY}:${process.env.SHIPSTATION_API_SECRET}`).toString("base64");
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
            const orderResponse = yield axios_1.default.post("https://ssapi.shipstation.com/orders/createorder", shipStationOrderPayload, {
                headers: {
                    Authorization: `Basic ${authToken}`,
                    "Content-Type": "application/json",
                },
            });
            const shipStationOrderId = orderResponse.data.orderId;
            newOrder.shipStationOrderId = shipStationOrderId;
            newOrder.status = "OrderConfirmed";
            yield newOrder.save();
            res.status(201).json(Object.assign(Object.assign({}, baseResponse), { message: "Order created successfully and synced with ShipStation" }));
        }
        catch (orderError) {
            console.error("Error creating order in ShipStation:", ((_f = orderError.response) === null || _f === void 0 ? void 0 : _f.data) || orderError.message);
            newOrder.status = "ShipStationOrderFailed";
            newOrder.tags.push(`ShipStationOrderFailed: ${JSON.stringify(((_g = orderError.response) === null || _g === void 0 ? void 0 : _g.data) || orderError.message)}`);
            yield newOrder.save();
            res.status(201).json(Object.assign(Object.assign({}, baseResponse), { message: "Order created locally, but failed to sync with ShipStation" }));
        }
    }
    catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ error: error.message || "Failed to create order" });
    }
});
exports.createOrder = createOrder;
const createGuestOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    req.body.buyerId = undefined;
    return (0, exports.createOrder)(req, res);
});
exports.createGuestOrder = createGuestOrder;
const getGuestOrderConfirmation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { orderId } = req.params;
        const { email, guestToken } = req.query;
        if (!(email === null || email === void 0 ? void 0 : email.trim())) {
            return res.status(400).json({ error: "Email is required to view this order." });
        }
        if (!guestToken) {
            return res.status(403).json({
                error: "Guest order token is required. Use the link from checkout.",
            });
        }
        const order = yield Order_model_1.default.findById(orderId)
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
        if (!(0, guestOrderToken_js_1.verifyGuestOrderToken)(guestToken, order.guestAccessTokenHash)) {
            return res.status(403).json({ error: "Invalid guest order token." });
        }
        if (((_a = order.guestEmail) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase()) !==
            String(email).trim().toLowerCase()) {
            return res.status(403).json({ error: "Email does not match this order." });
        }
        const safeOrder = order.toObject();
        delete safeOrder.guestAccessTokenHash;
        res.status(200).json({ success: true, order: safeOrder });
    }
    catch (error) {
        console.error("getGuestOrderConfirmation:", error);
        res.status(500).json({ error: "Failed to fetch order." });
    }
});
exports.getGuestOrderConfirmation = getGuestOrderConfirmation;
const getRates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { carrierCode, serviceCode, fromPostalCode, fromCity, fromState, toPostalCode, toCountry, products, } = req.body;
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
            var _a, _b, _c;
            const totalWeight = parseFloat(product.weight || 0) * product.quantity; // Total weight for the product
            const dimensions = {
                length: parseFloat(((_a = product.dimensions) === null || _a === void 0 ? void 0 : _a.depth) || 0), // Use `depth` as `length`
                width: parseFloat(((_b = product.dimensions) === null || _b === void 0 ? void 0 : _b.width) || 0),
                height: parseFloat(((_c = product.dimensions) === null || _c === void 0 ? void 0 : _c.height) || 0) * product.quantity, // Stack height
            };
            return Object.assign(Object.assign({}, product), { totalWeight,
                dimensions });
        });
        // Aggregate total weight and combined dimensions
        const totalWeight = enrichedProducts.reduce((sum, product) => sum + product.totalWeight, 0);
        const combinedDimensions = enrichedProducts.reduce((acc, product) => {
            acc.length = Math.max(acc.length, product.dimensions.length); // Use the largest `length`
            acc.width = Math.max(acc.width, product.dimensions.width); // Use the largest `width`
            acc.height += product.dimensions.height; // Sum the `height` (stacking)
            return acc;
        }, { length: 0, width: 0, height: 0 } // Initial dimensions
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
        const authToken = buffer_1.Buffer.from(`${process.env.SHIPSTATION_API_KEY}:${process.env.SHIPSTATION_API_SECRET}`).toString("base64");
        const response = yield axios_1.default.post("https://ssapi.shipstation.com/shipments/getrates", payload, {
            headers: {
                Authorization: `Basic ${authToken}`,
                "Content-Type": "application/json",
            },
        });
        const rates = response.data;
        if (!rates.length) {
            return res.status(404).json({ error: "No shipping rates found for the given details." });
        }
        // Return the rates to the frontend
        res.status(200).json({
            success: true,
            rates,
        });
    }
    catch (error) {
        console.error("Error fetching shipping rates:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch shipping rates.",
            error: ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message,
        });
    }
});
exports.getRates = getRates;
const createLabelForOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const { orderId } = req.params;
    const requesterId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    const requesterRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
    try {
        const order = yield Order_model_1.default.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }
        const isSeller = (_c = order.products) === null || _c === void 0 ? void 0 : _c.some(p => {
            var _a, _b, _c, _d;
            return ((_b = (_a = p.seller) === null || _a === void 0 ? void 0 : _a.toString) === null || _b === void 0 ? void 0 : _b.call(_a)) === requesterId ||
                ((_d = (_c = p.charity) === null || _c === void 0 ? void 0 : _c.toString) === null || _d === void 0 ? void 0 : _d.call(_c)) === requesterId;
        });
        if (!requesterId || (!isSeller && !(0, adminRoles_js_1.isAdminRole)(requesterRole))) {
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
        if (!order.carrierCode ||
            !order.serviceCode ||
            !order.packageCode ||
            !order.totalWeight ||
            !((_d = order.shippingAddress) === null || _d === void 0 ? void 0 : _d.address) ||
            !((_e = order.shippingAddress) === null || _e === void 0 ? void 0 : _e.city) ||
            !((_f = order.shippingAddress) === null || _f === void 0 ? void 0 : _f.postcode) ||
            !((_g = order.shippingAddress) === null || _g === void 0 ? void 0 : _g.country)) {
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
            const response = yield axios_1.default.post("https://api.shipstation.com/v2/labelst", labelPayload, {
                headers: {
                    'api-key': 'EoEsrnI8TUp1LWkK0LJwZGSgo6LyFi3JLZg4woQ2G6s',
                }
            });
            const responseData = response.data;
            // Destructure the response to get the required details
            const { trackingNumber, tracking_number, labelData, label_download, shipmentId, shipment_id, shipmentCost, shipment_cost, label_id, created_at, tracking_status, } = responseData;
            if (!label_id || !shipment_id || !tracking_number || !label_download) {
                throw new Error("Missing required fields in the ShipStation response.");
            }
            // Save the label details to the database
            order.trackingNumber = trackingNumber || tracking_number;
            order.labelData = labelData;
            order.shipmentId = shipmentId || shipment_id;
            order.shipmentCost = shipmentCost | (shipment_cost === null || shipment_cost === void 0 ? void 0 : shipment_cost.amount) || 0;
            order.labelId = label_id;
            order.label_download = label_download.pdf;
            order.trackingStatus = tracking_status;
            order.status = "LabelCreated";
            order.CreateLabelAt = created_at;
            order.orderStatus = "LabelCreated";
            // Save the updated order to the database
            yield order.save();
            console.log(order);
            res.status(200).json({
                success: true,
                message: "Label created successfully",
                order,
            });
        }
        catch (error) {
            console.error("Error generating label:", ((_h = error.response) === null || _h === void 0 ? void 0 : _h.data) || error.message);
            order.status = "LabelFailed";
            order.orderStatus = "LabelFailed";
            order.tags.push(`LabelFailed: ${JSON.stringify(((_j = error.response) === null || _j === void 0 ? void 0 : _j.data) || error.message)}`);
            yield order.save();
            res.status(500).json({
                success: false,
                message: "Failed to generate shipping label",
                error: ((_k = error.response) === null || _k === void 0 ? void 0 : _k.data) || error.message,
            });
        }
    }
    catch (error) {
        console.error("Error creating label for order:", error);
        res.status(500).json({ error: error.message || "Failed to create label for order" });
    }
});
exports.createLabelForOrder = createLabelForOrder;
// Endpoint to update order status and payment status
const updateOrderStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const { orderId, status, orderStatus, paymentStatus, paymentConfirmed, paymentConfirmedAt, paymentIntentId, } = req.body;
    const requesterId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    const requesterRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
    try {
        const order = yield Order_model_1.default.findById(orderId).select("+guestAccessTokenHash");
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        const isGuestCheckout = order.isGuestOrder || (!order.buyerId && order.guestEmail);
        if (isGuestCheckout) {
            const guestToken = (0, guestOrderToken_js_1.extractGuestToken)(req);
            if (!(0, guestOrderToken_js_1.verifyGuestOrderToken)(guestToken, order.guestAccessTokenHash)) {
                return res.status(403).json({
                    error: 'Valid guest order token required for this checkout.',
                });
            }
            const fieldError = (0, guestOrderToken_js_1.assertGuestMayUpdateFields)(req.body);
            if (fieldError) {
                return res.status(403).json({ error: fieldError });
            }
        }
        else if (order.buyerId) {
            const isBuyer = ((_c = order.buyerId) === null || _c === void 0 ? void 0 : _c.toString()) === requesterId;
            const isSeller = (_d = order.products) === null || _d === void 0 ? void 0 : _d.some(p => { var _a, _b, _c, _d; return ((_b = (_a = p.seller) === null || _a === void 0 ? void 0 : _a.toString) === null || _b === void 0 ? void 0 : _b.call(_a)) === requesterId || ((_d = (_c = p.charity) === null || _c === void 0 ? void 0 : _c.toString) === null || _d === void 0 ? void 0 : _d.call(_c)) === requesterId; });
            if (!requesterId || (!isBuyer && !isSeller && !(0, adminRoles_js_1.isAdminRole)(requesterRole))) {
                return res.status(403).json({ error: 'Not authorized to update this order.' });
            }
        }
        else {
            return res.status(403).json({ error: 'Not authorized to update this order.' });
        }
        const wantsPaymentSuccess = paymentStatus === "Paid" || paymentConfirmed === true;
        const paymentFailed = paymentStatus === "Failed";
        if (wantsPaymentSuccess) {
            const intentId = paymentIntentId || order.stripePaymentIntentId;
            try {
                const paymentIntent = yield verifyStripePaymentForOrder(order, intentId);
                if (!order.stripePaymentIntentId) {
                    order.stripePaymentIntentId = paymentIntent.id;
                }
                if (status)
                    order.status = status;
                if (orderStatus)
                    order.orderStatus = orderStatus;
                yield (0, orderPayment_service_js_1.applySuccessfulPayment)(order, {
                    confirmedAt: paymentConfirmedAt
                        ? new Date(paymentConfirmedAt)
                        : new Date(paymentIntent.created * 1000),
                });
            }
            catch (verifyErr) {
                return res.status(400).json({
                    error: verifyErr.message || "Payment verification failed.",
                });
            }
        }
        else {
            if (status)
                order.status = status;
            if (orderStatus)
                order.orderStatus = orderStatus;
            if (paymentStatus)
                order.paymentStatus = paymentStatus;
            if (paymentConfirmed !== undefined) {
                order.paymentConfirmed = paymentConfirmed;
            }
            if (paymentConfirmedAt) {
                order.paymentConfirmedAt = paymentConfirmedAt;
            }
            if (paymentFailed) {
                yield (0, orderPayment_service_js_1.applyFailedPayment)(order);
            }
            else {
                yield order.save();
            }
        }
        res.status(200).json({ success: true, message: 'Order status updated successfully', order });
    }
    catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ error: error.message || "Failed to update order status" });
    }
});
exports.updateOrderStatus = updateOrderStatus;
const orderTracking = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { orderId } = req.params;
    const { carrierCode, trackingNumber } = req.params;
    try {
        // Fetch the order from the database
        const order = yield Order_model_1.default.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        if (!order.trackingNumber) {
            return res.status(400).json({ error: 'Tracking number not available for this order' });
        }
        const authToken = buffer_1.Buffer.from(`${process.env.SHIPSTATION_API_KEY}:${process.env.SHIPSTATION_API_SECRET}`).toString('base64');
        // Make a request to ShipStation to get tracking details
        try {
            const response = yield axios_1.default.get(`https://ssapi.shipstation.com/shipments/tracking?carrierCode=${carrierCode}&trackingNumber=${trackingNumber}`, {
                headers: {
                    Authorization: `Basic ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            res.status(200).json({
                success: true,
                trackingDetails: response.data,
            });
        }
        catch (error) {
            console.error('Error fetching tracking information:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
            return res.status(500).json({ error: 'Failed to fetch tracking information' });
        }
    }
    catch (error) {
        console.error('Error tracking order:', error);
        res.status(500).json({ error: 'Failed to track order' });
    }
});
exports.orderTracking = orderTracking;
// Get carriers from ShipStation
const getCarriers = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const apiKeys = 'EoEsrnI8TUp1LWkK0LJwZGSgo6LyFi3JLZg4woQ2G6s';
        const response = yield fetch(`https://api.shipstation.com/v2/carriers`, {
            method: 'GET',
            headers: {
                'api-key': 'EoEsrnI8TUp1LWkK0LJwZGSgo6LyFi3JLZg4woQ2G6s'
            }
        });
        const data = yield response.json();
        console.log(data);
        // Return carriers to the frontend
        res.status(200).json({ success: true, carriers: data });
    }
    catch (error) {
        console.error("Error fetching carriers from ShipStation:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        res.status(500).json({ error: "Failed to fetch carrier list" });
    }
});
exports.getCarriers = getCarriers;
const getServices = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { carrierCode } = req.params;
    try {
        const authToken = buffer_1.Buffer.from(`${process.env.SHIPSTATION_API_KEY}:${process.env.SHIPSTATION_API_SECRET}`).toString("base64");
        const response = yield axios_1.default.get(`https://ssapi.shipstation.com/carriers/listservices?carrierCode=${carrierCode}`, {
            headers: {
                Authorization: `Basic ${authToken}`,
            },
        });
        res.status(200).json({ success: true, services: response.data });
    }
    catch (error) {
        console.error("Error fetching services:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        res.status(500).json({ error: "Failed to fetch service list" });
    }
});
exports.getServices = getServices;
const getPackages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { carrierCode } = req.params;
    try {
        const authToken = buffer_1.Buffer.from(`${process.env.SHIPSTATION_API_KEY}:${process.env.SHIPSTATION_API_SECRET}`).toString("base64");
        const response = yield axios_1.default.get(`https://ssapi.shipstation.com/carriers/listpackages?carrierCode=${carrierCode}`, {
            headers: {
                Authorization: `Basic ${authToken}`,
            },
        });
        res.status(200).json({ success: true, packages: response.data });
    }
    catch (error) {
        console.error("Error fetching packages:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        res.status(500).json({ error: "Failed to fetch package list" });
    }
});
exports.getPackages = getPackages;
// Get orders for a user
const getOrdersByUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { userId } = req.params;
    const requesterId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!requesterId || requesterId !== userId) {
        return res.status(403).json({ error: "Not authorized to view these orders." });
    }
    try {
        const orders = yield Order_model_1.default.find({ buyerId: userId })
            .populate("products.productId", "name price")
            .populate("products.seller", "firstName lastName")
            .populate("products.charity", "charityName");
        res.status(200).json({ success: true, orders });
    }
    catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});
exports.getOrdersByUser = getOrdersByUser;
const getSoldItems = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { sellerId } = req.params;
    try {
        // Get date ranges for comparisons
        const now = new Date();
        const weekStart = (0, date_fns_1.startOfWeek)(now, { weekStartsOn: 1 });
        const prevWeekStart = (0, date_fns_1.subWeeks)(weekStart, 1);
        const monthStart = (0, date_fns_1.startOfMonth)(now);
        const prevMonthStart = (0, date_fns_1.subMonths)(monthStart, 1);
        const yearStart = (0, date_fns_1.startOfYear)(now);
        const prevYearStart = (0, date_fns_1.subYears)(yearStart, 1);
        const currentWeekStart = (0, date_fns_1.startOfWeek)(now, { weekStartsOn: 1 });
        const currentMonthStart = (0, date_fns_1.startOfMonth)(now);
        const currentYearStart = (0, date_fns_1.startOfYear)(now);
        // Fetch orders for the given seller
        const orders = yield Order_model_1.default.find({
            "products.seller": sellerId,
        })
            .populate("products.productId", "name price images brand seller charity quantity")
            .populate("products.charity", "charityName email profileImage _id storefrontId")
            .populate("buyerId", "firstName lastName email profileImage");
        // Transform data to include additional details
        const soldItems = orders.flatMap(order => order.products
            .filter(product => { var _a; return ((_a = product.seller) === null || _a === void 0 ? void 0 : _a.toString()) === sellerId; })
            .map(product => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
            return ({
                orderId: order._id,
                status: order.status,
                orderStatus: order.orderStatus,
                label_download: order.label_download,
                shipmentId: order.shipmentId,
                labelId: order.labelId,
                trackingStatus: order.trackingStatus,
                trackingNumber: order.trackingNumber,
                buyerId: ((_a = order.buyerId) === null || _a === void 0 ? void 0 : _a._id) || null,
                buyerName: `${((_b = order.buyerId) === null || _b === void 0 ? void 0 : _b.firstName) || "Unknown"} ${((_c = order.buyerId) === null || _c === void 0 ? void 0 : _c.lastName) || ""}`.trim(),
                buyerEmail: ((_d = order.buyerId) === null || _d === void 0 ? void 0 : _d.email) || null,
                buyerProfileImage: ((_e = order.buyerId) === null || _e === void 0 ? void 0 : _e.profileImage) || null,
                productId: ((_f = product.productId) === null || _f === void 0 ? void 0 : _f._id) || null,
                sellerId: ((_g = product.seller) === null || _g === void 0 ? void 0 : _g._id) || null,
                productName: ((_h = product.productId) === null || _h === void 0 ? void 0 : _h.name) || "Unknown Product",
                charityProfit: product.charityProfit || 0,
                adminFee: product.adminFee || 0,
                productBrand: ((_j = product.productId) === null || _j === void 0 ? void 0 : _j.brand) || "Unknown Product",
                productPrice: ((_k = product.productId) === null || _k === void 0 ? void 0 : _k.price) || 0,
                productImages: ((_l = product.productId) === null || _l === void 0 ? void 0 : _l.images) || [],
                quantity: product.quantity,
                paymentMethod: order.paymentMethod || null,
                paymentConfirmedAt: order.paymentConfirmedAt,
                paymentStatus: order.paymentStatus || null,
                paymentConfirmed: order.paymentConfirmed || null,
                shipStationOrderId: order.shipStationOrderId || null,
                shipmentCost: order.shipmentCost || null,
                totalAmount: order.totalAmount || null,
                totalProductCost: product.totalProductCost,
                charityId: ((_m = product.charity) === null || _m === void 0 ? void 0 : _m._id) || null,
                charityName: ((_o = product.charity) === null || _o === void 0 ? void 0 : _o.charityName) || "Unknown Charity",
                charityProfileImage: ((_p = product.charity) === null || _p === void 0 ? void 0 : _p.profileImage) || ((_r = (_q = product.productId) === null || _q === void 0 ? void 0 : _q.charity) === null || _r === void 0 ? void 0 : _r.profileImage) || null,
                storefrontId: ((_s = product.charity) === null || _s === void 0 ? void 0 : _s.storefrontId) || null,
                orderDate: order.createdAt,
                tracking_url: order.tracking_url,
                status_code: order.status_code,
                status_description: order.status_description,
                orderNumber: order.orderNumber,
            });
        }));
        soldItems.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
        // Function to calculate stats within a date range
        const calculateStats = (orders, rangeStart, rangeEnd) => {
            const filteredOrders = orders.filter(order => order.createdAt >= rangeStart && order.createdAt < rangeEnd);
            let totalSold = 0;
            let totalRevenue = 0;
            filteredOrders.forEach(order => {
                order.products.forEach(product => {
                    var _a;
                    if (((_a = product.seller) === null || _a === void 0 ? void 0 : _a.toString()) === sellerId) {
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
            if (previous === 0)
                return current > 0 ? 100 : 0;
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
            const filteredOrders = orders.filter(order => order.createdAt >= start && order.createdAt <= end);
            let totalSold = 0;
            let totalRevenue = 0;
            filteredOrders.forEach(order => {
                order.products.forEach(product => {
                    var _a;
                    if (((_a = product.seller) === null || _a === void 0 ? void 0 : _a.toString()) === sellerId) {
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
            const weekStart = (0, date_fns_1.subWeeks)(currentWeekStart, i);
            const weekEnd = (0, date_fns_1.endOfWeek)(weekStart);
            weeklyData.push(groupData(orders, weekStart, weekEnd, `Week ${5 - i}`));
        }
        // Monthly data
        const monthlyData = [];
        for (let i = 0; i < 12; i++) {
            const monthStart = (0, date_fns_1.startOfMonth)((0, date_fns_1.subMonths)(currentMonthStart, i));
            const monthEnd = (0, date_fns_1.endOfMonth)(monthStart);
            monthlyData.unshift(groupData(orders, monthStart, monthEnd, monthStart.toLocaleString("default", { month: "long" })));
        }
        // Yearly data
        const yearlyData = [];
        for (let i = 0; i < 5; i++) {
            const yearStart = (0, date_fns_1.startOfYear)((0, date_fns_1.subYears)(currentYearStart, i));
            const yearEnd = (0, date_fns_1.endOfYear)(yearStart);
            yearlyData.unshift(groupData(orders, yearStart, yearEnd, yearStart.getFullYear().toString()));
        }
        // Prepare the response data
        const responseData = {
            success: true,
            totalSoldItems: soldItems.length,
            totalSold: currentMonthStats.totalSold,
            totalRevenue: currentMonthStats.totalRevenue,
            period: "month",
            changes: statsChanges,
            statusSummary: (0, dashboard_service_1.buildOrderStatusSummary)(orders, sellerId),
            soldItems,
            weeklyData,
            monthlyData,
            yearlyData,
        };
        res.status(200).json(responseData);
    }
    catch (error) {
        console.error("Error fetching sold items:", error);
        res.status(500).json({ error: "Failed to fetch sold items" });
    }
});
exports.getSoldItems = getSoldItems;
const getPurchaseItems = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { buyerId } = req.params; // Get buyerId from request params
    try {
        // Get date ranges for comparisons
        const now = new Date();
        const weekStart = (0, date_fns_1.startOfWeek)(now, { weekStartsOn: 1 });
        const prevWeekStart = (0, date_fns_1.subWeeks)(weekStart, 1);
        const monthStart = (0, date_fns_1.startOfMonth)(now);
        const prevMonthStart = (0, date_fns_1.subMonths)(monthStart, 1);
        const yearStart = (0, date_fns_1.startOfYear)(now);
        const prevYearStart = (0, date_fns_1.subYears)(yearStart, 1);
        // Find all orders for the given buyerId
        const orders = yield Order_model_1.default.find({ buyerId })
            .populate("products.productId", "name price images brand")
            .populate("products.seller", "_id firstName lastName email charityName profileImage")
            .populate("products.charity", "charityName email profileImage _id storefrontId");
        if (!orders || orders.length === 0) {
            return res.status(200).json((0, dashboard_service_1.emptyPurchaseResponse)());
        }
        // Transform data to include additional details
        const purchaseItems = orders.flatMap(order => order.products.map(product => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7;
            return ({
                orderId: order._id,
                buyerId: order.buyerId,
                buyerName: `${((_a = order.shippingAddress) === null || _a === void 0 ? void 0 : _a.name) || "Unknown Buyer"}`,
                productId: ((_b = product.productId) === null || _b === void 0 ? void 0 : _b._id) || null,
                productName: ((_c = product.productId) === null || _c === void 0 ? void 0 : _c.name) || product.name || "Unknown Product",
                productBrand: ((_d = product.productId) === null || _d === void 0 ? void 0 : _d.brand) || product.brand || "Unknown Brand",
                productPrice: ((_e = product.productId) === null || _e === void 0 ? void 0 : _e.price) || product.price || 0,
                charityProfit: product.charityProfit || 0,
                adminFee: product.adminFee || 0,
                productImages: ((_f = product.productId) === null || _f === void 0 ? void 0 : _f.images) || [],
                sellerId: ((_h = (_g = product.productId) === null || _g === void 0 ? void 0 : _g.seller) === null || _h === void 0 ? void 0 : _h._id) || ((_j = product.seller) === null || _j === void 0 ? void 0 : _j._id) || ((_k = product.charity) === null || _k === void 0 ? void 0 : _k._id) || null,
                sellerName: (((_l = product.seller) === null || _l === void 0 ? void 0 : _l.firstName) && ((_m = product.seller) === null || _m === void 0 ? void 0 : _m.lastName)
                    ? `${product.seller.firstName} ${product.seller.lastName}`.trim()
                    : ((_o = product.charity) === null || _o === void 0 ? void 0 : _o.charityName) ||
                        ((_q = (_p = product.productId) === null || _p === void 0 ? void 0 : _p.seller) === null || _q === void 0 ? void 0 : _q.charityName) ||
                        ((_r = product.charity) === null || _r === void 0 ? void 0 : _r.charityName)) || "",
                sellerEmail: ((_t = (_s = product.productId) === null || _s === void 0 ? void 0 : _s.seller) === null || _t === void 0 ? void 0 : _t.email) || ((_u = product.seller) === null || _u === void 0 ? void 0 : _u.email) || ((_v = product.charity) === null || _v === void 0 ? void 0 : _v.email) || null,
                sellerProfileImage: ((_x = (_w = product.productId) === null || _w === void 0 ? void 0 : _w.seller) === null || _x === void 0 ? void 0 : _x.profileImage) || ((_y = product.seller) === null || _y === void 0 ? void 0 : _y.profileImage) || ((_z = product.charity) === null || _z === void 0 ? void 0 : _z.profileImage) || null,
                charityId: ((_0 = product.charity) === null || _0 === void 0 ? void 0 : _0._id) || null,
                charityName: ((_1 = product.charity) === null || _1 === void 0 ? void 0 : _1.charityName) || "Unknown Charity",
                charityProfileImage: ((_2 = product.charity) === null || _2 === void 0 ? void 0 : _2.profileImage) || null,
                quantity: product.quantity,
                totalProductCost: product.totalProductCost || 0,
                shippingAddress: {
                    name: ((_3 = order.shippingAddress) === null || _3 === void 0 ? void 0 : _3.name) || "",
                    address: ((_4 = order.shippingAddress) === null || _4 === void 0 ? void 0 : _4.address) || "",
                    city: ((_5 = order.shippingAddress) === null || _5 === void 0 ? void 0 : _5.city) || "",
                    country: ((_6 = order.shippingAddress) === null || _6 === void 0 ? void 0 : _6.country) || "",
                    postcode: ((_7 = order.shippingAddress) === null || _7 === void 0 ? void 0 : _7.postcode) || "",
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
            });
        }));
        purchaseItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        // Function to calculate stats within a date range
        const calculateStats = (orders, rangeStart, rangeEnd) => {
            const filteredOrders = orders.filter(order => order.createdAt >= rangeStart && order.createdAt < rangeEnd);
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
            if (previous === 0)
                return current > 0 ? 100 : 0;
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
        const ranges = (0, dashboard_service_1.buildPeriodRanges)();
        // Prepare the response data
        const responseData = {
            success: true,
            totalPurchaseItems: purchaseItems.length,
            totalPurchase: currentMonthStats.totalPurchase,
            totalSpend: currentMonthStats.totalSpend,
            period: "month",
            changes: statsChanges,
            statusSummary: (0, dashboard_service_1.buildOrderStatusSummary)(orders),
            purchaseItems,
            weeklyData: (0, dashboard_service_1.buildWeeklyChart)(orders, ranges.currentWeekStart),
            monthlyData: (0, dashboard_service_1.buildMonthlyChart)(orders, ranges.currentMonthStart),
            yearlyData: (0, dashboard_service_1.buildYearlyChart)(orders, ranges.currentYearStart),
        };
        res.status(200).json(responseData);
    }
    catch (error) {
        console.error("Error fetching purchase items:", error);
        res.status(500).json({ error: "Failed to fetch purchase items" });
    }
});
exports.getPurchaseItems = getPurchaseItems;
// Get total sold items and revenue
const getTotalSoldItems = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { sellerId } = req.params;
    try {
        const now = new Date();
        const currentWeekStart = (0, date_fns_1.startOfWeek)(now, { weekStartsOn: 1 });
        const currentMonthStart = (0, date_fns_1.startOfMonth)(now);
        const currentYearStart = (0, date_fns_1.startOfYear)(now);
        // Find all orders containing products sold by the given seller
        const orders = yield Order_model_1.default.find({
            "products.seller": sellerId,
        })
            .populate("products.productId", "name price")
            .populate("products.seller", "firstName lastName email")
            .populate("products.charity", "charityName");
        // Aggregate total sold items and details
        const totalDetails = orders.reduce((acc, order) => {
            order.products.forEach(product => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                // Increment total quantity and revenue
                acc.totalQuantity += product.quantity;
                acc.totalRevenue += product.totalProductCost;
                // Add each product to the items list with details
                acc.items.push({
                    orderId: order._id,
                    buyerId: order.buyerId,
                    productId: ((_a = product.productId) === null || _a === void 0 ? void 0 : _a._id) || null,
                    productName: ((_b = product.productId) === null || _b === void 0 ? void 0 : _b.name) || "Unknown Product",
                    productBrand: ((_c = product.productId) === null || _c === void 0 ? void 0 : _c.brand) || "Unknown Brand",
                    sellerId: ((_d = product.seller) === null || _d === void 0 ? void 0 : _d._id) || null,
                    sellerName: `${((_e = product.seller) === null || _e === void 0 ? void 0 : _e.firstName) || "Unknown"} ${((_f = product.seller) === null || _f === void 0 ? void 0 : _f.lastName) || ""}`.trim(),
                    quantity: product.quantity,
                    itemPrice: ((_g = product.productId) === null || _g === void 0 ? void 0 : _g.price) || 0,
                    totalProductCost: product.totalProductCost,
                    charityId: ((_h = product.charity) === null || _h === void 0 ? void 0 : _h._id) || null,
                    charityName: ((_j = product.charity) === null || _j === void 0 ? void 0 : _j.charityName) || "Unknown Charity",
                    orderDate: order.createdAt,
                });
            });
            return acc;
        }, {
            totalQuantity: 0, // Total items sold
            totalRevenue: 0, // Total revenue generated
            items: [], // List of sold products
        });
        // Helper function to group data by a specific period
        const groupData = (orders, start, end, periodLabel) => {
            const filteredOrders = orders.filter(order => order.createdAt >= start && order.createdAt <= end);
            let totalSold = 0;
            let totalRevenue = 0;
            filteredOrders.forEach(order => {
                order.products.forEach(product => {
                    var _a;
                    if (((_a = product.seller) === null || _a === void 0 ? void 0 : _a.toString()) === sellerId) {
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
            const weekStart = (0, date_fns_1.subWeeks)(currentWeekStart, i);
            const weekEnd = (0, date_fns_1.endOfWeek)(weekStart);
            weeklyData.push(groupData(orders, weekStart, weekEnd, `Week ${5 - i}`));
        }
        // Monthly data
        const monthlyData = [];
        for (let i = 0; i < 12; i++) {
            const monthStart = (0, date_fns_1.startOfMonth)((0, date_fns_1.subMonths)(currentMonthStart, i));
            const monthEnd = (0, date_fns_1.endOfMonth)(monthStart);
            monthlyData.unshift(groupData(orders, monthStart, monthEnd, monthStart.toLocaleString("default", { month: "long" })));
        }
        // Yearly data
        const yearlyData = [];
        for (let i = 0; i < 5; i++) {
            const yearStart = (0, date_fns_1.startOfYear)((0, date_fns_1.subYears)(currentYearStart, i));
            const yearEnd = (0, date_fns_1.endOfYear)(yearStart);
            yearlyData.unshift(groupData(orders, yearStart, yearEnd, yearStart.getFullYear().toString()));
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
    }
    catch (error) {
        console.error("Error fetching total sold items:", error);
        res.status(500).json({ error: "Failed to fetch total sold items" });
    }
});
exports.getTotalSoldItems = getTotalSoldItems;
// Get purchases for a buyer
const getBuyerPurchases = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { buyerId } = req.params;
    const requesterId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    const requesterRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
    if (!requesterId || (buyerId !== requesterId && !(0, adminRoles_js_1.isAdminRole)(requesterRole))) {
        return res.status(403).json({ error: "Not authorized to view these purchases." });
    }
    try {
        // Fetch orders placed by the buyer
        const orders = yield Order_model_1.default.find({ buyerId })
            .populate("products.productId", "name price images")
            .populate("products.seller", "firstName lastName email profileImage")
            .populate("products.charity", "charityName profileImage id storefrontId");
        // Aggregate purchase information
        const purchaseDetails = orders.reduce((acc, order) => {
            const orderItems = order.products.map(product => {
                var _a, _b, _c, _d;
                return ({
                    status: order.status,
                    orderId: order._id,
                    productId: product.productId._id,
                    productName: product.productId.name,
                    quantity: product.quantity,
                    itemPrice: product.productId.price,
                    totalProductCost: product.totalProductCost,
                    sellerId: product.seller._id,
                    sellerName: `${(_a = product.seller) === null || _a === void 0 ? void 0 : _a.firstName} ${(_b = product.seller) === null || _b === void 0 ? void 0 : _b.lastName}`,
                    charityId: (_c = product.charity) === null || _c === void 0 ? void 0 : _c._id,
                    charityName: (_d = product.charity) === null || _d === void 0 ? void 0 : _d.charityName,
                    orderDate: order.createdAt,
                });
            });
            acc.items.push(...orderItems);
            acc.totalItems += order.products.length;
            acc.totalSpent += order.products.reduce((sum, product) => sum + product.totalProductCost, 0);
            return acc;
        }, { totalItems: 0, totalSpent: 0, items: [] });
        res.status(200).json({
            success: true,
            totalItems: purchaseDetails.totalItems,
            totalSpent: purchaseDetails.totalSpent,
            items: purchaseDetails.items,
        });
    }
    catch (error) {
        console.error("Error fetching buyer purchases:", error);
        res.status(500).json({ error: "Failed to fetch purchase details" });
    }
});
exports.getBuyerPurchases = getBuyerPurchases;
const getAllOrdersForSeller = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    try {
        // Log the authenticated user and requested seller ID
        console.log("Authenticated user ID:", req.user.id);
        console.log("Requested user ID:", userId);
        // Fetch orders where the seller is involved
        const orders = yield Order_model_1.default.find({ sellerId: userId })
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
            products: order.products.map(product => {
                var _a, _b, _c, _d, _e, _f, _g;
                return ({
                    productId: ((_a = product.productId) === null || _a === void 0 ? void 0 : _a._id) || null,
                    productName: ((_b = product.productId) === null || _b === void 0 ? void 0 : _b.name) || "Unknown Product",
                    productImage: ((_e = (_d = (_c = product.productId) === null || _c === void 0 ? void 0 : _c.images) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.url) || null,
                    quantity: product.quantity,
                    itemPrice: ((_f = product.productId) === null || _f === void 0 ? void 0 : _f.price) || 0,
                    totalProductCost: product.totalProductCost,
                    charityName: ((_g = product.charity) === null || _g === void 0 ? void 0 : _g.charityName) || "Unknown Charity",
                });
            }),
            totalAmount: order.totalAmount,
            shippingAddress: order.shippingAddress,
            status: order.status,
            createdAt: order.createdAt,
        }));
        res.status(200).json({ success: true, orders: formattedOrders });
    }
    catch (error) {
        console.error("Error fetching orders for seller:", error);
        res.status(500).json({ error: "Failed to fetch orders for seller" });
    }
});
exports.getAllOrdersForSeller = getAllOrdersForSeller;
const updateOrderStatusToShipped = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    const { orderId } = req.params;
    const { trackingNumber, carrierCode, labelId, serviceCode, notifyCustomer = false, notifySalesChannel = false, } = req.body;
    try {
        // Validate the input
        if (!trackingNumber) {
            return res.status(400).json({ error: "Tracking number is required" });
        }
        if (!carrierCode) {
            return res.status(400).json({ error: "Carrier code is required" });
        }
        // Find the order in the database
        const order = yield Order_model_1.default.findById(orderId);
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
        const authToken = buffer_1.Buffer.from(`${process.env.SHIPSTATION_API_KEY}:${process.env.SHIPSTATION_API_SECRET}`).toString("base64");
        // Mark the order as shipped in ShipStation
        let markShippeddata;
        try {
            const shipStationResponse = yield axios_1.default.post("https://ssapi.shipstation.com/orders/markasshipped", shipStationPayload, {
                headers: {
                    Authorization: `Basic ${authToken}`,
                    "Content-Type": "application/json",
                },
            });
            console.log("ShipStation response:", shipStationResponse.data);
            markShippeddata = shipStationResponse.data;
        }
        catch (shipStationError) {
            console.error("Error marking order as shipped in ShipStation:", ((_a = shipStationError.response) === null || _a === void 0 ? void 0 : _a.data) || shipStationError.message);
            return res.status(500).json({
                success: false,
                message: "Failed to mark order as shipped in ShipStation",
                error: ((_b = shipStationError.response) === null || _b === void 0 ? void 0 : _b.data) || shipStationError.message,
            });
        }
        // Fetch tracking data from ShipStation
        let trackingData;
        try {
            const trackingResponse = yield axios_1.default.get(`https://api.shipstation.com/v2/labels/${labelId}/track`, {
                headers: {
                    'api-key': 'EoEsrnI8TUp1LWkK0LJwZGSgo6LyFi3JLZg4woQ2G6s',
                }
            });
            trackingData = trackingResponse.data;
            console.log("Tracking data:", trackingData);
        }
        catch (trackingError) {
            console.error("Error fetching tracking data from ShipStation:", ((_c = trackingError.response) === null || _c === void 0 ? void 0 : _c.data) || trackingError.message);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch tracking data from ShipStation",
                error: ((_d = trackingError.response) === null || _d === void 0 ? void 0 : _d.data) || trackingError.message,
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
        yield order.save();
        try {
            let buyerEmail;
            let firstName = "there";
            if (order.isGuestOrder) {
                buyerEmail = order.guestEmail;
                firstName = ((_e = order.guestName) === null || _e === void 0 ? void 0 : _e.split(" ")[0]) || firstName;
            }
            else {
                const buyer = yield User_model_1.default.findById(order.buyerId).select("email firstName");
                buyerEmail = buyer === null || buyer === void 0 ? void 0 : buyer.email;
                firstName = (buyer === null || buyer === void 0 ? void 0 : buyer.firstName) || firstName;
            }
            if (buyerEmail) {
                yield (0, email_1.sendOrderShippedEmail)({
                    email: buyerEmail,
                    firstName,
                    orderId: order._id.toString(),
                    trackingNumber,
                    carrierCode,
                });
                (0, marketingJourneys_service_js_1.fireMarketingEvent)(marketingJourneys_service_js_1.JOURNEY_EVENTS.ORDER_SHIPPED, {
                    email: buyerEmail,
                    orderId: order._id.toString(),
                    trackingNumber,
                    carrierCode,
                });
            }
        }
        catch (notifyErr) {
            console.error("Ship notification failed:", notifyErr);
        }
        (0, notifyUser_js_1.notifySellersOrderShipped)(order, trackingNumber).catch((err) => console.error("Shipped notification failed:", err));
        res.status(200).json({
            success: true,
            message: "Order marked as shipped successfully",
            order,
        });
    }
    catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ error: "Failed to update order status" });
    }
});
exports.updateOrderStatusToShipped = updateOrderStatusToShipped;
const updateOrderStatusToDelivered = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { orderId } = req.params;
    try {
        const order = yield Order_model_1.default.findById(orderId);
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
        yield order.save();
        try {
            let buyerEmail;
            if (order.isGuestOrder) {
                buyerEmail = order.guestEmail;
            }
            else {
                const buyer = yield User_model_1.default.findById(order.buyerId).select("email");
                buyerEmail = buyer === null || buyer === void 0 ? void 0 : buyer.email;
            }
            if (buyerEmail) {
                (0, marketingJourneys_service_js_1.fireMarketingEvent)(marketingJourneys_service_js_1.JOURNEY_EVENTS.ORDER_DELIVERED, {
                    email: buyerEmail,
                    orderId: order._id.toString(),
                });
            }
        }
        catch (journeyErr) {
            console.error("Order delivered journey failed:", journeyErr);
        }
        (0, notifyUser_js_1.notifyBuyerOrderDelivered)(order).catch(console.error);
        res.status(200).json({
            success: true,
            message: "Order status updated to Delivered",
            order,
        });
    }
    catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ error: "Failed to update order status" });
    }
});
exports.updateOrderStatusToDelivered = updateOrderStatusToDelivered;
const getOrderById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { orderId } = req.params;
    try {
        const order = yield Order_model_1.default.findById(orderId)
            .populate("products.productId", "name price images brand")
            .populate("products.seller", "firstName lastName profileImage")
            .populate("products.charity", "charityName profileImage");
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }
        res.status(200).json({ success: true, order });
    }
    catch (error) {
        console.error("Error fetching order:", error);
        res.status(500).json({ error: "Failed to fetch order" });
    }
});
exports.getOrderById = getOrderById;
// Get total sold products and sales revenue (Admin View)
const getTotalSalesStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const period = (req.query.period || "month").toString().toLowerCase();
        const orders = yield Order_model_1.default.find({
            paymentStatus: "Paid",
        }).sort({ createdAt: -1 });
        const stats = orders.reduce((acc, order) => {
            order.products.forEach(product => {
                var _a, _b, _c, _d, _e;
                acc.totalProductsSold += product.quantity;
                acc.totalRevenue += product.totalProductCost;
                acc.productDetails.push({
                    productId: ((_a = product.productId) === null || _a === void 0 ? void 0 : _a._id) || null,
                    productName: ((_b = product.productId) === null || _b === void 0 ? void 0 : _b.name) || product.name || "Unknown Product",
                    quantitySold: product.quantity,
                    totalRevenueGenerated: product.totalProductCost,
                    sellerId: ((_c = product.seller) === null || _c === void 0 ? void 0 : _c._id) || null,
                    sellerName: product.seller
                        ? `${product.seller.firstName || ""} ${product.seller.lastName || ""}`.trim()
                        : "Unknown Seller",
                    charityId: ((_d = product.charity) === null || _d === void 0 ? void 0 : _d._id) || null,
                    charityName: ((_e = product.charity) === null || _e === void 0 ? void 0 : _e.charityName) || "Unknown Charity",
                    status: order.status,
                    paymentStatus: order.paymentStatus,
                    createdAt: order.createdAt,
                });
            });
            return acc;
        }, {
            totalProductsSold: 0,
            totalRevenue: 0,
            productDetails: [],
        });
        const ranges = (0, dashboard_service_1.buildPeriodRanges)();
        const monthlyData = (0, dashboard_service_1.buildMonthlyChart)(orders, ranges.currentMonthStart);
        const weeklyData = (0, dashboard_service_1.buildWeeklyChart)(orders, ranges.currentWeekStart);
        const yearlyData = (0, dashboard_service_1.buildYearlyChart)(orders, ranges.currentYearStart);
        const currentWeekRevenue = weeklyData.length
            ? ((_a = weeklyData[weeklyData.length - 1]) === null || _a === void 0 ? void 0 : _a.revenue) || 0
            : 0;
        const previousWeekRevenue = weeklyData.length > 1 ? ((_b = weeklyData[weeklyData.length - 2]) === null || _b === void 0 ? void 0 : _b.revenue) || 0 : 0;
        const salesChangePercent = previousWeekRevenue > 0
            ? ((currentWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100
            : currentWeekRevenue > 0
                ? 100
                : 0;
        const periodKey = period === "week" ? "week" : period === "year" ? "year" : "month";
        const periodChart = periodKey === "week"
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
            statusSummary: (0, dashboard_service_1.buildOrderStatusSummary)(orders),
            weeklyData,
            monthlyData,
            yearlyData,
            chartData: periodChart,
        });
    }
    catch (error) {
        console.error("Error fetching sales stats:", error);
        res.status(500).json({ error: "Failed to fetch sales statistics" });
    }
});
exports.getTotalSalesStats = getTotalSalesStats;
const getFailedPaymentOrders = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orders = yield Order_model_1.default.find({
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
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch failed payments" });
    }
});
exports.getFailedPaymentOrders = getFailedPaymentOrders;
const getCurretnUserSoldItems = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { sellerId } = req.params;
    try {
        // Get date ranges for comparisons
        const now = new Date();
        const weekStart = (0, date_fns_1.startOfWeek)(now, { weekStartsOn: 1 });
        const prevWeekStart = (0, date_fns_1.subWeeks)(weekStart, 1);
        const monthStart = (0, date_fns_1.startOfMonth)(now);
        const prevMonthStart = (0, date_fns_1.subMonths)(monthStart, 1);
        const yearStart = (0, date_fns_1.startOfYear)(now);
        const prevYearStart = (0, date_fns_1.subYears)(yearStart, 1);
        // Fetch orders for the seller
        const orders = yield Order_model_1.default.find({ "products.seller": sellerId })
            .populate("products.productId", "name price images brand")
            .sort({ createdAt: -1 });
        // Function to calculate stats within a date range
        const calculateStats = (orders, rangeStart, rangeEnd) => {
            const filteredOrders = orders.filter((order) => order.createdAt >= rangeStart && order.createdAt < rangeEnd);
            let totalSold = 0;
            let totalRevenue = 0;
            filteredOrders.forEach((order) => {
                order.products.forEach((product) => {
                    var _a;
                    if (((_a = product.seller) === null || _a === void 0 ? void 0 : _a.toString()) === sellerId) {
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
            if (previous === 0)
                return current > 0 ? 100 : 0;
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
    }
    catch (error) {
        console.error("Error fetching sold items:", error);
        res.status(500).json({ error: "Failed to fetch sold items" });
    }
});
exports.getCurretnUserSoldItems = getCurretnUserSoldItems;
const getCurrentUserPurchaseItems = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { buyerId } = req.params;
    try {
        // Get date ranges for comparisons
        const now = new Date();
        const weekStart = (0, date_fns_1.startOfWeek)(now, { weekStartsOn: 1 });
        const prevWeekStart = (0, date_fns_1.subWeeks)(weekStart, 1);
        const monthStart = (0, date_fns_1.startOfMonth)(now);
        const prevMonthStart = (0, date_fns_1.subMonths)(monthStart, 1);
        const yearStart = (0, date_fns_1.startOfYear)(now);
        const prevYearStart = (0, date_fns_1.subYears)(yearStart, 1);
        // Fetch orders for the buyer
        const orders = yield Order_model_1.default.find({ buyerId })
            .populate("products.productId", "name price images brand")
            .sort({ createdAt: -1 });
        // Function to calculate stats within a date range
        const calculateStats = (orders, rangeStart, rangeEnd) => {
            const filteredOrders = orders.filter((order) => order.createdAt >= rangeStart && order.createdAt < rangeEnd);
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
            if (previous === 0)
                return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };
        // Calculate percentage changes
        const statsChanges = {
            weekly: {
                purchasedChange: calculatePercentageChange(currentWeekStats.totalPurchased, previousWeekStats.totalPurchased),
                spentChange: calculatePercentageChange(currentWeekStats.totalSpent, previousWeekStats.totalSpent),
            },
            monthly: {
                purchasedChange: calculatePercentageChange(currentMonthStats.totalPurchased, previousMonthStats.totalPurchased),
                spentChange: calculatePercentageChange(currentMonthStats.totalSpent, previousMonthStats.totalSpent),
            },
            yearly: {
                purchasedChange: calculatePercentageChange(currentYearStats.totalPurchased, previousYearStats.totalPurchased),
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
    }
    catch (error) {
        console.error("Error fetching purchase items:", error);
        res.status(500).json({ error: "Failed to fetch purchase items" });
    }
});
exports.getCurrentUserPurchaseItems = getCurrentUserPurchaseItems;
const openOrderDispute = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const { orderId } = req.params;
    const { notes } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    try {
        const order = yield Order_model_1.default.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }
        const isBuyer = ((_b = order.buyerId) === null || _b === void 0 ? void 0 : _b.toString()) === userId;
        const isSeller = (_c = order.products) === null || _c === void 0 ? void 0 : _c.some(p => {
            var _a, _b, _c, _d;
            return ((_b = (_a = p.seller) === null || _a === void 0 ? void 0 : _a.toString) === null || _b === void 0 ? void 0 : _b.call(_a)) === userId ||
                ((_d = (_c = p.charity) === null || _c === void 0 ? void 0 : _c.toString) === null || _d === void 0 ? void 0 : _d.call(_c)) === userId;
        });
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
        yield order.save();
        res.status(200).json({
            success: true,
            message: "Dispute opened. Buyer and seller should resolve directly; Angelpage mediation is in development.",
            order,
        });
    }
    catch (error) {
        console.error("Error opening dispute:", error);
        res.status(500).json({ error: "Failed to open dispute" });
    }
});
exports.openOrderDispute = openOrderDispute;
