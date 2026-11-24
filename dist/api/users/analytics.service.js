"use strict";
// // analytics.service.ts
// import User from "../../models/User.model"; // Assuming you have a User model
// import Product from "../../models/Product.model"; // Assuming you have a Product model
// import Order from "../../models/Order.model"; // Assuming you have an Order model
// import mongoose from "mongoose";
// export class AnalyticsService {
// 	// Get User Statistics
// 	async getUserStatistics(userId) {
// 		const user = await User.findById(userId);
// 		const totalOrders = await Order.countDocuments({ userId });
// 		const totalSpend = await Order.aggregate([
// 			{ $match: { userId: new mongoose.Types.ObjectId(userId) } },
// 			{ $group: { _id: null, total: { $sum: "$amount" } } },
// 		]);
// 		return {
// 			totalProducts: user.products.length,
// 			totalOrders,
// 			totalSpend: totalSpend[0]?.total || 0,
// 		};
// 	}
// 	// Get Total Revenue and Sales
// 	async getTotalRevenueAndSales() {
// 		const totalSales = await Order.countDocuments();
// 		const totalRevenue = await Order.aggregate([
// 			{
// 				$group: { _id: null, total: { $sum: "$amount" } },
// 			},
// 		]);
// 		return {
// 			totalSales,
// 			totalRevenue: totalRevenue[0]?.total || 0,
// 		};
// 	}
// 	// Get Weekly and Monthly Statistics
// 	async getWeeklyAndMonthlyStatistics() {
// 		const currentDate = new Date();
// 		const startOfWeek = new Date(currentDate);
// 		startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Get the first day of the week
// 		const startOfMonth = new Date(
// 			currentDate.getFullYear(),
// 			currentDate.getMonth(),
// 			1,
// 		);
// 		const weeklyStats = await Order.aggregate([
// 			{ $match: { createdAt: { $gte: startOfWeek } } },
// 			{
// 				$group: {
// 					_id: { $dayOfWeek: "$createdAt" },
// 					total: { $sum: "$amount" },
// 				},
// 			},
// 			{ $sort: { _id: 1 } },
// 		]);
// 		const monthlyStats = await Order.aggregate([
// 			{ $match: { createdAt: { $gte: startOfMonth } } },
// 			{
// 				$group: {
// 					_id: { $dayOfMonth: "$createdAt" },
// 					total: { $sum: "$amount" },
// 				},
// 			},
// 			{ $sort: { _id: 1 } },
// 		]);
// 		return {
// 			weeklyStats,
// 			monthlyStats,
// 		};
// 	}
// 	// Get Customer Acquisition Metrics
// 	async getCustomerAcquisitionMetrics() {
// 		const totalUsers = await User.countDocuments();
// 		const totalSessions = 1000; // Example static value; replace with actual logic
// 		const bounceRate = 0.5; // Example static value; replace with actual logic
// 		return {
// 			totalUsers,
// 			totalSessions,
// 			bounceRate,
// 		};
// 	}
// 	// Get Top Countries for Buying and Selling
// 	async getTopCountries() {
// 		const topBuyingCountries = await Order.aggregate([
// 			{
// 				$group: { _id: "$shippingAddress.country", total: { $sum: "$amount" } },
// 			},
// 			{ $sort: { total: -1 } },
// 			{ $limit: 5 }, // Top 5 countries
// 		]);
// 		const topSellingCountries = await Product.aggregate([
// 			{ $group: { _id: "$location.country", total: { $sum: 1 } } },
// 			{ $sort: { total: -1 } },
// 			{ $limit: 5 }, // Top 5 countries
// 		]);
// 		return {
// 			topBuyingCountries,
// 			topSellingCountries,
// 		};
// 	}
// 	// Get Posted Products by Users and Charities
// 	async getPostedProducts() {
// 		const postedProducts = await Product.aggregate([
// 			{
// 				$group: {
// 					_id: "$postedBy",
// 					totalProducts: { $sum: 1 },
// 					charity: { $first: "$isCharity" }, // Assuming there's a flag indicating charity
// 				},
// 			},
// 			{ $sort: { totalProducts: -1 } },
// 		]);
// 		return postedProducts;
// 	}
// }
