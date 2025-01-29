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
exports.sendStripeMissingInfoEmail = exports.accountUpdateEvent = exports.onBoarding = exports.releaseFunds = exports.automaticReleaseAfter14Days = exports.approveFundsRelease = exports.automaticMoveToHeldFunds = exports.processOrderDelivery = exports.OrderdeliverMark = exports.registerCharity = exports.uploadCharityList = exports.uploadMiddleware = exports.getCharityDetails = exports.getCharityList = exports.getStorefrontData = exports.deletePayment = exports.updatePayment = exports.addPayment = exports.deleteAddress = exports.updateAddress = exports.addAddress = exports.getCharityAdminInfo = exports.updateCharityAdminInfo = exports.getCharityProfile = exports.updateProfile = void 0;
const multer_1 = __importDefault(require("multer"));
const xlsx_1 = __importDefault(require("xlsx"));
const moment_1 = __importDefault(require("moment"));
const cloudinary_1 = __importDefault(require("../../config/cloudinary"));
const Charity_model_1 = __importDefault(require("../../models/Charity.model"));
const Order_model_1 = __importDefault(require("../../models/Order.model"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const email_1 = require("../../utils/email");
const stripe_1 = __importDefault(require("stripe"));
const uuid_1 = require("uuid");
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, { apiVersion: '2020-08-27' });
// Set up Multer for file uploads
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(), // Store file in memory for processing
    limits: { fileSize: 50 * 1024 * 1024 }, // Limit file size to 10MB
});
const MINIMUM_THRESHOLD = 0.5; // Minimum amount for release to charity
const STRIPE_TRANSFER_FEE_PERCENTAGE = 0.029; // 2.9% Stripe transfer fee
const STRIPE_TRANSFER_FEE_FIXED = 0.3; // 30p fixed fee for Stripe transfers
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
// Get Charities with Pagination and Search
const getCharityList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 12, search = '' } = req.query; // Get page, limit, and search term from query params
        // Convert page and limit to integers
        const pageNumber = parseInt(page);
        const pageLimit = parseInt(limit);
        // Calculate the skip value for pagination
        const skip = (pageNumber - 1) * pageLimit;
        // Build search filter
        const searchQuery = search
            ? {
                charityName: { $regex: search, $options: 'i' }, // Case insensitive search on charityName
            }
            : {};
        // Fetch the charities with pagination and search filter
        const charities = yield Charity_model_1.default.find(searchQuery)
            .skip(skip) // Skip the number of documents based on page and limit
            .limit(pageLimit) // Limit the number of results per page
            .select('charityName charityNumber description phoneNumber websiteLink profileImage charityBannerImage')
            .lean(); // Use lean for better performance
        // Get the total number of charities to calculate the total pages
        const totalCharities = yield Charity_model_1.default.countDocuments(searchQuery);
        // Calculate total pages
        const totalPages = Math.ceil(totalCharities / pageLimit);
        res.status(200).json({
            charities,
            totalPages,
            currentPage: pageNumber,
            totalCharities,
        });
    }
    catch (error) {
        console.error('Error fetching charities:', error);
        res.status(500).json({ message: 'Internal server error' });
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
// Middleware to handle file upload
exports.uploadMiddleware = upload.single("file");
const uploadCharityList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Ensure a file was uploaded
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded." });
        }
        // Parse the uploaded file using xlsx
        const workbook = xlsx_1.default.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0]; // Get the first sheet
        const sheetData = xlsx_1.default.utils.sheet_to_json(workbook.Sheets[sheetName]);
        if (!sheetData || sheetData.length === 0) {
            return res.status(400).json({ message: "Excel file is empty or invalid." });
        }
        // Log parsed data for debugging
        console.log("Parsed Excel data:", sheetData);
        // Map each row to the Charity schema
        const charities = sheetData.map((row, index) => {
            // Ensure a unique storefrontId is assigned to each charity
            const storefrontId = (0, uuid_1.v4)(); // Generate unique storefrontId
            // Validate and process the data, assigning default values where needed
            return {
                charityName: row.charityName || `Unnamed Charity ${index + 1}`,
                charityNumber: row.charityNumber || `charity number ${index + 1}`,
                phoneNumber: row.phoneNumber || `phone number ${index + 1}`,
                email: row.email || `placeholder${index + 1}@example.com`,
                websiteLink: row.websiteLink || `website link ${index + 1}`,
                description: row.description || `No description provided ${index + 1}`,
                firstName: row.firstName || `first name ${index + 1}`,
                lastName: row.lastName || `last name ${index + 1}`,
                userName: row.userName || `username ${index + 1}`,
                password: row.password || `password ${index + 1}`,
                // Add the addresses field as an array with the correct structure
                addresses: [
                    {
                        type: 'main address',
                        name: row.firstName || `first name ${index + 1}`, // Using first name as an example
                        address: row.address || `Address ${index + 1}`, // Assuming address exists in the sheet
                        city: row.city || `City ${index + 1}`, // Assuming city exists in the sheet
                        country: row.country || 'GB', // Defaulting to GB
                        postcode: row.postcode || `Postcode ${index + 1}`, // Assuming postcode exists in the sheet
                    }
                ],
                role: "CHARITY",
                profileCompleted: false,
                verified: false,
                registrationStatus: "PENDING",
                storefrontId,
            };
        });
        // Log the charities data to ensure proper mapping
        console.log("Charities to be saved:", charities);
        // Insert charities into MongoDB
        const createdCharities = yield Charity_model_1.default.insertMany(charities);
        // Respond with success message
        res.status(201).json({
            message: "Charities uploaded successfully.",
            charities: createdCharities,
        });
    }
    catch (error) {
        // Log any error and respond with failure message
        console.error("Error uploading charities:", error);
        res.status(500).json({ message: "Failed to upload charities.", error });
    }
});
exports.uploadCharityList = uploadCharityList;
// Register charity with password
const registerCharity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { storefrontId, password } = req.body;
        // Find the charity using the storefrontId
        const charity = yield Charity_model_1.default.findOne({ storefrontId });
        if (!charity) {
            return res.status(404).json({ message: 'Charity not found' });
        }
        // Encrypt the password before saving it
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        // Update the charity record with the new password and set registration status to "REGISTERED"
        charity.password = hashedPassword;
        charity.registrationStatus = 'REGISTERED';
        yield charity.save();
        res.status(200).json({ message: 'Registration successful!' });
    }
    catch (error) {
        console.error('Error registering charity:', error);
        res.status(500).json({ message: 'Registration failed', error: error.message });
    }
});
exports.registerCharity = registerCharity;
// Endpoint to mark the order as delivered
const OrderdeliverMark = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { orderId } = req.params;
    try {
        // Find the order by ID
        const order = yield Order_model_1.default.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        // Update the order status to "delivered"
        order.status = "Delivered";
        order.orderStatus = "Delivered";
        yield order.save(); // Save the updated order
        // Trigger the process of splitting the funds and updating charity wallets
        yield (0, exports.processOrderDelivery)(orderId);
        // Send success response
        res.status(200).json({ message: "Order marked as delivered and funds split" });
    }
    catch (error) {
        console.error("Error marking order as delivered:", error);
        res.status(500).json({ message: "Error marking order as delivered", error });
    }
});
exports.OrderdeliverMark = OrderdeliverMark;
const processOrderDelivery = (orderId) => __awaiter(void 0, void 0, void 0, function* () {
    const order = yield Order_model_1.default.findById(orderId).populate("products");
    if (!order)
        throw new Error("Order not found");
    if (order.status !== "Delivered")
        return;
    // Subtract shipping cost and admin fee
    const remainingAmount = order.grandTotal - order.shipmentCost;
    const adminFee = remainingAmount * 0.1;
    const charityAmount = remainingAmount - adminFee;
    console.log(`Remaining Amount: ${remainingAmount}`);
    console.log(`Admin Fee: ${adminFee}`);
    console.log(`Charity Amount: ${charityAmount}`);
    const totalCharityProfit = order.products.reduce((sum, product) => sum + product.charityProfit, 0);
    console.log(`Total Charity Profit: ${totalCharityProfit}`);
    for (const product of order.products) {
        const charityShare = (charityAmount * product.charityProfit) / totalCharityProfit;
        console.log(`Charity Share for Product: ${charityShare}`);
        // Calculate Stripe transfer fee
        const stripeFee = Math.round(charityShare * STRIPE_TRANSFER_FEE_PERCENTAGE + STRIPE_TRANSFER_FEE_FIXED);
        console.log(`Stripe Fee: ${stripeFee}`);
        const netCharityAmount = charityShare - stripeFee;
        console.log(`Net Charity Amount: ${netCharityAmount}`);
        const charity = yield Charity_model_1.default.findById(product.charity);
        if (charity) {
            // Calculate days passed since payment confirmation
            const paymentConfirmedDate = (0, moment_1.default)(order.paymentConfirmedAt);
            const daysSincePaymentConfirmed = (0, moment_1.default)().diff(paymentConfirmedDate, 'days');
            if (daysSincePaymentConfirmed >= 7) {
                // Move funds to totalHeldFunds after 7 days
                yield Charity_model_1.default.findByIdAndUpdate(product.charity, {
                    $inc: { totalHeldFunds: netCharityAmount },
                    $set: { upcomingFunds: 0, holdDate: new Date() },
                });
                if (!charity.registrationStatus === "REGISTERED") {
                    yield (0, email_1.sendEmail)({
                        to: charity.email,
                        subject: "Complete Account Registration on AngelPage",
                        text: `Dear ${charity.name}, please complete your Charity Account Registration. One of your donations is waiting for admin approval.`,
                    });
                }
                else if (!charity.stripeAccountId) {
                    yield (0, email_1.sendEmail)({
                        to: charity.email,
                        subject: "Complete Your Charity Profile on AngelPage",
                        text: `Dear ${charity.name}, please complete your profile and set up your Stripe account to receive your funds. One of your donations is waiting for admin approval.`,
                    });
                }
                else if (!charity.email) {
                    // Notify the admin if the charity doesn't have an email address
                    yield (0, email_1.sendEmail)({
                        to: process.env.ADMIN_EMAIL,
                        subject: `Charity ${charity.name} is missing email address`,
                        text: `Charity Name: ${charity.name}, Phone: ${charity.phoneNumber}, Address: ${charity.addresses[0].address},${charity.addresses[0].postcode},${charity.addresses[0].city},${charity.addresses[0].country} does not have an email address on file. Please contact them to complete their registration process, including Stripe account setup.`,
                    });
                }
                else {
                    yield (0, email_1.sendEmail)({
                        to: charity.email,
                        subject: "Funds Moved to Held Funds",
                        text: `Dear ${charity.charityName}, your funds have been moved to your held balance after 7 days of payment confirmation.`,
                    });
                }
            }
            else {
                // Funds are still in upcomingFunds if not 7 days yet
                yield Charity_model_1.default.findByIdAndUpdate(product.charity, {
                    $inc: { upcomingFunds: netCharityAmount },
                    $set: { holdDate: new Date() }, // Set the hold date to track
                });
                if (!charity.registrationStatus === "REGISTERED") {
                    yield (0, email_1.sendEmail)({
                        to: charity.email,
                        subject: "Complete Account Registration on AngelPage",
                        text: `Dear ${charity.name}, please complete your Charity Account Registration. One of your donations is waiting.`,
                    });
                }
                else if (!charity.email) {
                    // Notify the admin if the charity doesn't have an email address
                    yield (0, email_1.sendEmail)({
                        to: process.env.ADMIN_EMAIL,
                        subject: `Charity ${charity.name} is missing email address`,
                        text: `Charity Name: ${charity.name}, Phone: ${charity.phoneNumber}, Address: ${charity.addresses[0].address},${charity.addresses[0].postcode},${charity.addresses[0].city},${charity.addresses[0].country} does not have an email address on file. Please contact them to complete their registration process, including Stripe account setup.`,
                    });
                }
                else {
                    yield (0, email_1.sendEmail)({
                        to: charity.email,
                        subject: "Funds Awaiting on Upcoming fund area",
                        text: `Dear ${charity.charityName}, your funds have been awaiting to your held balance after 7 days of payment confirmation it will moved to held fund area for awaiting admin approval.`,
                    });
                }
            }
        }
    }
});
exports.processOrderDelivery = processOrderDelivery;
// Function to check and automatically move funds from upcomingFunds to totalHeldFunds after 7 days
const automaticMoveToHeldFunds = () => __awaiter(void 0, void 0, void 0, function* () {
    const charities = yield Charity_model_1.default.find({
        upcomingFunds: { $gt: 0 }, // Only check if there are funds in upcomingFunds
        holdDate: { $ne: null }, // Check that a hold date exists
    });
    const today = new Date();
    for (const charity of charities) {
        // Get the corresponding order for the charity
        const order = yield Order_model_1.default.findOne({ 'products.charity': charity._id });
        const daysSinceHold = Math.floor((today - order.paymentConfirmedAt) / (1000 * 3600 * 24));
        if (daysSinceHold >= 7) {
            // Move the funds from upcomingFunds to totalHeldFunds after 7 days
            yield Charity_model_1.default.findByIdAndUpdate(charity._id, {
                $inc: {
                    totalHeldFunds: charity.upcomingFunds,
                    upcomingFunds: -charity.upcomingFunds // Reset upcomingFunds
                },
                $set: { holdDate: new Date() },
            });
            console.log(`Moved £${charity.upcomingFunds} to totalHeldFunds for charity ${charity.charityName}`);
            // Optionally, you can also send an email to notify the charity about the fund release
            if (!charity.registrationStatus === "REGISTERED") {
                yield (0, email_1.sendEmail)({
                    to: charity.email,
                    subject: "Complete Account Registration on AngelPage",
                    text: `Dear ${charity.name}, please complete your Charity Account Registration. One of your donations is waiting for admin approval.`,
                });
            }
            else if (!charity.stripeAccountId) {
                yield (0, email_1.sendEmail)({
                    to: charity.email,
                    subject: "Complete Your Charity Profile on AngelPage",
                    text: `Dear ${charity.name}, please complete your profile and set up your Stripe account to receive your funds. One of your donations is waiting for admin approval.`,
                });
            }
            else if (!charity.email) {
                // Notify the admin if the charity doesn't have an email address
                yield (0, email_1.sendEmail)({
                    to: process.env.ADMIN_EMAIL,
                    subject: `Charity ${charity.name} is missing email address`,
                    text: `Charity Name: ${charity.name}, Phone: ${charity.phoneNumber}, Address: ${charity.addresses[0].address},${charity.addresses[0].postcode},${charity.addresses[0].city},${charity.addresses[0].country} does not have an email address on file. Please contact them to complete their registration process, including Stripe account setup.`,
                });
            }
            else {
                yield (0, email_1.sendEmail)({
                    to: charity.email,
                    subject: "Funds Moved to Held Funds",
                    text: `Dear ${charity.charityName}, your funds have been moved to your held balance after 7 days of payment confirmation.`,
                });
            }
        }
    }
});
exports.automaticMoveToHeldFunds = automaticMoveToHeldFunds;
// Run the automatic check every day
setInterval(exports.automaticMoveToHeldFunds, 1000 * 3600 * 24); // Runs daily
// Admin approves funds release for a specific charity
const approveFundsRelease = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { charityId } = req.params;
    const charity = yield Charity_model_1.default.findById(charityId);
    if (!charity) {
        return res.status(404).json({ message: "Charity not found" });
    }
    // Only proceed if charity has totalHeldFunds and is eligible
    if (charity.totalHeldFunds < MINIMUM_THRESHOLD) {
        return res.status(400).json({ error: "Charity does not meet the minimum threshold" });
    }
    // Check if charity is registered
    if (charity.registrationStatus !== "REGISTERED") {
        return res.status(400).json({ error: "Charity is not fully registered" });
    }
    // Check if charity has a Stripe account
    if (!charity.stripeAccountId) {
        return res.status(400).json({ error: "Charity does not have a Stripe account" });
    }
    // Check if charity has an email address
    if (!charity.email) {
        // Notify admin if charity doesn't have an email address
        yield (0, email_1.sendEmail)({
            to: process.env.ADMIN_EMAIL,
            subject: `Charity ${charity.name} is missing email address`,
            text: `Charity Name: ${charity.name}, Phone: ${charity.phoneNumber}, Address: ${charity.addresses[0].address}, ${charity.addresses[0].postcode}, ${charity.addresses[0].city}, ${charity.addresses[0].country} does not have an email address on file. Please contact them to complete their registration process, including Stripe account setup.`,
        });
        return res.status(400).json({ error: "Charity does not have an email address" });
    }
    // Perform the transfer of funds to the charity's Stripe account
    try {
        yield stripe.transfers.create({
            amount: Math.round(charity.totalHeldFunds * 100),
            currency: "gbp",
            destination: charity.stripeAccountId,
            description: `Payout for charity ${charity.name}`,
        });
        // Reset the totalHeldFunds after the release
        charity.totalHeldFunds = 0;
        // Mark the funds as admin confirmed
        charity.adminConfirmed = true;
        yield charity.save();
        // Optionally, send email notifications here
        yield (0, email_1.sendEmail)({
            to: charity.email,
            subject: "Funds Released to Your Account",
            text: `Dear ${charity.name}, your funds have been released to your Stripe account.`,
        });
        console.log(`Released funds for charity ${charity.name}`);
        // Send success response
        res.status(200).json({ message: "Funds released and charity confirmed" });
    }
    catch (error) {
        console.error("Error approving funds release:", error);
        res.status(500).json({ message: "Error releasing funds", error });
    }
});
exports.approveFundsRelease = approveFundsRelease;
// 14-day automatic release if no admin approval
const automaticReleaseAfter14Days = () => __awaiter(void 0, void 0, void 0, function* () {
    const charities = yield Charity_model_1.default.find({
        totalHeldFunds: { $gte: MINIMUM_THRESHOLD },
        holdDate: { $ne: null },
    });
    const today = new Date();
    for (const charity of charities) {
        const daysSinceHold = Math.floor((today - charity.holdDate) / (1000 * 3600 * 24));
        if (daysSinceHold >= 14 && !charity.adminConfirmed) {
            yield (0, exports.releaseFunds)(charity);
        }
    }
});
exports.automaticReleaseAfter14Days = automaticReleaseAfter14Days;
// Release funds after admin confirmation or 14 days automatically
const releaseFunds = (charity) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Check charity registration, Stripe account, and email before proceeding
        if (charity.registrationStatus !== "REGISTERED") {
            return console.error(`Charity ${charity.name} is not fully registered.`);
        }
        if (!charity.stripeAccountId) {
            return console.error(`Charity ${charity.name} does not have a Stripe account.`);
        }
        if (!charity.email) {
            // Notify admin about missing email
            yield (0, email_1.sendEmail)({
                to: process.env.ADMIN_EMAIL,
                subject: `Charity ${charity.name} is missing email address`,
                text: `Charity Name: ${charity.name} does not have an email address on file. Please contact them to complete their registration process, including Stripe account setup.`,
            });
            return console.error(`Charity ${charity.name} does not have an email address.`);
        }
        yield stripe.transfers.create({
            amount: Math.round(charity.totalHeldFunds * 100),
            currency: "gbp",
            destination: charity.stripeAccountId,
            description: `Payout for charity ${charity.charityName}`,
        });
        // Reset the totalHeldFunds after the release
        charity.totalHeldFunds = 0;
        yield charity.save();
        // Optionally, send email notifications here
        yield (0, email_1.sendEmail)({
            to: charity.email,
            subject: "Funds Released to Your Account",
            text: `Dear ${charity.name}, your funds have been released to your Stripe account.`,
        });
        console.log(`Released funds for charity ${charity.name}`);
        // Optionally, send email notifications here
    }
    catch (error) {
        console.error("Error releasing funds:", error);
    }
});
exports.releaseFunds = releaseFunds;
// Run automatic fund release check every day
setInterval(exports.automaticReleaseAfter14Days, 1000 * 3600 * 24); // Runs daily
// POST: /api/stripe/onboard
const onBoarding = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { charityId } = req.body;
    const redirectUri = 'http://localhost:3000/';
    try {
        // Find the charity in the database
        const charity = yield Charity_model_1.default.findById(charityId);
        if (!charity)
            return res.status(404).json({ error: "Charity not found" });
        // If the charity already has a Stripe account, return the link
        if (charity.stripeAccountId) {
            return res.json({
                message: "Charity already has a Stripe account.",
                stripeAccountId: charity.stripeAccountId,
            });
        }
        // Create a new Stripe account for the charity
        const account = yield stripe.accounts.create({
            type: "express",
            country: "GB", // You can change the country based on your requirement
            email: charity.email,
            capabilities: { transfers: { requested: true } },
        });
        // Save the Stripe account ID in the charity document
        charity.stripeAccountId = account.id;
        yield charity.save();
        // Generate an onboarding link
        const accountLink = yield stripe.accountLinks.create({
            account: account.id,
            refresh_url: redirectUri,
            return_url: redirectUri,
            type: "account_onboarding",
        });
        // Send email with the Onboarding URL
        const onboardingUrl = accountLink.url;
        yield (0, exports.sendStripeMissingInfoEmail)(charity, onboardingUrl);
        // Return the onboarding URL to the frontend
        res.json({ onboardingUrl: accountLink.url });
    }
    catch (error) {
        console.error("Error onboarding charity:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.onBoarding = onBoarding;
// Webhook to listen to Stripe events
const accountUpdateEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        // Verify the webhook signature to ensure the event is from Stripe
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        // Handle the event
        if (event.type === 'account.updated') {
            const account = event.data.object; // Stripe account object
            // Check if additional information is required
            if (account.requirements && account.requirements.pending_verification) {
                // Send email to the charity notifying them about missing information
                const charity = yield Charity_model_1.default.findOne({ stripeAccountId: account.id });
                if (charity) {
                    // Send email to charity
                    yield (0, exports.sendStripeMissingInfoEmail)(charity);
                }
            }
        }
        // Respond to Stripe that the event has been received successfully
        res.status(200).send('Event received');
    }
    catch (err) {
        // If event signature verification fails
        console.log(`Webhook Error: ${err.message}`);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});
exports.accountUpdateEvent = accountUpdateEvent;
const sendStripeMissingInfoEmail = (charity, onboardingUrl) => __awaiter(void 0, void 0, void 0, function* () {
    const message = `
    Dear ${charity.charityName},

    We noticed that your Stripe account is missing some important information. To continue receiving payments, please complete the following steps in your Stripe dashboard:
    
    **Required Information:**
    - Identity Verification (Government-issued ID).
    - Bank Account Details (for payouts).
    
    You can complete the verification here: <a href="${onboardingUrl}">Complete Your Stripe Setup</a>

    Please complete the required steps to avoid any disruptions in receiving payments.

    Best regards,
    Your Team
  `;
    try {
        // Send email to charity
        yield (0, email_1.sendEmail)({
            to: charity.email,
            subject: 'Action Required: Complete Your Stripe Account Onboarding',
            text: message,
            html: `<p>${message}</p>`,
        });
        // Send email to admin if charity email is missing
        if (!charity.email) {
            const adminMessage = `
        Dear Admin,

        The charity ${charity.charityName} (ID: ${charity._id}) is missing some important details in their Stripe account. They need to complete the following:
        - Identity Verification (Government-issued ID).
        - Bank Account Details (for payouts).
        
        Please reach out to them to complete these details.

        Best regards,
        Your Team
      `;
            yield (0, email_1.sendEmail)({
                to: process.env.ADMIN_EMAIL,
                subject: `Charity Missing Information: ${charity.charityName}`,
                text: adminMessage,
                html: `<p>${adminMessage}</p>`,
            });
        }
    }
    catch (error) {
        console.error('Error sending missing info email:', error);
    }
});
exports.sendStripeMissingInfoEmail = sendStripeMissingInfoEmail;
