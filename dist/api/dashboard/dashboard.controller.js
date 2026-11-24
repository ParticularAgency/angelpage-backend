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
exports.exportUserOrdersCsv = exports.getUserEarnings = exports.getDashboardOverview = void 0;
const Order_model_1 = __importDefault(require("../../models/Order.model"));
const Message_model_1 = __importDefault(require("../../models/Message.model"));
const Conversation_model_1 = __importDefault(require("../../models/Conversation.model"));
const Product_model_1 = __importDefault(require("../../models/Product.model"));
const User_model_1 = __importDefault(require("../../models/User.model"));
const Charity_model_1 = __importDefault(require("../../models/Charity.model"));
const dashboard_service_1 = require("../../services/dashboard.service");
const getPeriodStats = (orders, sellerId, ranges, mode = "seller") => {
    const calc = mode === "seller"
        ? (start, end) => (0, dashboard_service_1.calculateSellerStats)(orders, sellerId, start, end)
        : (start, end) => (0, dashboard_service_1.calculateBuyerStats)(orders, start, end);
    const week = calc(ranges.weekStart, ranges.now);
    const prevWeek = calc(ranges.prevWeekStart, ranges.weekStart);
    const month = calc(ranges.monthStart, ranges.now);
    const prevMonth = calc(ranges.prevMonthStart, ranges.monthStart);
    const year = calc(ranges.yearStart, ranges.now);
    const prevYear = calc(ranges.prevYearStart, ranges.yearStart);
    const mapStats = (stats) => {
        var _a, _b, _c, _d, _e;
        return ({
            sold: (_b = (_a = stats.totalSold) !== null && _a !== void 0 ? _a : stats.totalPurchase) !== null && _b !== void 0 ? _b : 0,
            revenue: (_d = (_c = stats.totalRevenue) !== null && _c !== void 0 ? _c : stats.totalSpend) !== null && _d !== void 0 ? _d : 0,
            charityProfit: (_e = stats.charityProfit) !== null && _e !== void 0 ? _e : 0,
        });
    };
    return {
        current: { week: mapStats(week), month: mapStats(month), year: mapStats(year) },
        previous: {
            week: mapStats(prevWeek),
            month: mapStats(prevMonth),
            year: mapStats(prevYear),
        },
    };
};
const getRecentActivity = (orders, limit = 5) => orders
    .slice(0, limit)
    .map((order) => {
    var _a, _b, _c, _d, _e, _f;
    return ({
        id: order._id,
        status: order.status,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        totalAmount: order.grandTotal || order.totalAmount,
        createdAt: order.createdAt,
        itemCount: ((_a = order.products) === null || _a === void 0 ? void 0 : _a.length) || 0,
        productName: ((_d = (_c = (_b = order.products) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.productId) === null || _d === void 0 ? void 0 : _d.name) || ((_f = (_e = order.products) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.name),
    });
});
const getDashboardOverview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    const role = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
    const period = (req.query.period || "month").toLowerCase();
    if (!userId || !role) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    try {
        const ranges = (0, dashboard_service_1.buildPeriodRanges)();
        const [sellerOrders, buyerOrders, unreadMessages, conversations, profile] = yield Promise.all([
            Order_model_1.default.find({ "products.seller": userId })
                .populate("products.productId", "name images")
                .sort({ createdAt: -1 }),
            Order_model_1.default.find({ buyerId: userId })
                .populate("products.productId", "name images")
                .sort({ createdAt: -1 }),
            Message_model_1.default.countDocuments({ recipient: userId, status: "unread" }),
            Conversation_model_1.default.countDocuments({ "participants.participantId": userId }),
            role === "CHARITY"
                ? Charity_model_1.default.findById(userId).select("totalEarned totalHeldFunds listedProducts charityName")
                : User_model_1.default.findById(userId).select("listedProducts firstName lastName"),
        ]);
        const sellerPeriod = getPeriodStats(sellerOrders, userId, ranges, "seller");
        const buyerPeriod = getPeriodStats(buyerOrders, userId, ranges, "buyer");
        const sellerChanges = (0, dashboard_service_1.buildChanges)({
            week: { sold: sellerPeriod.current.week.sold, revenue: sellerPeriod.current.week.revenue },
            month: { sold: sellerPeriod.current.month.sold, revenue: sellerPeriod.current.month.revenue },
            year: { sold: sellerPeriod.current.year.sold, revenue: sellerPeriod.current.year.revenue },
        }, {
            week: { sold: sellerPeriod.previous.week.sold, revenue: sellerPeriod.previous.week.revenue },
            month: { sold: sellerPeriod.previous.month.sold, revenue: sellerPeriod.previous.month.revenue },
            year: { sold: sellerPeriod.previous.year.sold, revenue: sellerPeriod.previous.year.revenue },
        }, "soldChange", "revenueChange");
        const buyerChanges = (0, dashboard_service_1.buildChanges)({
            week: { sold: buyerPeriod.current.week.sold, revenue: buyerPeriod.current.week.revenue },
            month: { sold: buyerPeriod.current.month.sold, revenue: buyerPeriod.current.month.revenue },
            year: { sold: buyerPeriod.current.year.sold, revenue: buyerPeriod.current.year.revenue },
        }, {
            week: { sold: buyerPeriod.previous.week.sold, revenue: buyerPeriod.previous.week.revenue },
            month: { sold: buyerPeriod.previous.month.sold, revenue: buyerPeriod.previous.month.revenue },
            year: { sold: buyerPeriod.previous.year.sold, revenue: buyerPeriod.previous.year.revenue },
        }, "purchaseChange", "spendChange");
        const periodKey = period === "week" ? "week" : period === "year" ? "year" : "month";
        const liveListings = yield Product_model_1.default.countDocuments({
            $or: [{ seller: userId }, { charity: userId }],
            status: "LIVE",
            isArchived: false,
        });
        res.status(200).json({
            success: true,
            role,
            period: periodKey,
            seller: {
                revenue: sellerPeriod.current[periodKey].revenue,
                itemsSold: sellerPeriod.current[periodKey].sold,
                charityProfit: sellerPeriod.current[periodKey].charityProfit,
                changes: sellerChanges,
                statusSummary: (0, dashboard_service_1.buildOrderStatusSummary)(sellerOrders, userId),
                weeklyData: (0, dashboard_service_1.buildWeeklyChart)(sellerOrders, ranges.currentWeekStart, userId),
                monthlyData: (0, dashboard_service_1.buildMonthlyChart)(sellerOrders, ranges.currentMonthStart, userId),
                yearlyData: (0, dashboard_service_1.buildYearlyChart)(sellerOrders, ranges.currentYearStart, userId),
                recentActivity: getRecentActivity(sellerOrders),
            },
            buyer: {
                itemsBought: buyerPeriod.current[periodKey].sold,
                moneySpent: buyerPeriod.current[periodKey].revenue,
                changes: buyerChanges,
                statusSummary: (0, dashboard_service_1.buildOrderStatusSummary)(buyerOrders),
                weeklyData: (0, dashboard_service_1.buildWeeklyChart)(buyerOrders, ranges.currentWeekStart),
                monthlyData: (0, dashboard_service_1.buildMonthlyChart)(buyerOrders, ranges.currentMonthStart),
                yearlyData: (0, dashboard_service_1.buildYearlyChart)(buyerOrders, ranges.currentYearStart),
                recentActivity: getRecentActivity(buyerOrders),
            },
            messaging: {
                unreadCount: unreadMessages,
                conversationCount: conversations,
            },
            listings: {
                live: liveListings,
                total: ((_c = profile === null || profile === void 0 ? void 0 : profile.listedProducts) === null || _c === void 0 ? void 0 : _c.length) || 0,
            },
            charityFunds: role === "CHARITY"
                ? {
                    totalEarned: (profile === null || profile === void 0 ? void 0 : profile.totalEarned) || 0,
                    totalHeldFunds: (profile === null || profile === void 0 ? void 0 : profile.totalHeldFunds) || 0,
                }
                : null,
        });
    }
    catch (error) {
        console.error("Dashboard overview error:", error);
        res.status(500).json({ success: false, message: "Failed to load dashboard" });
    }
});
exports.getDashboardOverview = getDashboardOverview;
const getUserEarnings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    try {
        const orders = yield Order_model_1.default.find({
            paymentStatus: "Paid",
            "products.seller": userId,
        }).sort({ createdAt: -1 });
        let totalEarned = 0;
        let pendingEscrow = 0;
        let releasedEscrow = 0;
        let disputedAmount = 0;
        orders.forEach(order => {
            const sellerTotal = order.products
                .filter(p => { var _a; return ((_a = p.seller) === null || _a === void 0 ? void 0 : _a.toString()) === userId; })
                .reduce((sum, p) => sum + (p.totalProductCost || 0), 0);
            totalEarned += sellerTotal;
            if (order.escrowStatus === "HELD")
                pendingEscrow += sellerTotal;
            if (order.escrowStatus === "RELEASED")
                releasedEscrow += sellerTotal;
            if (order.disputeStatus === "OPEN")
                disputedAmount += sellerTotal;
        });
        res.status(200).json({
            success: true,
            totalEarned,
            pendingEscrow,
            releasedEscrow,
            disputedAmount,
            orderCount: orders.length,
            recentOrders: orders.slice(0, 10).map(o => ({
                id: o._id,
                amount: o.grandTotal,
                escrowStatus: o.escrowStatus,
                disputeStatus: o.disputeStatus,
                status: o.status,
                createdAt: o.createdAt,
            })),
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to load earnings" });
    }
});
exports.getUserEarnings = getUserEarnings;
const exportUserOrdersCsv = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    const { mode = "sold" } = req.query;
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const query = mode === "bought"
            ? { buyerId: userId, paymentStatus: "Paid" }
            : { "products.seller": userId, paymentStatus: "Paid" };
        const orders = yield Order_model_1.default.find(query).sort({ createdAt: -1 }).limit(2000);
        const header = "orderId,status,paymentStatus,grandTotal,escrowStatus,disputeStatus,createdAt\n";
        const rows = orders.map(o => {
            var _a, _b, _c;
            return [
                o._id,
                o.status,
                o.paymentStatus,
                ((_a = o.grandTotal) === null || _a === void 0 ? void 0 : _a.toFixed(2)) || "0",
                o.escrowStatus || "",
                o.disputeStatus || "NONE",
                ((_c = (_b = o.createdAt) === null || _b === void 0 ? void 0 : _b.toISOString) === null || _c === void 0 ? void 0 : _c.call(_b)) || "",
            ].join(",");
        });
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=${mode}-orders-export.csv`);
        res.send(header + rows.join("\n"));
    }
    catch (error) {
        res.status(500).json({ message: "Export failed" });
    }
});
exports.exportUserOrdersCsv = exportUserOrdersCsv;
