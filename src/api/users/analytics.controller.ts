// // analytics.controller.ts
// import { Request, Response } from "express";
// import { AnalyticsService } from "./analytics.service";

// const analyticsService = new AnalyticsService();

// // Get User Statistics
// export const getUserStatistics = async (req: Request, res: Response) => {
// 	try {
// 		const userId = req.user.id; // Get user ID from middleware
// 		const statistics = await analyticsService.getUserStatistics(userId);
// 		res.status(200).json(statistics);
// 	} catch (error) {
// 		res.status(500).json({ message: error.message });
// 	}
// };

// // Get Total Revenue and Sales
// export const getTotalRevenueAndSales = async (req: Request, res: Response) => {
// 	try {
// 		const totals = await analyticsService.getTotalRevenueAndSales();
// 		res.status(200).json(totals);
// 	} catch (error) {
// 		res.status(500).json({ message: error.message });
// 	}
// };

// // Get Weekly and Monthly Statistics
// export const getWeeklyAndMonthlyStatistics = async (
// 	req: Request,
// 	res: Response,
// ) => {
// 	try {
// 		const stats = await analyticsService.getWeeklyAndMonthlyStatistics();
// 		res.status(200).json(stats);
// 	} catch (error) {
// 		res.status(500).json({ message: error.message });
// 	}
// };

// // Get Customer Acquisition Metrics
// export const getCustomerAcquisitionMetrics = async (
// 	req: Request,
// 	res: Response,
// ) => {
// 	try {
// 		const metrics = await analyticsService.getCustomerAcquisitionMetrics();
// 		res.status(200).json(metrics);
// 	} catch (error) {
// 		res.status(500).json({ message: error.message });
// 	}
// };

// // Get Top Countries for Buying and Selling
// export const getTopCountries = async (req: Request, res: Response) => {
// 	try {
// 		const countries = await analyticsService.getTopCountries();
// 		res.status(200).json(countries);
// 	} catch (error) {
// 		res.status(500).json({ message: error.message });
// 	}
// };

// // Get Posted Products by Users and Charities
// export const getPostedProducts = async (req: Request, res: Response) => {
// 	try {
// 		const products = await analyticsService.getPostedProducts();
// 		res.status(200).json(products);
// 	} catch (error) {
// 		res.status(500).json({ message: error.message });
// 	}
// };
