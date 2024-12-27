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
exports.getCharityDetails = exports.getCharityList = exports.getStorefrontData = exports.deletePayment = exports.updatePayment = exports.addPayment = exports.deleteAddress = exports.updateAddress = exports.addAddress = exports.getCharityAdminInfo = exports.updateCharityAdminInfo = exports.getCharityProfile = exports.updateProfile = void 0;
// import { Request, Response } from "express";
const cloudinary_1 = __importDefault(require("../../config/cloudinary"));
const Charity_model_1 = __importDefault(require("../../models/Charity.model"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// Update profile function
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.user; // Assumes userId is set by middleware
        const { firstName, lastName, dateBirth, email, userName, description, charityPhone, websiteLink, currentPassword, newPassword, } = req.body;
        // Retrieve user document
        const user = yield Charity_model_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        const updateData = {};
        // Handle password update if both current and new passwords are provided
        if (currentPassword && newPassword) {
            const isPasswordCorrect = yield bcryptjs_1.default.compare(currentPassword, user.password);
            if (!isPasswordCorrect)
                return res
                    .status(400)
                    .json({ message: "Current password is incorrect" });
            updateData.password = yield bcryptjs_1.default.hash(newPassword, 10);
        }
        // Conditionally add other fields to the update data if they are provided
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
        if (charityPhone)
            updateData.charityPhone = charityPhone;
        if (websiteLink)
            updateData.websiteLink = websiteLink;
        if (description)
            updateData.description = description;
        // Handle profile image upload
        if (req.files && req.files.profileImage) {
            const result = yield cloudinary_1.default.uploader.upload(req.files.profileImage[0].path, {
                folder: "user_profiles",
                public_id: `user_${userId}`,
                overwrite: true,
            });
            updateData.profileImage = result.secure_url;
        }
        // Handle charity banner image upload
        if (req.files && req.files.charityBannerImage) {
            const result = yield cloudinary_1.default.uploader.upload(req.files.charityBannerImage[0].path, {
                folder: "charity_images",
                public_id: `charity_${userId}`,
                overwrite: true,
            });
            updateData.charityBannerImage = result.secure_url;
        }
        const updatedUser = yield Charity_model_1.default.findByIdAndUpdate(userId, updateData, {
            new: true,
        });
        res
            .status(200)
            .json({ message: "Profile updated successfully", user: updatedUser });
    }
    catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: "Failed to update profile", error });
    }
});
exports.updateProfile = updateProfile;
// Get charity profile function
const getCharityProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId)
            return res.status(400).json({ message: "User ID is required" });
        const user = yield Charity_model_1.default.findById(userId).select("-password");
        if (!user)
            return res.status(404).json({ message: "User not found" });
        res.status(200).json({ user });
    }
    catch (error) {
        console.error("Error fetching user profile:", error);
        res
            .status(500)
            .json({ message: "Failed to fetch user profile", error: error.message });
    }
});
exports.getCharityProfile = getCharityProfile;
// Update profile function
const updateCharityAdminInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.user; // userId should be set by the auth middleware
        const { charityName, charityNumber, charityID, description, phoneNumber, websiteLink } = req.body;
        const user = yield Charity_model_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        Object.assign(user, {
            charityName,
            charityNumber,
            charityID,
            description,
            phoneNumber,
            websiteLink,
        });
        yield user.save();
        res.status(200).json({ message: "Profile updated successfully", user });
    }
    catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: "Failed to update profile", error });
    }
});
exports.updateCharityAdminInfo = updateCharityAdminInfo;
// Get charity profile function
const getCharityAdminInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId)
            return res.status(400).json({ message: "User ID is required" });
        const user = yield Charity_model_1.default.findById(userId).select("-password");
        if (!user)
            return res.status(404).json({ message: "User not found" });
        res.status(200).json({ user });
    }
    catch (error) {
        console.error("Error fetching user profile:", error);
        res
            .status(500)
            .json({ message: "Failed to fetch user profile", error: error.message });
    }
});
exports.getCharityAdminInfo = getCharityAdminInfo;
// Add address function
const addAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.user;
        const newAddress = req.body; // Expects address data in the request body
        const user = yield Charity_model_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        user.addresses.push(newAddress);
        yield user.save();
        res.status(201).json({
            message: "Address added successfully",
            addresses: user.addresses,
        });
    }
    catch (error) {
        console.error("Error adding address:", error);
        res.status(500).json({ message: "Failed to add address", error });
    }
});
exports.addAddress = addAddress;
// Update address function
const updateAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.user;
        const { addressId } = req.params;
        const updatedAddress = req.body;
        const user = yield Charity_model_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        const address = user.addresses.id(addressId);
        if (!address)
            return res.status(404).json({ message: "Address not found" });
        Object.assign(address, updatedAddress);
        yield user.save();
        res.status(200).json({
            message: "Address updated successfully",
            addresses: user.addresses,
        });
    }
    catch (error) {
        console.error("Error updating address:", error);
        res.status(500).json({ message: "Failed to update address", error });
    }
});
exports.updateAddress = updateAddress;
// Delete address function
const deleteAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.user;
        const { addressId } = req.params;
        const user = yield Charity_model_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        user.addresses = user.addresses.filter(address => address._id.toString() !== addressId);
        yield user.save();
        res.status(200).json({
            message: "Address deleted successfully",
            addresses: user.addresses,
        });
    }
    catch (error) {
        console.error("Error deleting address:", error);
        res.status(500).json({ message: "Failed to delete address", error });
    }
});
exports.deleteAddress = deleteAddress;
// payment methodes schamas start here
const addPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.user;
        const newPayment = req.body; // Assumes payment data is in the request body
        const user = yield Charity_model_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        // Add the new payment to the user's payments array
        user.payments.push(newPayment);
        yield user.save();
        res.status(201).json({
            message: "Payment method added successfully",
            payments: user.payments,
        });
    }
    catch (error) {
        console.error("Error adding payment:", error);
        res.status(500).json({ message: "Failed to add payment method", error });
    }
});
exports.addPayment = addPayment;
const updatePayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.user;
        const { paymentId } = req.params;
        const updatedPayment = req.body;
        const user = yield Charity_model_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        const payment = user.payments.id(paymentId);
        if (!payment)
            return res.status(404).json({ message: "Payment method not found" });
        // Update the payment details
        Object.assign(payment, updatedPayment);
        yield user.save();
        res.status(200).json({
            message: "Payment method updated successfully",
            payments: user.payments,
        });
    }
    catch (error) {
        console.error("Error updating payment:", error);
        res.status(500).json({ message: "Failed to update payment method", error });
    }
});
exports.updatePayment = updatePayment;
const deletePayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.user;
        const { paymentId } = req.params;
        const user = yield Charity_model_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        // Filter out the payment method to delete
        user.payments = user.payments.filter(payment => payment._id.toString() !== paymentId);
        yield user.save();
        res.status(200).json({
            message: "Payment method deleted successfully",
            payments: user.payments,
        });
    }
    catch (error) {
        console.error("Error deleting payment:", error);
        res.status(500).json({ message: "Failed to delete payment method", error });
    }
});
exports.deletePayment = deletePayment;
// Storefront data - Public Access
const getStorefrontData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { storefrontid } = req.params;
        // Logging received storefront ID
        console.log("Received storefrontid:", storefrontid);
        // Query the charity using the provided storefront ID
        const charity = yield Charity_model_1.default.findOne({ storefrontId: storefrontid })
            .select("charityName charityNumber storefrontId description profileImage charityBannerImage addresses listedProducts")
            .populate("listedProducts");
        // Check if the charity exists
        if (!charity) {
            console.log("No charity found for storefrontId:", storefrontid);
            return res.status(404).json({ message: "Charity not found" });
        }
        // Respond with the charity data
        console.log("Charity data:", charity);
        res.status(200).json({ charity });
    }
    catch (error) {
        console.error("Error fetching storefront data:", error);
        res.status(500).json({ message: "Failed to fetch storefront data", error: error.message });
    }
});
exports.getStorefrontData = getStorefrontData;
const getCharityList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const charities = yield Charity_model_1.default.find(); // You can add filters as needed (e.g., status: 'approved')
        res.status(200).json({ charities });
    }
    catch (error) {
        console.error("Error fetching charities:", error);
        res.status(500).json({ message: "Error fetching charities" });
    }
});
exports.getCharityList = getCharityList;
// Get Charity Details - Public Access
const getCharityDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { charityid } = req.params; // Correctly retrieve `charityid`
        if (!charityid) {
            return res.status(400).json({ message: 'Charity ID is required' });
        }
        const charity = yield Charity_model_1.default.findById(charityid)
            .select('charityName charityNumber description phoneNumber websiteLink profileImage charityBannerImage addresses listedProducts')
            .populate('listedProducts');
        if (!charity) {
            return res.status(404).json({ message: 'Charity not found' });
        }
        res.status(200).json({ charity });
    }
    catch (error) {
        console.error('Error fetching charity details:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getCharityDetails = getCharityDetails;
