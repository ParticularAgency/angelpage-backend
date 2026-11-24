import Order from "../../models/Order.model";
import Message from "../../models/Message.model";
import Conversation from "../../models/Conversation.model";
import Product from "../../models/Product.model";
import User from "../../models/User.model";
import Charity from "../../models/Charity.model";
import {
	buildPeriodRanges,
	calculateSellerStats,
	calculateBuyerStats,
	buildOrderStatusSummary,
	buildWeeklyChart,
	buildMonthlyChart,
	buildYearlyChart,
	buildChanges,
	emptyPurchaseResponse,
} from "../../services/dashboard.service";

const getPeriodStats = (orders, sellerId, ranges, mode = "seller") => {
	const calc =
		mode === "seller"
			? (start, end) => calculateSellerStats(orders, sellerId, start, end)
			: (start, end) => calculateBuyerStats(orders, start, end);

	const week = calc(ranges.weekStart, ranges.now);
	const prevWeek = calc(ranges.prevWeekStart, ranges.weekStart);
	const month = calc(ranges.monthStart, ranges.now);
	const prevMonth = calc(ranges.prevMonthStart, ranges.monthStart);
	const year = calc(ranges.yearStart, ranges.now);
	const prevYear = calc(ranges.prevYearStart, ranges.yearStart);

	const mapStats = (stats) => ({
		sold: stats.totalSold ?? stats.totalPurchase ?? 0,
		revenue: stats.totalRevenue ?? stats.totalSpend ?? 0,
		charityProfit: stats.charityProfit ?? 0,
	});

	return {
		current: { week: mapStats(week), month: mapStats(month), year: mapStats(year) },
		previous: {
			week: mapStats(prevWeek),
			month: mapStats(prevMonth),
			year: mapStats(prevYear),
		},
	};
};

const getRecentActivity = (orders, limit = 5) =>
	orders
		.slice(0, limit)
		.map((order) => ({
			id: order._id,
			status: order.status,
			orderStatus: order.orderStatus,
			paymentStatus: order.paymentStatus,
			totalAmount: order.grandTotal || order.totalAmount,
			createdAt: order.createdAt,
			itemCount: order.products?.length || 0,
			productName: order.products?.[0]?.productId?.name || order.products?.[0]?.name,
		}));

export const getDashboardOverview = async (req, res) => {
	const userId = req.user?.userId;
	const role = req.user?.role;
	const period = (req.query.period || "month").toLowerCase();

	if (!userId || !role) {
		return res.status(401).json({ success: false, message: "Unauthorized" });
	}

	try {
		const ranges = buildPeriodRanges();

		const [sellerOrders, buyerOrders, unreadMessages, conversations, profile] =
			await Promise.all([
				Order.find({ "products.seller": userId })
					.populate("products.productId", "name images")
					.sort({ createdAt: -1 }),
				Order.find({ buyerId: userId })
					.populate("products.productId", "name images")
					.sort({ createdAt: -1 }),
				Message.countDocuments({ recipient: userId, status: "unread" }),
				Conversation.countDocuments({ "participants.participantId": userId }),
				role === "CHARITY"
					? Charity.findById(userId).select(
							"totalEarned totalHeldFunds listedProducts charityName",
						)
					: User.findById(userId).select("listedProducts firstName lastName"),
			]);

		const sellerPeriod = getPeriodStats(sellerOrders, userId, ranges, "seller");
		const buyerPeriod = getPeriodStats(buyerOrders, userId, ranges, "buyer");

		const sellerChanges = buildChanges(
			{
				week: { sold: sellerPeriod.current.week.sold, revenue: sellerPeriod.current.week.revenue },
				month: { sold: sellerPeriod.current.month.sold, revenue: sellerPeriod.current.month.revenue },
				year: { sold: sellerPeriod.current.year.sold, revenue: sellerPeriod.current.year.revenue },
			},
			{
				week: { sold: sellerPeriod.previous.week.sold, revenue: sellerPeriod.previous.week.revenue },
				month: { sold: sellerPeriod.previous.month.sold, revenue: sellerPeriod.previous.month.revenue },
				year: { sold: sellerPeriod.previous.year.sold, revenue: sellerPeriod.previous.year.revenue },
			},
			"soldChange",
			"revenueChange",
		);

		const buyerChanges = buildChanges(
			{
				week: { sold: buyerPeriod.current.week.sold, revenue: buyerPeriod.current.week.revenue },
				month: { sold: buyerPeriod.current.month.sold, revenue: buyerPeriod.current.month.revenue },
				year: { sold: buyerPeriod.current.year.sold, revenue: buyerPeriod.current.year.revenue },
			},
			{
				week: { sold: buyerPeriod.previous.week.sold, revenue: buyerPeriod.previous.week.revenue },
				month: { sold: buyerPeriod.previous.month.sold, revenue: buyerPeriod.previous.month.revenue },
				year: { sold: buyerPeriod.previous.year.sold, revenue: buyerPeriod.previous.year.revenue },
			},
			"purchaseChange",
			"spendChange",
		);

		const periodKey =
			period === "week" ? "week" : period === "year" ? "year" : "month";

		const liveListings = await Product.countDocuments({
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
				statusSummary: buildOrderStatusSummary(sellerOrders, userId),
				weeklyData: buildWeeklyChart(sellerOrders, ranges.currentWeekStart, userId),
				monthlyData: buildMonthlyChart(sellerOrders, ranges.currentMonthStart, userId),
				yearlyData: buildYearlyChart(sellerOrders, ranges.currentYearStart, userId),
				recentActivity: getRecentActivity(sellerOrders),
			},
			buyer: {
				itemsBought: buyerPeriod.current[periodKey].sold,
				moneySpent: buyerPeriod.current[periodKey].revenue,
				changes: buyerChanges,
				statusSummary: buildOrderStatusSummary(buyerOrders),
				weeklyData: buildWeeklyChart(buyerOrders, ranges.currentWeekStart),
				monthlyData: buildMonthlyChart(buyerOrders, ranges.currentMonthStart),
				yearlyData: buildYearlyChart(buyerOrders, ranges.currentYearStart),
				recentActivity: getRecentActivity(buyerOrders),
			},
			messaging: {
				unreadCount: unreadMessages,
				conversationCount: conversations,
			},
			listings: {
				live: liveListings,
				total: profile?.listedProducts?.length || 0,
			},
			charityFunds:
				role === "CHARITY"
					? {
							totalEarned: profile?.totalEarned || 0,
							totalHeldFunds: profile?.totalHeldFunds || 0,
						}
					: null,
		});
	} catch (error) {
		console.error("Dashboard overview error:", error);
		res.status(500).json({ success: false, message: "Failed to load dashboard" });
	}
};

export const getUserEarnings = async (req, res) => {
	const userId = req.user?.userId;
	if (!userId) {
		return res.status(401).json({ success: false, message: "Unauthorized" });
	}

	try {
		const orders = await Order.find({
			paymentStatus: "Paid",
			"products.seller": userId,
		}).sort({ createdAt: -1 });

		let totalEarned = 0;
		let pendingEscrow = 0;
		let releasedEscrow = 0;
		let disputedAmount = 0;

		orders.forEach(order => {
			const sellerTotal = order.products
				.filter(p => p.seller?.toString() === userId)
				.reduce((sum, p) => sum + (p.totalProductCost || 0), 0);

			totalEarned += sellerTotal;
			if (order.escrowStatus === "HELD") pendingEscrow += sellerTotal;
			if (order.escrowStatus === "RELEASED") releasedEscrow += sellerTotal;
			if (order.disputeStatus === "OPEN") disputedAmount += sellerTotal;
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
	} catch (error) {
		res.status(500).json({ success: false, message: "Failed to load earnings" });
	}
};

export const exportUserOrdersCsv = async (req, res) => {
	const userId = req.user?.userId;
	const { mode = "sold" } = req.query;

	if (!userId) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	try {
		const query =
			mode === "bought"
				? { buyerId: userId, paymentStatus: "Paid" }
				: { "products.seller": userId, paymentStatus: "Paid" };

		const orders = await Order.find(query).sort({ createdAt: -1 }).limit(2000);

		const header =
			"orderId,status,paymentStatus,grandTotal,escrowStatus,disputeStatus,createdAt\n";
		const rows = orders.map(o =>
			[
				o._id,
				o.status,
				o.paymentStatus,
				o.grandTotal?.toFixed(2) || "0",
				o.escrowStatus || "",
				o.disputeStatus || "NONE",
				o.createdAt?.toISOString?.() || "",
			].join(","),
		);

		res.setHeader("Content-Type", "text/csv");
		res.setHeader(
			"Content-Disposition",
			`attachment; filename=${mode}-orders-export.csv`,
		);
		res.send(header + rows.join("\n"));
	} catch (error) {
		res.status(500).json({ message: "Export failed" });
	}
};
