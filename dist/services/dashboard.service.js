"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emptyPurchaseResponse = exports.buildChanges = exports.buildYearlyChart = exports.buildMonthlyChart = exports.buildWeeklyChart = exports.buildPeriodRanges = exports.groupChartData = exports.calculateBuyerStats = exports.calculateSellerStats = exports.buildOrderStatusSummary = exports.calculatePercentageChange = void 0;
const date_fns_1 = require("date-fns");
const calculatePercentageChange = (current, previous) => {
    if (previous === 0)
        return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(2));
};
exports.calculatePercentageChange = calculatePercentageChange;
const buildOrderStatusSummary = (orders, sellerId = null) => {
    const summary = {
        total: orders.length,
        pending: 0,
        confirmed: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        paymentPending: 0,
        paymentPaid: 0,
        paymentFailed: 0,
    };
    orders.forEach((order) => {
        const status = (order.status || "").toLowerCase();
        const paymentStatus = (order.paymentStatus || "").toLowerCase();
        if (status.includes("deliver"))
            summary.delivered += 1;
        else if (status.includes("ship"))
            summary.shipped += 1;
        else if (status.includes("confirm"))
            summary.confirmed += 1;
        else if (status.includes("cancel"))
            summary.cancelled += 1;
        else
            summary.pending += 1;
        if (paymentStatus === "paid")
            summary.paymentPaid += 1;
        else if (paymentStatus === "failed")
            summary.paymentFailed += 1;
        else
            summary.paymentPending += 1;
    });
    if (sellerId) {
        let lineItems = 0;
        orders.forEach((order) => {
            var _a;
            (_a = order.products) === null || _a === void 0 ? void 0 : _a.forEach((product) => {
                var _a;
                if (((_a = product.seller) === null || _a === void 0 ? void 0 : _a.toString()) === sellerId.toString()) {
                    lineItems += product.quantity || 0;
                }
            });
        });
        summary.itemsSold = lineItems;
    }
    return summary;
};
exports.buildOrderStatusSummary = buildOrderStatusSummary;
const calculateSellerStats = (orders, sellerId, rangeStart, rangeEnd) => {
    let totalSold = 0;
    let totalRevenue = 0;
    let charityProfit = 0;
    const filteredOrders = orders.filter((order) => order.createdAt >= rangeStart && order.createdAt < rangeEnd);
    filteredOrders.forEach((order) => {
        order.products.forEach((product) => {
            var _a;
            if (((_a = product.seller) === null || _a === void 0 ? void 0 : _a.toString()) === sellerId.toString()) {
                totalSold += product.quantity || 0;
                totalRevenue += product.totalProductCost || 0;
                charityProfit += product.charityProfit || 0;
            }
        });
    });
    return { totalSold, totalRevenue, charityProfit };
};
exports.calculateSellerStats = calculateSellerStats;
const calculateBuyerStats = (orders, rangeStart, rangeEnd) => {
    let totalPurchase = 0;
    let totalSpend = 0;
    const filteredOrders = orders.filter((order) => order.createdAt >= rangeStart && order.createdAt < rangeEnd);
    filteredOrders.forEach((order) => {
        order.products.forEach((product) => {
            totalPurchase += product.quantity || 0;
            totalSpend += product.totalProductCost || 0;
        });
    });
    return { totalPurchase, totalSpend };
};
exports.calculateBuyerStats = calculateBuyerStats;
const groupChartData = (orders, start, end, periodLabel, sellerId = null) => {
    const filteredOrders = orders.filter((order) => order.createdAt >= start && order.createdAt <= end);
    let totalSold = 0;
    let totalRevenue = 0;
    filteredOrders.forEach((order) => {
        order.products.forEach((product) => {
            var _a;
            if (sellerId) {
                if (((_a = product.seller) === null || _a === void 0 ? void 0 : _a.toString()) !== sellerId.toString())
                    return;
            }
            totalSold += product.quantity || 0;
            totalRevenue += product.totalProductCost || 0;
        });
    });
    return { revenue: totalRevenue, orders: totalSold, label: periodLabel };
};
exports.groupChartData = groupChartData;
const buildPeriodRanges = () => {
    const now = new Date();
    return {
        now,
        weekStart: (0, date_fns_1.startOfWeek)(now, { weekStartsOn: 1 }),
        prevWeekStart: (0, date_fns_1.subWeeks)((0, date_fns_1.startOfWeek)(now, { weekStartsOn: 1 }), 1),
        monthStart: (0, date_fns_1.startOfMonth)(now),
        prevMonthStart: (0, date_fns_1.subMonths)((0, date_fns_1.startOfMonth)(now), 1),
        yearStart: (0, date_fns_1.startOfYear)(now),
        prevYearStart: (0, date_fns_1.subYears)((0, date_fns_1.startOfYear)(now), 1),
        currentWeekStart: (0, date_fns_1.startOfWeek)(now, { weekStartsOn: 1 }),
        currentMonthStart: (0, date_fns_1.startOfMonth)(now),
        currentYearStart: (0, date_fns_1.startOfYear)(now),
    };
};
exports.buildPeriodRanges = buildPeriodRanges;
const buildWeeklyChart = (orders, currentWeekStart, sellerId = null) => {
    const weeklyData = [];
    for (let i = 4; i >= 0; i--) {
        const weekStart = (0, date_fns_1.subWeeks)(currentWeekStart, i);
        const weekEnd = (0, date_fns_1.endOfWeek)(weekStart);
        weeklyData.push((0, exports.groupChartData)(orders, weekStart, weekEnd, `Week ${5 - i}`, sellerId));
    }
    return weeklyData;
};
exports.buildWeeklyChart = buildWeeklyChart;
const buildMonthlyChart = (orders, currentMonthStart, sellerId = null) => {
    const monthlyData = [];
    for (let i = 0; i < 12; i++) {
        const monthStart = (0, date_fns_1.startOfMonth)((0, date_fns_1.subMonths)(currentMonthStart, i));
        const monthEnd = (0, date_fns_1.endOfMonth)(monthStart);
        monthlyData.unshift((0, exports.groupChartData)(orders, monthStart, monthEnd, monthStart.toLocaleString("default", { month: "short" }), sellerId));
    }
    return monthlyData;
};
exports.buildMonthlyChart = buildMonthlyChart;
const buildYearlyChart = (orders, currentYearStart, sellerId = null) => {
    const yearlyData = [];
    for (let i = 0; i < 5; i++) {
        const yearStart = (0, date_fns_1.startOfYear)((0, date_fns_1.subYears)(currentYearStart, i));
        const yearEnd = (0, date_fns_1.endOfYear)(yearStart);
        yearlyData.unshift((0, exports.groupChartData)(orders, yearStart, yearEnd, yearStart.getFullYear().toString(), sellerId));
    }
    return yearlyData;
};
exports.buildYearlyChart = buildYearlyChart;
const buildChanges = (current, previous, soldKey, revenueKey) => ({
    weekly: {
        [soldKey]: (0, exports.calculatePercentageChange)(current.week.sold, previous.week.sold),
        [revenueKey]: (0, exports.calculatePercentageChange)(current.week.revenue, previous.week.revenue),
    },
    monthly: {
        [soldKey]: (0, exports.calculatePercentageChange)(current.month.sold, previous.month.sold),
        [revenueKey]: (0, exports.calculatePercentageChange)(current.month.revenue, previous.month.revenue),
    },
    yearly: {
        [soldKey]: (0, exports.calculatePercentageChange)(current.year.sold, previous.year.sold),
        [revenueKey]: (0, exports.calculatePercentageChange)(current.year.revenue, previous.year.revenue),
    },
});
exports.buildChanges = buildChanges;
const emptyPurchaseResponse = () => ({
    success: true,
    totalPurchaseItems: 0,
    totalPurchase: 0,
    totalSpend: 0,
    changes: {
        weekly: { purchaseChange: 0, spendChange: 0 },
        monthly: { purchaseChange: 0, spendChange: 0 },
        yearly: { purchaseChange: 0, spendChange: 0 },
    },
    purchaseItems: [],
    weeklyData: [],
    monthlyData: [],
    yearlyData: [],
    statusSummary: {
        total: 0,
        pending: 0,
        confirmed: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        paymentPending: 0,
        paymentPaid: 0,
        paymentFailed: 0,
    },
});
exports.emptyPurchaseResponse = emptyPurchaseResponse;
