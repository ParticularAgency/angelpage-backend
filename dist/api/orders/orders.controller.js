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
exports.getOrderById = exports.getCarriers = exports.updateOrderStatusToDelivered = exports.updateOrderStatusToShipped = exports.getAllOrdersForSeller = exports.getBuyerPurchases = exports.getTotalSoldItems = exports.getPurchaseItems = exports.getSoldItems = exports.getOrdersByUser = exports.createOrder = void 0;
const Order_model_1 = __importDefault(require("../../models/Order.model"));
const Cart_model_1 = __importDefault(require("../../models/Cart.model"));
const shipstation_1 = require("../../utils/shipstation");
// Create a new order
const createOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { buyerId, products, shippingAddress, paymentMethod,
    // carrierCode,
    // serviceCode
     } = req.body;
    try {
        if (!buyerId ||
            !products ||
            products.length === 0 ||
            !shippingAddress ||
            !paymentMethod) {
            return res.status(400).json({ error: "Invalid order details" });
        }
        const enrichedProducts = products.map((product) => {
            if (!product.productId ||
                !product.charity ||
                !product.name ||
                !product.price ||
                !product.quantity) {
                throw new Error(`Missing required product data: ${JSON.stringify(product)}`);
            }
            const totalCost = product.price * product.quantity;
            const charityProfit = totalCost * 0.9;
            const adminFee = totalCost * 0.1;
            return Object.assign(Object.assign({}, product), { seller: product.seller || null, totalProductCost: totalCost, charityProfit,
                adminFee });
        });
        const totalAmount = enrichedProducts.reduce((sum, product) => sum + product.totalProductCost, 0);
        // Create a new order in the database
        const newOrder = new Order_model_1.default({
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
        yield newOrder.save();
        // Clear the cart for the user after successful order creation
        yield Cart_model_1.default.findOneAndUpdate({ userId: buyerId }, { items: [] });
        // // Create a shipment in ShipStation
        // const shipmentData = {
        // 	// carrierCode,
        // 	// serviceCode,
        // 	packageCode: "package", // Adjust as needed
        // 	confirmation: "delivery",
        // 	shipDate: new Date().toISOString().split("T")[0],
        // 	weight: { value: 1, units: "ounces" }, // Example weight
        // 	dimensions: { units: "inches", length: 10, width: 5, height: 5 }, // Example dimensions
        // 	shipFrom: {
        // 		name: "Your Company",
        // 		address1: "123 Warehouse St",
        // 		city: "YourCity",
        // 		state: "YourState",
        // 		postalCode: "12345",
        // 		country: "US",
        // 	},
        // 	shipTo: shippingAddress,
        // };
        // const shipStationResponse = await shipStationClient.createLabel(
        // 	shipmentData,
        // );
        // // Update the order with shipping details
        // newOrder.trackingNumber = shipStationResponse.trackingNumber;
        // newOrder.labelId = shipStationResponse.labelId;
        // newOrder.labelUrl = shipStationResponse.labelUrl;
        // newOrder.packageInfo = shipStationResponse.packageInfo;
        // newOrder.pickupInfo = shipStationResponse.pickupInfo;
        // newOrder.status = "LabelCreated";
        // await newOrder.save();
        res.status(201).json({
            success: true,
            message: "Order created successfully",
            order: newOrder,
        });
    }
    catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ error: error.message || "Failed to create order" });
    }
});
exports.createOrder = createOrder;
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
        // Find all orders containing products sold by the given seller
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
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
            return ({
                orderId: order._id,
                status: order.status,
                orderStatus: order.orderStatus,
                buyerId: ((_a = order.buyerId) === null || _a === void 0 ? void 0 : _a._id) || null,
                buyerName: `${((_b = order.buyerId) === null || _b === void 0 ? void 0 : _b.firstName) || "Unknown"} ${((_c = order.buyerId) === null || _c === void 0 ? void 0 : _c.lastName) || ""}`.trim(),
                buyerEmail: ((_d = order.buyerId) === null || _d === void 0 ? void 0 : _d.email) || null,
                buyerProfileImage: ((_e = order.buyerId) === null || _e === void 0 ? void 0 : _e.profileImage) || null,
                productId: ((_f = product.productId) === null || _f === void 0 ? void 0 : _f._id) || null,
                productName: ((_g = product.productId) === null || _g === void 0 ? void 0 : _g.name) || "Unknown Product",
                charityProfit: ((_h = order.products[0]) === null || _h === void 0 ? void 0 : _h.charityProfit) || "Unknown Profit",
                adminFee: ((_j = order.products[0]) === null || _j === void 0 ? void 0 : _j.adminFee) || "Unknown admin fees",
                productBrand: ((_k = product.productId) === null || _k === void 0 ? void 0 : _k.brand) || "Unknown Product",
                productPrice: ((_l = product.productId) === null || _l === void 0 ? void 0 : _l.price) || 0,
                productImages: ((_m = product.productId) === null || _m === void 0 ? void 0 : _m.images) || [],
                quantity: product.quantity,
                totalProductCost: product.totalProductCost,
                charityId: ((_o = product.charity) === null || _o === void 0 ? void 0 : _o._id) || null,
                charityName: ((_p = product.charity) === null || _p === void 0 ? void 0 : _p.charityName) || "Unknown Charity",
                charityProfileImage: ((_q = product.charity) === null || _q === void 0 ? void 0 : _q.profileImage) || null,
                storefrontId: ((_r = product.charity) === null || _r === void 0 ? void 0 : _r.storefrontId) || null,
                orderDate: order.createdAt,
            });
        }));
        res.status(200).json({
            success: true,
            totalSoldItems: soldItems.length,
            soldItems,
        });
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
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
            return ({
                orderId: order._id,
                buyerId: order.buyerId,
                buyerName: `${((_a = order.shippingAddress) === null || _a === void 0 ? void 0 : _a.name) || "Unknown Buyer"}`,
                productId: ((_b = product.productId) === null || _b === void 0 ? void 0 : _b._id) || null,
                productName: ((_c = product.productId) === null || _c === void 0 ? void 0 : _c.name) || product.name || "Unknown Product",
                productPrice: ((_d = product.productId) === null || _d === void 0 ? void 0 : _d.price) || product.price || 0,
                charityProfit: product.charityProfit || 0,
                adminFee: product.adminFee || 0,
                productImages: ((_e = product.productId) === null || _e === void 0 ? void 0 : _e.images) || [],
                sellerId: ((_f = product.seller) === null || _f === void 0 ? void 0 : _f._id) || null,
                sellerName: `${((_g = product.seller) === null || _g === void 0 ? void 0 : _g.firstName) || "Unknown"} ${((_h = product.seller) === null || _h === void 0 ? void 0 : _h.lastName) || ""}`.trim(),
                sellerEmail: ((_j = product.seller) === null || _j === void 0 ? void 0 : _j.email) || null,
                sellerProfileImage: ((_k = product.seller) === null || _k === void 0 ? void 0 : _k.profileImage) || null,
                charityId: ((_l = product.charity) === null || _l === void 0 ? void 0 : _l._id) || null,
                charityName: ((_m = product.charity) === null || _m === void 0 ? void 0 : _m.charityName) || "Unknown Charity",
                charityProfileImage: ((_o = product.charity) === null || _o === void 0 ? void 0 : _o.profileImage) || null,
                quantity: product.quantity,
                totalProductCost: product.totalProductCost || 0,
                shippingAddress: {
                    name: ((_p = order.shippingAddress) === null || _p === void 0 ? void 0 : _p.name) || "",
                    address: ((_q = order.shippingAddress) === null || _q === void 0 ? void 0 : _q.address) || "",
                    city: ((_r = order.shippingAddress) === null || _r === void 0 ? void 0 : _r.city) || "",
                    country: ((_s = order.shippingAddress) === null || _s === void 0 ? void 0 : _s.country) || "",
                    postcode: ((_t = order.shippingAddress) === null || _t === void 0 ? void 0 : _t.postcode) || "",
                },
                paymentMethod: order.paymentMethod || null,
                orderStatus: order.orderStatus || "Unknown",
                status: order.status || "Unknown",
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
            });
        }));
        res.status(200).json({
            success: true,
            totalPurchaseItems: purchaseItems.length,
            purchaseItems,
        });
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
                var _a, _b, _c, _d, _e, _f, _g, _h;
                // Increment total quantity and revenue
                acc.totalQuantity += product.quantity;
                acc.totalRevenue += product.totalProductCost;
                // Add each product to the items list with details
                acc.items.push({
                    orderId: order._id,
                    buyerId: order.buyerId,
                    productId: ((_a = product.productId) === null || _a === void 0 ? void 0 : _a._id) || null,
                    productName: ((_b = product.productId) === null || _b === void 0 ? void 0 : _b.name) || "Unknown Product",
                    sellerId: ((_c = product.seller) === null || _c === void 0 ? void 0 : _c._id) || null,
                    sellerName: `${((_d = product.seller) === null || _d === void 0 ? void 0 : _d.firstName) || "Unknown"} ${((_e = product.seller) === null || _e === void 0 ? void 0 : _e.lastName) || ""}`.trim(),
                    quantity: product.quantity,
                    itemPrice: ((_f = product.productId) === null || _f === void 0 ? void 0 : _f.price) || 0,
                    totalProductCost: product.totalProductCost,
                    charityId: ((_g = product.charity) === null || _g === void 0 ? void 0 : _g._id) || null,
                    charityName: ((_h = product.charity) === null || _h === void 0 ? void 0 : _h.charityName) || "Unknown Charity",
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
const getCarriers = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const response = yield shipstation_1.shipStationClient.get("/carriers");
        res.status(200).json({ success: true, carriers: response.data });
    }
    catch (error) {
        console.error("Error fetching carriers:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        res
            .status(500)
            .json({
            error: "Failed to fetch carriers",
            details: ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message,
        });
    }
});
exports.getCarriers = getCarriers;
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
