// users.routes.ts
import { Router } from "express";
import {
	registerUser,
	loginUser,
	// updateUserProfile,
	// getUserProfile,
	// getUserProducts,
	// getFavoriteProducts,
	// getUserOrders,
	// getOrderDetails,
	// getCharityList,
	// getCharityDetails,
	// donateToCharity,
} from "./users.controller";
// import {
// 	getAccountDetails,
// 	updateAccountPassword,
// 	updateAccountEmail,
// 	deactivateAccount,
	// deleteUserAccount,
// } from "./account.controller";
// import {
// 	getUserStatistics,
// 	getTotalRevenueAndSales,
// 	getWeeklyAndMonthlyStatistics,
// 	getCustomerAcquisitionMetrics,
// 	getTopCountries,
// 	getPostedProducts,
// } from "./analytics.controller";

const router = Router();

// User Management Routes
router.post("/register", registerUser); // User Registration
router.post("/login", loginUser); // User Login
// router.get("/profile", getUserProfile); // Get User Profile
// router.put("/profile", updateUserProfile); // Update User Profile
// router.get("/products", getUserProducts); // Get User Products
// router.get("/favorites", getFavoriteProducts); // Get Favorite Products
// router.get("/orders", getUserOrders); // Get User Orders
// router.get("/orders/:orderId", getOrderDetails); // Get Order Details
// router.get("/charities", getCharityList); // Get Charity List
// router.get("/charities/:charityId", getCharityDetails); // Get Charity Details
// router.post("/charities/:charityId/donate", donateToCharity); // Donate to a Charity

// // Account Management Routes
// router.get("/account", getAccountDetails); // Get account details
// router.put("/account/password", updateAccountPassword); // Update account password
// router.put("/account/email", updateAccountEmail); // Update account email
// router.delete("/account/deactivate", deactivateAccount); // Deactivate account
// router.delete("/account/deactivate", deleteUserAccount); // Deactivate account

// // Analytics Routes
// router.get("/analytics/user-statistics", getUserStatistics); // Get user statistics
// router.get("/analytics/revenue-and-sales", getTotalRevenueAndSales); // Get total revenue and sales
// router.get("/analytics/weekly-and-monthly", getWeeklyAndMonthlyStatistics); // Get weekly and monthly statistics
// router.get("/analytics/customer-acquisition", getCustomerAcquisitionMetrics); // Get customer acquisition metrics
// router.get("/analytics/top-countries", getTopCountries); // Get top countries for buying and selling
// router.get("/analytics/posted-products", getPostedProducts); // Get posted products by users and charities
 
export default router;
