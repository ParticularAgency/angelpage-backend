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
exports.getPlatformUserSessionsAnalytics = exports.getReturningUserAnalytics = exports.getTotalPlatformUsersWithMonthlyChanges = exports.deleteUser = exports.getTotalPlatformUsersWithDuration = exports.getLiveProducts = exports.deletePayment = exports.updatePayment = exports.addPayment = exports.deleteAddress = exports.updateAddress = exports.addAddress = exports.getAdminData = exports.updateProfile = void 0;
const date_fns_1 = require("date-fns");
const cloudinary_1 = __importDefault(require("../../config/cloudinary"));
const LoginActivity_model_1 = __importDefault(require("../../models/LoginActivity.model"));
const Admin_model_1 = __importDefault(require("../../models/Admin.model"));
const Order_model_1 = __importDefault(require("../../models/Order.model"));
const User_model_1 = __importDefault(require("../../models/User.model"));
const Charity_model_1 = __importDefault(require("../../models/Charity.model"));
const Product_model_1 = __importDefault(require("../../models/Product.model"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// Utility to handle unknown error types
const handleUnknownError = (error) => error instanceof Error ? error.message : "An unknown error occurred";
// Update User Profile
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const { firstName, lastName, dateBirth, email, userName, description, currentPassword, newPassword, } = req.body;
        const user = yield Admin_model_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const updateData = {};
        // Update password if provided
        if (currentPassword && newPassword) {
            const isPasswordCorrect = yield bcryptjs_1.default.compare(currentPassword, user.password);
            if (!isPasswordCorrect) {
                res.status(400).json({ message: "Current password is incorrect" });
                return;
            }
            updateData.password = yield bcryptjs_1.default.hash(newPassword, 10);
        }
        // Update other fields if provided
        if (firstName)
            updateData.firstName = firstName;
        if (lastName)
            updateData.lastName = lastName;
        if (dateBirth)
            updateData.dateBirth = dateBirth;
        if (email)
            updateData.email = email;
        if (userName)
            updateData.userName = userName;
        if (description)
            updateData.description = description;
        // Upload profile image to Cloudinary if provided
        if ((_b = req.file) === null || _b === void 0 ? void 0 : _b.path) {
            const result = yield cloudinary_1.default.uploader.upload(req.file.path, {
                folder: "user_profiles",
                public_id: `user_${userId}`,
                overwrite: true,
            });
            updateData.profileImage = result.secure_url;
        }
        const updatedUser = yield Admin_model_1.default.findByIdAndUpdate(userId, updateData, {
            new: true,
        });
        res
            .status(200)
            .json({ message: "Profile updated successfully", user: updatedUser });
    }
    catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({
            message: "Failed to update profile",
            error: handleUnknownError(error),
        });
    }
});
exports.updateProfile = updateProfile;
// Get User Profile
const getAdminData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(400).json({ message: "User ID is required" });
            return;
        }
        const user = yield Admin_model_1.default.findById(userId).select("-password");
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.status(200).json({ user });
    }
    catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({
            message: "Failed to fetch user profile",
            error: handleUnknownError(error),
        });
    }
});
exports.getAdminData = getAdminData;
// Add Address
const addAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const newAddress = req.body;
        const user = yield Admin_model_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        user.addresses.push(newAddress);
        yield user.save();
        res.status(201).json({
            message: "Address added successfully",
            addresses: user.addresses,
        });
    }
    catch (error) {
        console.error("Error adding address:", error);
        res.status(500).json({
            message: "Failed to add address",
            error: handleUnknownError(error),
        });
    }
});
exports.addAddress = addAddress;
// Update Address
const updateAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { addressId } = req.params;
        const updatedAddress = req.body;
        const user = yield Admin_model_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const address = user.addresses.find(addr => addr._id.toString() === addressId);
        if (!address) {
            res.status(404).json({ message: "Address not found" });
            return;
        }
        Object.assign(address, updatedAddress);
        yield user.save();
        res.status(200).json({
            message: "Address updated successfully",
            addresses: user.addresses,
        });
    }
    catch (error) {
        console.error("Error updating address:", error);
        res.status(500).json({
            message: "Failed to update address",
            error: handleUnknownError(error),
        });
    }
});
exports.updateAddress = updateAddress;
// Delete Address
const deleteAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { addressId } = req.params;
        const user = yield Admin_model_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        user.addresses = user.addresses.filter(address => address._id.toString() !== addressId);
        yield user.save();
        res.status(200).json({
            message: "Address deleted successfully",
            addresses: user.addresses,
        });
    }
    catch (error) {
        console.error("Error deleting address:", error);
        res.status(500).json({
            message: "Failed to delete address",
            error: handleUnknownError(error),
        });
    }
});
exports.deleteAddress = deleteAddress;
// Add Payment Method
const addPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const newPayment = req.body;
        const user = yield Admin_model_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        user.payments.push(newPayment);
        yield user.save();
        res.status(201).json({
            message: "Payment method added successfully",
            payments: user.payments,
        });
    }
    catch (error) {
        console.error("Error adding payment:", error);
        res.status(500).json({
            message: "Failed to add payment method",
            error: handleUnknownError(error),
        });
    }
});
exports.addPayment = addPayment;
// Update Payment Method
const updatePayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { paymentId } = req.params;
        const updatedPayment = req.body;
        const user = yield Admin_model_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const payment = user.payments.find(pay => pay._id.toString() === paymentId);
        if (!payment) {
            res.status(404).json({ message: "Payment method not found" });
            return;
        }
        Object.assign(payment, updatedPayment);
        yield user.save();
        res.status(200).json({
            message: "Payment method updated successfully",
            payments: user.payments,
        });
    }
    catch (error) {
        console.error("Error updating payment:", error);
        res.status(500).json({
            message: "Failed to update payment method",
            error: handleUnknownError(error),
        });
    }
});
exports.updatePayment = updatePayment;
// Delete Payment Method
const deletePayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { paymentId } = req.params;
        const user = yield Admin_model_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        user.payments = user.payments.filter(payment => payment._id.toString() !== paymentId);
        yield user.save();
        res.status(200).json({
            message: "Payment method deleted successfully",
            payments: user.payments,
        });
    }
    catch (error) {
        console.error("Error deleting payment method:", error);
        res.status(500).json({
            message: "Failed to delete payment method",
            error: handleUnknownError(error),
        });
    }
});
exports.deletePayment = deletePayment;
// Fetch all items with status "LIVE"
const getLiveProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Fetch all products with status "LIVE"
        const liveProducts = yield Product_model_1.default.find({ status: "LIVE" })
            .populate("seller", "firstName lastName profileImage addresses")
            .populate("charity", "charityName charityID storefrotnId profileImage addresses")
            .select("name price images category subcategory dimensions brand material size status createdAt")
            .sort({ createdAt: -1 }); // Sort by most recent
        // Check if there are live products
        if (!liveProducts || liveProducts.length === 0) {
            return res.status(404).json({ message: "No ready for sell products found." });
        }
        // Return the live products
        res.status(200).json({ products: liveProducts });
    }
    catch (error) {
        console.error("Error fetching live products:", error);
        res.status(500).json({ message: "Failed to fetch live products." });
    }
});
exports.getLiveProducts = getLiveProducts;
const getTotalPlatformUsersWithDuration = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield User_model_1.default.find({ role: "USER" });
        const charities = yield Charity_model_1.default.find({ role: "CHARITY" });
        const formattedUsers = users.map(user => ({
            id: user._id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            profileImage: user.profileImage,
            duration: calculateDuration(user.createdAt),
            role: "USER",
            userId: user.userId,
        }));
        const formattedCharities = charities.map(charity => ({
            id: charity._id,
            name: charity.charityName,
            email: charity.email,
            profileImage: charity.profileImage,
            duration: calculateDuration(charity.createdAt),
            role: "CHARITY",
            charityId: charity.charityID,
        }));
        res.status(200).json({
            users: [...formattedUsers, ...formattedCharities],
        });
    }
    catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Failed to fetch users" });
    }
});
exports.getTotalPlatformUsersWithDuration = getTotalPlatformUsersWithDuration;
// Helper function to calculate duration
const calculateDuration = (createdAt) => {
    const now = new Date();
    const diff = now.getTime() - new Date(createdAt).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days < 1)
        return "Today";
    if (days === 1)
        return "1 day ago";
    if (days < 7)
        return `${days} days ago`;
    if (days < 30)
        return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
};
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        // Try deleting from both User and Charity collections
        const userDeletion = yield User_model_1.default.findOneAndDelete({
            $or: [{ userId }, { _id: userId }],
        });
        const charityDeletion = yield Charity_model_1.default.findOneAndDelete({
            $or: [{ charityID: userId }, { _id: userId }],
        });
        if (!userDeletion && !charityDeletion) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({
            message: "User deleted successfully",
            deletedUser: userDeletion || charityDeletion,
        });
    }
    catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Failed to delete user" });
    }
});
exports.deleteUser = deleteUser;
const getTotalPlatformUsersWithMonthlyChanges = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get current and previous month date ranges
        const now = new Date();
        const currentMonthStart = (0, date_fns_1.startOfMonth)(now);
        const currentMonthEnd = (0, date_fns_1.endOfMonth)(now);
        const previousMonthStart = (0, date_fns_1.subMonths)(currentMonthStart, 1);
        const previousMonthEnd = (0, date_fns_1.subMonths)(currentMonthEnd, 1);
        // Query for current and previous month data
        const [currentMonthUsers, previousMonthUsers] = yield Promise.all([
            User_model_1.default.countDocuments({ createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd } }),
            User_model_1.default.countDocuments({ createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd } }),
        ]);
        const [currentMonthCharities, previousMonthCharities] = yield Promise.all([
            Charity_model_1.default.countDocuments({ createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd } }),
            Charity_model_1.default.countDocuments({ createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd } }),
        ]);
        // Calculate total and percentage changes
        const currentMonthTotal = currentMonthUsers + currentMonthCharities;
        const previousMonthTotal = previousMonthUsers + previousMonthCharities;
        const totalPlatformUsers = (yield User_model_1.default.countDocuments()) + (yield Charity_model_1.default.countDocuments());
        const percentageChange = calculatePercentageChange(currentMonthTotal, previousMonthTotal);
        res.status(200).json({
            success: true,
            totalPlatformUsers,
            currentMonth: {
                total: currentMonthTotal,
                users: currentMonthUsers,
                charities: currentMonthCharities,
            },
            previousMonth: {
                total: previousMonthTotal,
                users: previousMonthUsers,
                charities: previousMonthCharities,
            },
            percentageChange,
        });
    }
    catch (error) {
        console.error('Error fetching platform users with monthly changes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch platform users with monthly changes',
            error: error.message,
        });
    }
});
exports.getTotalPlatformUsersWithMonthlyChanges = getTotalPlatformUsersWithMonthlyChanges;
// Helper to calculate percentage change
const calculatePercentageChange = (current, previous) => {
    if (current === 0 && previous === 0)
        return 0;
    if (previous === 0)
        return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
};
const getReturningUserAnalytics = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Starting Returning User Analytics Calculation");
        const now = new Date();
        const currentWeekStart = (0, date_fns_1.startOfWeek)(now, { weekStartsOn: 1 });
        const currentWeekEnd = (0, date_fns_1.endOfWeek)(now, { weekStartsOn: 1 });
        const previousWeekStart = (0, date_fns_1.subWeeks)(currentWeekStart, 1);
        const previousWeekEnd = (0, date_fns_1.subWeeks)(currentWeekEnd, 1);
        console.log("Current Week:", { currentWeekStart, currentWeekEnd });
        console.log("Previous Week:", { previousWeekStart, previousWeekEnd });
        // Active entities (users and charities) for the current week
        const currentWeekActiveIds = new Set([
            ...(yield Product_model_1.default.distinct('seller', {
                createdAt: { $gte: currentWeekStart, $lte: currentWeekEnd },
            })),
            ...(yield Order_model_1.default.distinct('buyerId', {
                createdAt: { $gte: currentWeekStart, $lte: currentWeekEnd },
            })),
        ]);
        console.log("Current Week Active IDs:", currentWeekActiveIds);
        // Returning entities for the current week
        const currentWeekReturningUsers = (yield User_model_1.default.countDocuments({
            _id: { $in: Array.from(currentWeekActiveIds) },
            createdAt: { $lt: currentWeekStart }, // Must have been created before the week
        })) + (yield Charity_model_1.default.countDocuments({
            _id: { $in: Array.from(currentWeekActiveIds) },
            createdAt: { $lt: currentWeekStart },
        }));
        console.log("Current Week Returning Users:", currentWeekReturningUsers);
        // Active entities (users and charities) for the previous week
        const previousWeekActiveIds = new Set([
            ...(yield Product_model_1.default.distinct('seller', {
                createdAt: { $gte: previousWeekStart, $lte: previousWeekEnd },
            })),
            ...(yield Order_model_1.default.distinct('buyerId', {
                createdAt: { $gte: previousWeekStart, $lte: previousWeekEnd },
            })),
        ]);
        console.log("Previous Week Active IDs:", previousWeekActiveIds);
        // Returning entities for the previous week
        const previousWeekReturningUsers = (yield User_model_1.default.countDocuments({
            _id: { $in: Array.from(previousWeekActiveIds) },
            createdAt: { $lt: previousWeekStart }, // Must have been created before the week
        })) + (yield Charity_model_1.default.countDocuments({
            _id: { $in: Array.from(previousWeekActiveIds) },
            createdAt: { $lt: previousWeekStart },
        }));
        console.log("Previous Week Returning Users:", previousWeekReturningUsers);
        // Total returning entities (users and charities)
        const totalPlatformReturningUsers = (yield User_model_1.default.countDocuments({
            _id: {
                $in: [
                    ...(yield Product_model_1.default.distinct('seller')),
                    ...(yield Order_model_1.default.distinct('buyerId')),
                ],
            },
            createdAt: { $lt: now }, // Must have been created before now
        })) + (yield Charity_model_1.default.countDocuments({
            _id: {
                $in: [
                    ...(yield Product_model_1.default.distinct('seller')),
                    ...(yield Order_model_1.default.distinct('buyerId')),
                ],
            },
            createdAt: { $lt: now },
        }));
        console.log("Total Platform Returning Users:", totalPlatformReturningUsers);
        // Calculate weekly percentage change
        const percentageChange = previousWeekReturningUsers > 0
            ? ((currentWeekReturningUsers - previousWeekReturningUsers) / previousWeekReturningUsers) * 100
            : currentWeekReturningUsers > 0
                ? 100
                : 0;
        res.status(200).json({
            success: true,
            data: {
                totalReturningUsers: currentWeekReturningUsers,
                percentageChange: percentageChange.toFixed(2),
                totalPlatformReturningUsers,
            },
        });
    }
    catch (error) {
        console.error('Error fetching returning user analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch returning user analytics',
            error: error.message,
        });
    }
});
exports.getReturningUserAnalytics = getReturningUserAnalytics;
const getPlatformUserSessionsAnalytics = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Starting Platform User Sessions Analytics Calculation");
        const now = new Date();
        const currentWeekStart = (0, date_fns_1.startOfWeek)(now, { weekStartsOn: 1 });
        const currentWeekEnd = (0, date_fns_1.endOfWeek)(now, { weekStartsOn: 1 });
        const previousWeekStart = (0, date_fns_1.subWeeks)(currentWeekStart, 1);
        const previousWeekEnd = (0, date_fns_1.subWeeks)(currentWeekEnd, 1);
        console.log("Current Week:", { currentWeekStart, currentWeekEnd });
        console.log("Previous Week:", { previousWeekStart, previousWeekEnd });
        // Active sessions for the current week (login + posting + purchasing)
        const currentWeekActiveSessions = new Set([
            ...(yield Product_model_1.default.distinct('seller', {
                createdAt: { $gte: currentWeekStart, $lte: currentWeekEnd },
            })),
            ...(yield Order_model_1.default.distinct('buyerId', {
                createdAt: { $gte: currentWeekStart, $lte: currentWeekEnd },
            })),
            ...(yield LoginActivity_model_1.default.distinct('userId', {
                timestamp: { $gte: currentWeekStart, $lte: currentWeekEnd },
            })),
        ]);
        console.log("Current Week Active Sessions IDs:", currentWeekActiveSessions);
        // Total sessions for the current week
        const currentWeekSessionsCount = currentWeekActiveSessions.size;
        // Active sessions for the previous week (login + posting + purchasing)
        const previousWeekActiveSessions = new Set([
            ...(yield Product_model_1.default.distinct('seller', {
                createdAt: { $gte: previousWeekStart, $lte: previousWeekEnd },
            })),
            ...(yield Order_model_1.default.distinct('buyerId', {
                createdAt: { $gte: previousWeekStart, $lte: previousWeekEnd },
            })),
            ...(yield LoginActivity_model_1.default.distinct('userId', {
                timestamp: { $gte: currentWeekStart, $lte: currentWeekEnd },
                role: { $in: ['USER', 'CHARITY'] },
            })),
        ]);
        console.log("Previous Week Active Sessions IDs:", previousWeekActiveSessions);
        // Total sessions for the previous week
        const previousWeekSessionsCount = previousWeekActiveSessions.size;
        // Total platform sessions (distinct users and charities who have ever performed an action)
        const totalPlatformSessions = new Set([
            ...(yield Product_model_1.default.distinct('seller')),
            ...(yield Order_model_1.default.distinct('buyerId')),
            ...(yield LoginActivity_model_1.default.distinct('userId')),
        ]).size;
        console.log("Total Platform Sessions:", totalPlatformSessions);
        // Calculate weekly percentage change
        const percentageChange = previousWeekSessionsCount > 0
            ? ((currentWeekSessionsCount - previousWeekSessionsCount) / previousWeekSessionsCount) * 100
            : currentWeekSessionsCount > 0
                ? 100
                : 0;
        // Respond with analytics
        res.status(200).json({
            success: true,
            data: {
                totalPlatformSessions,
                currentWeekSessions: currentWeekSessionsCount,
                previousWeekSessions: previousWeekSessionsCount,
                percentageChange: percentageChange.toFixed(2),
            },
        });
    }
    catch (error) {
        console.error('Error fetching platform user sessions analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch platform user sessions analytics',
            error: error.message,
        });
    }
});
exports.getPlatformUserSessionsAnalytics = getPlatformUserSessionsAnalytics;
