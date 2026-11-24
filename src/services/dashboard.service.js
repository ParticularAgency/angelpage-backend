import {
	startOfWeek,
	subWeeks,
	startOfMonth,
	subMonths,
	startOfYear,
	subYears,
	endOfWeek,
	endOfMonth,
	endOfYear,
} from "date-fns";

export const calculatePercentageChange = (current, previous) => {
	if (previous === 0) return current > 0 ? 100 : 0;
	return Number((((current - previous) / previous) * 100).toFixed(2));
};

export const buildOrderStatusSummary = (orders, sellerId = null) => {
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

		if (status.includes("deliver")) summary.delivered += 1;
		else if (status.includes("ship")) summary.shipped += 1;
		else if (status.includes("confirm")) summary.confirmed += 1;
		else if (status.includes("cancel")) summary.cancelled += 1;
		else summary.pending += 1;

		if (paymentStatus === "paid") summary.paymentPaid += 1;
		else if (paymentStatus === "failed") summary.paymentFailed += 1;
		else summary.paymentPending += 1;
	});

	if (sellerId) {
		let lineItems = 0;
		orders.forEach((order) => {
			order.products?.forEach((product) => {
				if (product.seller?.toString() === sellerId.toString()) {
					lineItems += product.quantity || 0;
				}
			});
		});
		summary.itemsSold = lineItems;
	}

	return summary;
};

export const calculateSellerStats = (orders, sellerId, rangeStart, rangeEnd) => {
	let totalSold = 0;
	let totalRevenue = 0;
	let charityProfit = 0;

	const filteredOrders = orders.filter(
		(order) => order.createdAt >= rangeStart && order.createdAt < rangeEnd,
	);

	filteredOrders.forEach((order) => {
		order.products.forEach((product) => {
			if (product.seller?.toString() === sellerId.toString()) {
				totalSold += product.quantity || 0;
				totalRevenue += product.totalProductCost || 0;
				charityProfit += product.charityProfit || 0;
			}
		});
	});

	return { totalSold, totalRevenue, charityProfit };
};

export const calculateBuyerStats = (orders, rangeStart, rangeEnd) => {
	let totalPurchase = 0;
	let totalSpend = 0;

	const filteredOrders = orders.filter(
		(order) => order.createdAt >= rangeStart && order.createdAt < rangeEnd,
	);

	filteredOrders.forEach((order) => {
		order.products.forEach((product) => {
			totalPurchase += product.quantity || 0;
			totalSpend += product.totalProductCost || 0;
		});
	});

	return { totalPurchase, totalSpend };
};

export const groupChartData = (orders, start, end, periodLabel, sellerId = null) => {
	const filteredOrders = orders.filter(
		(order) => order.createdAt >= start && order.createdAt <= end,
	);

	let totalSold = 0;
	let totalRevenue = 0;

	filteredOrders.forEach((order) => {
		order.products.forEach((product) => {
			if (sellerId) {
				if (product.seller?.toString() !== sellerId.toString()) return;
			}
			totalSold += product.quantity || 0;
			totalRevenue += product.totalProductCost || 0;
		});
	});

	return { revenue: totalRevenue, orders: totalSold, label: periodLabel };
};

export const buildPeriodRanges = () => {
	const now = new Date();
	return {
		now,
		weekStart: startOfWeek(now, { weekStartsOn: 1 }),
		prevWeekStart: subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 1),
		monthStart: startOfMonth(now),
		prevMonthStart: subMonths(startOfMonth(now), 1),
		yearStart: startOfYear(now),
		prevYearStart: subYears(startOfYear(now), 1),
		currentWeekStart: startOfWeek(now, { weekStartsOn: 1 }),
		currentMonthStart: startOfMonth(now),
		currentYearStart: startOfYear(now),
	};
};

export const buildWeeklyChart = (orders, currentWeekStart, sellerId = null) => {
	const weeklyData = [];
	for (let i = 4; i >= 0; i--) {
		const weekStart = subWeeks(currentWeekStart, i);
		const weekEnd = endOfWeek(weekStart);
		weeklyData.push(
			groupChartData(orders, weekStart, weekEnd, `Week ${5 - i}`, sellerId),
		);
	}
	return weeklyData;
};

export const buildMonthlyChart = (orders, currentMonthStart, sellerId = null) => {
	const monthlyData = [];
	for (let i = 0; i < 12; i++) {
		const monthStart = startOfMonth(subMonths(currentMonthStart, i));
		const monthEnd = endOfMonth(monthStart);
		monthlyData.unshift(
			groupChartData(
				orders,
				monthStart,
				monthEnd,
				monthStart.toLocaleString("default", { month: "short" }),
				sellerId,
			),
		);
	}
	return monthlyData;
};

export const buildYearlyChart = (orders, currentYearStart, sellerId = null) => {
	const yearlyData = [];
	for (let i = 0; i < 5; i++) {
		const yearStart = startOfYear(subYears(currentYearStart, i));
		const yearEnd = endOfYear(yearStart);
		yearlyData.unshift(
			groupChartData(
				orders,
				yearStart,
				yearEnd,
				yearStart.getFullYear().toString(),
				sellerId,
			),
		);
	}
	return yearlyData;
};

export const buildChanges = (current, previous, soldKey, revenueKey) => ({
	weekly: {
		[soldKey]: calculatePercentageChange(current.week.sold, previous.week.sold),
		[revenueKey]: calculatePercentageChange(
			current.week.revenue,
			previous.week.revenue,
		),
	},
	monthly: {
		[soldKey]: calculatePercentageChange(current.month.sold, previous.month.sold),
		[revenueKey]: calculatePercentageChange(
			current.month.revenue,
			previous.month.revenue,
		),
	},
	yearly: {
		[soldKey]: calculatePercentageChange(current.year.sold, previous.year.sold),
		[revenueKey]: calculatePercentageChange(
			current.year.revenue,
			previous.year.revenue,
		),
	},
});

export const emptyPurchaseResponse = () => ({
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
