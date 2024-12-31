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
exports.getCurrentUserPurchaseItems = exports.getCurretnUserSoldItems = exports.getTotalSalesStats = exports.getOrderById = exports.updateOrderStatusToDelivered = exports.updateOrderStatusToShipped = exports.getAllOrdersForSeller = exports.getBuyerPurchases = exports.getTotalSoldItems = exports.getPurchaseItems = exports.getSoldItems = exports.getOrdersByUser = exports.getServices = exports.getCarriers = exports.createLabelForOrder = exports.getRates = exports.createOrder = void 0;
const axios_1 = __importDefault(require("axios"));
const buffer_1 = require("buffer");
const Order_model_1 = __importDefault(require("../../models/Order.model"));
const Cart_model_1 = __importDefault(require("../../models/Cart.model"));
const User_model_1 = __importDefault(require("../../models/User.model"));
const Charity_model_1 = __importDefault(require("../../models/Charity.model"));
const date_fns_1 = require("date-fns");
const createOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    function generateNumericId() {
        return Math.floor(Math.random() * 1000000000); // Generates a 9-digit numeric ID
    }
    const { buyerId, products, shippingAddress, paymentMethod, carrierCode, serviceCode, shipmentCost, } = req.body;
    try {
        if (!buyerId || !products || products.length === 0 || !shippingAddress || !paymentMethod || !carrierCode || !serviceCode ||
            shipmentCost === undefined) {
            return res.status(400).json({ error: "Invalid order details" });
        }
        const enrichedProducts = products.map((product) => {
            const totalCost = product.price * product.quantity;
            const charityProfit = totalCost * 0.9;
            const adminFee = totalCost * 0.1;
            return Object.assign(Object.assign({}, product), { seller: product.seller || null, totalProductCost: totalCost, charityProfit,
                adminFee });
        });
        const totalAmount = enrichedProducts.reduce((sum, product) => sum + product.totalProductCost, 0);
        const grandTotal = totalAmount + shipmentCost;
        // Generate numeric ShipStation order ID
        const numericShipStationOrderId = generateNumericId();
        const newOrder = new Order_model_1.default({
            buyerId,
            products: enrichedProducts,
            totalAmount,
            shipmentCost,
            grandTotal,
            shippingAddress,
            paymentMethod,
            carrierCode,
            serviceCode,
            paymentStatus: "Pending",
            paymentConfirmed: false,
            shipStationOrderId: numericShipStationOrderId,
            status: "OrderPlaced",
        });
        yield newOrder.save();
        yield Cart_model_1.default.findOneAndUpdate({ userId: buyerId }, { items: [] });
        // ShipStation integration
        const authToken = buffer_1.Buffer.from(`${process.env.SHIPSTATION_API_KEY}:${process.env.SHIPSTATION_API_SECRET}`).toString("base64");
        const shipStationOrderPayload = {
            orderNumber: numericShipStationOrderId.toString(),
            orderKey: newOrder._id.toString(),
            orderDate: new Date(newOrder.createdAt).toISOString(),
            orderStatus: "awaiting_shipment",
            customerEmail: shippingAddress.email || "customer@example.com",
            billTo: {
                name: shippingAddress.name,
                street1: shippingAddress.address,
                city: shippingAddress.city,
                state: shippingAddress.state || "N/A",
                postalCode: shippingAddress.postcode,
                country: shippingAddress.country,
                email: shippingAddress.email || "customer@example.com",
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
                total: product.totalProductCost, // Ensure the total cost of this product
            })),
            amountPaid: totalAmount + shipmentCost, // Ensure this includes shipping
            shippingAmount: shipmentCost,
            taxAmount: 0, // Add tax if applicable
            // weight: {
            // 	value: totalWeight, // Calculate total weight of the order
            // 	units: "ounces",
            // },
            // dimensions: {
            // 	units: "inches",
            // 	length: totalDimensions.length, // Calculate total package length
            // 	width: totalDimensions.width, // Calculate total package width
            // 	height: totalDimensions.height, // Calculate total package height
            // },
            carrierCode: carrierCode,
            serviceCode: serviceCode,
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
            newOrder.status = "OrderPlaced";
            yield newOrder.save();
            res.status(201).json({
                success: true,
                message: "Order created successfully and synced with ShipStation",
                order: newOrder,
            });
        }
        catch (orderError) {
            console.error("Error creating order in ShipStation:", ((_a = orderError.response) === null || _a === void 0 ? void 0 : _a.data) || orderError.message);
            newOrder.status = "ShipStationOrderFailed";
            newOrder.tags.push(`ShipStationOrderFailed: ${JSON.stringify(((_b = orderError.response) === null || _b === void 0 ? void 0 : _b.data) || orderError.message)}`);
            yield newOrder.save();
            res.status(201).json({
                success: true,
                message: "Order created locally, but failed to sync with ShipStation",
                order: newOrder,
            });
        }
    }
    catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ error: error.message || "Failed to create order" });
    }
});
exports.createOrder = createOrder;
const getRates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { carrierCode, serviceCode, fromPostalCode, fromCity, fromState, toPostalCode, toCountry, weight, dimensions, } = req.body;
    if (!carrierCode || !fromPostalCode || !toPostalCode || !toCountry || !weight) {
        return res.status(400).json({ error: "Missing required fields for rate calculation." });
    }
    try {
        const payload = {
            carrierCode,
            serviceCode: serviceCode || null,
            fromPostalCode,
            fromCity: fromCity || null,
            fromState: fromState || null,
            toPostalCode,
            toCountry,
            weight,
            dimensions: dimensions || null,
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
    var _a, _b, _c;
    const { orderId } = req.params;
    try {
        const order = yield Order_model_1.default.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }
        if (!order.shipStationOrderId) {
            return res.status(400).json({ error: "Order not synced with ShipStation" });
        }
        const authToken = buffer_1.Buffer.from(`${process.env.SHIPSTATION_API_KEY}:${process.env.SHIPSTATION_API_SECRET}`).toString("base64");
        const labelPayload = {
            orderId: order.shipStationOrderId, // Use numeric order ID
            carrierCode: order.carrierCode,
            serviceCode: order.serviceCode,
            packageCode: "package",
            confirmation: "delivery",
            shipDate: new Date().toISOString().split("T")[0],
            weight: {
                value: 2,
                units: "pounds",
            },
            dimensions: {
                units: "inches",
                length: 10,
                width: 6,
                height: 4,
            },
            testLabel: false,
        };
        try {
            const labelResponse = yield axios_1.default.post("https://ssapi.shipstation.com/orders/createlabelfororder", labelPayload, {
                headers: {
                    Authorization: `Basic ${authToken}`,
                    "Content-Type": "application/json",
                },
            });
            const { trackingNumber, labelData, shipmentId, shipmentCost, insuranceCost } = labelResponse.data;
            order.trackingNumber = trackingNumber;
            order.labelData = labelData;
            order.shipmentId = shipmentId;
            order.shipmentCost = shipmentCost;
            order.insuranceCost = insuranceCost;
            order.status = "LabelGenerated";
            yield order.save();
            res.status(200).json({
                success: true,
                message: "Shipping label created successfully",
                order,
            });
        }
        catch (labelError) {
            console.error("Error generating label:", ((_a = labelError.response) === null || _a === void 0 ? void 0 : _a.data) || labelError.message);
            order.status = "LabelFailed";
            order.tags.push(`LabelFailed: ${JSON.stringify(((_b = labelError.response) === null || _b === void 0 ? void 0 : _b.data) || labelError.message)}`);
            yield order.save();
            res.status(500).json({
                success: false,
                message: "Failed to generate shipping label",
                error: ((_c = labelError.response) === null || _c === void 0 ? void 0 : _c.data) || labelError.message,
            });
        }
    }
    catch (error) {
        console.error("Error creating label for order:", error);
        res.status(500).json({ error: error.message || "Failed to create label for order" });
    }
});
exports.createLabelForOrder = createLabelForOrder;
// Get carriers from ShipStation
const getCarriers = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const authToken = buffer_1.Buffer.from(`${process.env.SHIPSTATION_API_KEY}:${process.env.SHIPSTATION_API_SECRET}`).toString("base64");
        console.log(authToken);
        const response = yield axios_1.default.get("https://ssapi.shipstation.com/carriers", {
            headers: {
                Authorization: `Basic ${authToken}`,
            },
        });
        // Return carriers to the frontend
        res.status(200).json({ success: true, carriers: response.data });
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
const getOrdersByUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
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
        // Fetch orders for the given seller
        const orders = yield Order_model_1.default.find({
            "products.seller": sellerId,
        })
            .populate("products.productId", "name price images brand")
            .populate("products.charity", "charityName profileImage _id storefrontId")
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
                buyerId: ((_a = order.buyerId) === null || _a === void 0 ? void 0 : _a._id) || null,
                buyerName: `${((_b = order.buyerId) === null || _b === void 0 ? void 0 : _b.firstName) || "Unknown"} ${((_c = order.buyerId) === null || _c === void 0 ? void 0 : _c.lastName) || ""}`.trim(),
                buyerEmail: ((_d = order.buyerId) === null || _d === void 0 ? void 0 : _d.email) || null,
                buyerProfileImage: ((_e = order.buyerId) === null || _e === void 0 ? void 0 : _e.profileImage) || null,
                productId: ((_f = product.productId) === null || _f === void 0 ? void 0 : _f._id) || null,
                sellerId: ((_g = product.seller) === null || _g === void 0 ? void 0 : _g._id) || null,
                productName: ((_h = product.productId) === null || _h === void 0 ? void 0 : _h.name) || "Unknown Product",
                charityProfit: ((_j = order.products[0]) === null || _j === void 0 ? void 0 : _j.charityProfit) || "Unknown Profit",
                adminFee: ((_k = order.products[0]) === null || _k === void 0 ? void 0 : _k.adminFee) || "Unknown admin fees",
                productBrand: ((_l = product.productId) === null || _l === void 0 ? void 0 : _l.brand) || "Unknown Product",
                productPrice: ((_m = product.productId) === null || _m === void 0 ? void 0 : _m.price) || 0,
                productImages: ((_o = product.productId) === null || _o === void 0 ? void 0 : _o.images) || [],
                quantity: product.quantity,
                totalProductCost: product.totalProductCost,
                charityId: ((_p = product.charity) === null || _p === void 0 ? void 0 : _p._id) || null,
                charityName: ((_q = product.charity) === null || _q === void 0 ? void 0 : _q.charityName) || "Unknown Charity",
                charityProfileImage: ((_r = product.charity) === null || _r === void 0 ? void 0 : _r.profileImage) || null,
                storefrontId: ((_s = product.charity) === null || _s === void 0 ? void 0 : _s.storefrontId) || null,
                orderDate: order.createdAt,
            });
        }));
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
        // Prepare the response data
        const responseData = {
            success: true,
            totalSoldItems: soldItems.length,
            totalSold: currentMonthStats.totalSold,
            totalRevenue: currentMonthStats.totalRevenue,
            changes: statsChanges,
            soldItems,
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
            .populate("products.seller", "firstName lastName email profileImage")
            .populate("products.charity", "charityName profileImage _id storefrontId");
        if (!orders || orders.length === 0) {
            return res.status(404).json({ success: false, message: "No purchases found" });
        }
        // Transform data to include additional details
        const purchaseItems = orders.flatMap(order => order.products.map(product => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
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
                sellerId: ((_g = product.seller) === null || _g === void 0 ? void 0 : _g._id) || null,
                sellerName: `${((_h = product.seller) === null || _h === void 0 ? void 0 : _h.firstName) || "Unknown"} ${((_j = product.seller) === null || _j === void 0 ? void 0 : _j.lastName) || ""}`.trim(),
                sellerEmail: ((_k = product.seller) === null || _k === void 0 ? void 0 : _k.email) || null,
                sellerProfileImage: ((_l = product.seller) === null || _l === void 0 ? void 0 : _l.profileImage) || null,
                charityId: ((_m = product.charity) === null || _m === void 0 ? void 0 : _m._id) || null,
                charityName: ((_o = product.charity) === null || _o === void 0 ? void 0 : _o.charityName) || "Unknown Charity",
                charityProfileImage: ((_p = product.charity) === null || _p === void 0 ? void 0 : _p.profileImage) || null,
                quantity: product.quantity,
                totalProductCost: product.totalProductCost || 0,
                shippingAddress: {
                    name: ((_q = order.shippingAddress) === null || _q === void 0 ? void 0 : _q.name) || "",
                    address: ((_r = order.shippingAddress) === null || _r === void 0 ? void 0 : _r.address) || "",
                    city: ((_s = order.shippingAddress) === null || _s === void 0 ? void 0 : _s.city) || "",
                    country: ((_t = order.shippingAddress) === null || _t === void 0 ? void 0 : _t.country) || "",
                    postcode: ((_u = order.shippingAddress) === null || _u === void 0 ? void 0 : _u.postcode) || "",
                },
                paymentMethod: order.paymentMethod || null,
                orderStatus: order.orderStatus || "Unknown",
                status: order.status || "Unknown",
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
            });
        }));
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
        // Prepare the response data
        const responseData = {
            success: true,
            totalPurchaseItems: purchaseItems.length,
            totalPurchase: currentMonthStats.totalPurchase,
            totalSpend: currentMonthStats.totalSpend,
            changes: statsChanges,
            purchaseItems,
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
const getTotalSoldItems = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { sellerId } = req.params;
    try {
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
        res.status(200).json({
            success: true,
            totalQuantity: totalDetails.totalQuantity,
            totalRevenue: totalDetails.totalRevenue,
            items: totalDetails.items,
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
    const { userId } = req.params;
    try {
        // Fetch orders placed by the buyer
        const orders = yield Order_model_1.default.find({ buyerId: userId })
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
// Update Order Status to ItemShipped
const updateOrderStatusToShipped = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { orderId } = req.params;
    const { trackingNumber, carrierCode, labelId, serviceCode, orderStatus } = req.body;
    try {
        // Validate the input
        if (!trackingNumber) {
            return res.status(400).json({ error: "Tracking number is required" });
        }
        // Find and update the order
        const order = yield Order_model_1.default.findById(orderId);
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
        yield order.save();
        res.status(200).json({
            success: true,
            message: "Order status updated to ItemShipped",
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
const getTotalSalesStats = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Find all completed orders
        const orders = yield Order_model_1.default.find({ status: { $in: ["Delivered", "OrderConfirmed", "OrderPlaced"] } });
        // Aggregate statistics
        const stats = orders.reduce((acc, order) => {
            order.products.forEach(product => {
                var _a, _b, _c, _d, _e;
                // Increment total sold quantity and revenue
                acc.totalProductsSold += product.quantity;
                acc.totalRevenue += product.totalProductCost;
                // Collect product details for a breakdown
                acc.productDetails.push({
                    productId: ((_a = product.productId) === null || _a === void 0 ? void 0 : _a._id) || null,
                    productName: ((_b = product.productId) === null || _b === void 0 ? void 0 : _b.name) || "Unknown Product",
                    quantitySold: product.quantity,
                    totalRevenueGenerated: product.totalProductCost,
                    sellerId: ((_c = product.seller) === null || _c === void 0 ? void 0 : _c._id) || null,
                    sellerName: product.seller
                        ? `${product.seller.firstName} ${product.seller.lastName}`
                        : "Unknown Seller",
                    charityId: ((_d = product.charity) === null || _d === void 0 ? void 0 : _d._id) || null,
                    charityName: ((_e = product.charity) === null || _e === void 0 ? void 0 : _e.charityName) || "Unknown Charity",
                    status: order.status,
                    createdAt: order.createdAt,
                });
            });
            return acc;
        }, {
            totalProductsSold: 0, // Total products sold
            totalRevenue: 0, // Total revenue generated
            productDetails: [], // Breakdown of product sales
        });
        res.status(200).json({
            success: true,
            totalProductsSold: stats.totalProductsSold,
            totalRevenue: stats.totalRevenue,
            productDetails: stats.productDetails,
        });
    }
    catch (error) {
        console.error("Error fetching sales stats:", error);
        res.status(500).json({ error: "Failed to fetch sales statistics" });
    }
});
exports.getTotalSalesStats = getTotalSalesStats;
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
