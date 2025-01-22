
import multer from "multer";
import xlsx from "xlsx";
import cloudinary from "../../config/cloudinary";
import Charity from "../../models/Charity.model";
import bcrypt from "bcryptjs";
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2020-08-27' });
// Set up Multer for file uploads
const upload = multer({
	storage: multer.memoryStorage(), // Store file in memory for processing
	limits: { fileSize: 50 * 1024 * 1024 }, // Limit file size to 10MB
});
// Update profile function
export const updateProfile = async (req, res) => {
	try {
		const { userId } = req.user; // Assumes userId is set by middleware
		const {
			firstName,
			lastName,
			dateBirth,
			email,
			userName,
			description,
			charityPhone,
			websiteLink,
			currentPassword,
			newPassword,
		} = req.body;

		// Retrieve user document
		const user = await Charity.findById(userId);
		if (!user) return res.status(404).json({ message: "User not found" });

		const updateData = {};

		// Handle password update if both current and new passwords are provided
		if (currentPassword && newPassword) {
			const isPasswordCorrect = await bcrypt.compare(
				currentPassword,
				user.password,
			);
			if (!isPasswordCorrect)
				return res
					.status(400)
					.json({ message: "Current password is incorrect" });
			updateData.password = await bcrypt.hash(newPassword, 10);
		}

		// Conditionally add other fields to the update data if they are provided
		if (firstName) updateData.firstName = firstName;
		if (lastName) updateData.lastName = lastName;
		if (dateBirth) updateData.dateBirth = dateBirth;
		if (email) updateData.email = email;
		if (userName) updateData.userName = userName;
		if (charityPhone) updateData.charityPhone = charityPhone;
		if (websiteLink) updateData.websiteLink = websiteLink;
		if (description) updateData.description = description;

		// Handle profile image upload
		if (req.files && req.files.profileImage) {
			const result = await cloudinary.uploader.upload(
				req.files.profileImage[0].path,
				{
					folder: "user_profiles",
					public_id: `user_${userId}`,
					overwrite: true,
				},
			);
			updateData.profileImage = result.secure_url;
		}

		// Handle charity banner image upload
		if (req.files && req.files.charityBannerImage) {
			const result = await cloudinary.uploader.upload(
				req.files.charityBannerImage[0].path,
				{
					folder: "charity_images",
					public_id: `charity_${userId}`,
					overwrite: true,
				},
			);
			updateData.charityBannerImage = result.secure_url;
		}
		const updatedUser = await Charity.findByIdAndUpdate(userId, updateData, {
			new: true,
		});

		res
			.status(200)
			.json({ message: "Profile updated successfully", user: updatedUser });
	} catch (error) {
		console.error("Error updating profile:", error);
		res.status(500).json({ message: "Failed to update profile", error });
	}
};

// Get charity profile function
export const getCharityProfile = async (req, res) => {
	try {
		const userId = req.user?.userId;
		if (!userId)
			return res.status(400).json({ message: "User ID is required" });

		const user = await Charity.findById(userId).select("-password");
		if (!user) return res.status(404).json({ message: "User not found" });

		res.status(200).json({ user });
	} catch (error) {
		console.error("Error fetching user profile:", error);
		res
			.status(500)
			.json({ message: "Failed to fetch user profile", error: error.message });
	}
};

// Update profile function
export const updateCharityAdminInfo = async (req, res) => {
	try {
		const { userId } = req.user; // userId should be set by the auth middleware
		const { charityName, charityNumber, charityID, description,phoneNumber,websiteLink } = req.body;

		const user = await Charity.findById(userId);
		if (!user) return res.status(404).json({ message: "User not found" });

		Object.assign(user, {
			charityName,
			charityNumber,
			charityID,
			description,
			phoneNumber,
			websiteLink,
		});

		await user.save();
		res.status(200).json({ message: "Profile updated successfully", user });
	} catch (error) {
		console.error("Error updating profile:", error);
		res.status(500).json({ message: "Failed to update profile", error });
	}
};

// Get charity profile function
export const getCharityAdminInfo = async (req, res) => {
	try {
		const userId = req.user?.userId;
		if (!userId)
			return res.status(400).json({ message: "User ID is required" });

		const user = await Charity.findById(userId).select("-password");
		if (!user) return res.status(404).json({ message: "User not found" });

		res.status(200).json({ user });
	} catch (error) {
		console.error("Error fetching user profile:", error);
		res
			.status(500)
			.json({ message: "Failed to fetch user profile", error: error.message });
	}
};
// Add address function
export const addAddress = async (req, res) => {
	try {
		const { userId } = req.user;
		const newAddress = req.body; // Expects address data in the request body

		const user = await Charity.findById(userId);
		if (!user) return res.status(404).json({ message: "User not found" });

		user.addresses.push(newAddress);
		await user.save();

		res.status(201).json({
			message: "Address added successfully",
			addresses: user.addresses,
		});
	} catch (error) {
		console.error("Error adding address:", error);
		res.status(500).json({ message: "Failed to add address", error });
	}
};

// Update address function
export const updateAddress = async (req, res) => {
	try {
		const { userId } = req.user;
		const { addressId } = req.params;
		const updatedAddress = req.body;

		const user = await Charity.findById(userId);
		if (!user) return res.status(404).json({ message: "User not found" });

		const address = user.addresses.id(addressId);
		if (!address) return res.status(404).json({ message: "Address not found" });

		Object.assign(address, updatedAddress);
		await user.save();

		res.status(200).json({
			message: "Address updated successfully",
			addresses: user.addresses,
		});
	} catch (error) {
		console.error("Error updating address:", error);
		res.status(500).json({ message: "Failed to update address", error });
	}
};

// Delete address function
export const deleteAddress = async (req, res) => {
	try {
		const { userId } = req.user;
		const { addressId } = req.params;

		const user = await Charity.findById(userId);
		if (!user) return res.status(404).json({ message: "User not found" });

		user.addresses = user.addresses.filter(
			address => address._id.toString() !== addressId,
		);
		await user.save();

		res.status(200).json({
			message: "Address deleted successfully",
			addresses: user.addresses,
		});
	} catch (error) {
		console.error("Error deleting address:", error);
		res.status(500).json({ message: "Failed to delete address", error });
	}
};


// payment methodes schamas start here

export const addPayment = async (req, res) => {
	try {
		const { userId } = req.user;
		const newPayment = req.body; // Assumes payment data is in the request body

		const user = await Charity.findById(userId);
		if (!user) return res.status(404).json({ message: "User not found" });

		// Add the new payment to the user's payments array
		user.payments.push(newPayment);
		await user.save();

		res.status(201).json({
			message: "Payment method added successfully",
			payments: user.payments,
		});
	} catch (error) {
		console.error("Error adding payment:", error);
		res.status(500).json({ message: "Failed to add payment method", error });
	}
};

export const updatePayment = async (req, res) => {
	try {
		const { userId } = req.user;
		const { paymentId } = req.params;
		const updatedPayment = req.body;

		const user = await Charity.findById(userId);
		if (!user) return res.status(404).json({ message: "User not found" });

		const payment = user.payments.id(paymentId);
		if (!payment)
			return res.status(404).json({ message: "Payment method not found" });

		// Update the payment details
		Object.assign(payment, updatedPayment);
		await user.save();

		res.status(200).json({
			message: "Payment method updated successfully",
			payments: user.payments,
		});
	} catch (error) {
		console.error("Error updating payment:", error);
		res.status(500).json({ message: "Failed to update payment method", error });
	}
};

export const deletePayment = async (req, res) => {
	try {
		const { userId } = req.user;
		const { paymentId } = req.params;

		const user = await Charity.findById(userId);
		if (!user) return res.status(404).json({ message: "User not found" });

		// Filter out the payment method to delete
		user.payments = user.payments.filter(
			payment => payment._id.toString() !== paymentId,
		);
		await user.save();

		res.status(200).json({
			message: "Payment method deleted successfully",
			payments: user.payments,
		});
	} catch (error) {
		console.error("Error deleting payment:", error);
		res.status(500).json({ message: "Failed to delete payment method", error });
	}
};


// Storefront data - Public Access
export const getStorefrontData = async (req, res) => {
	try {
		const { storefrontid } = req.params;

		// Logging received storefront ID
		console.log("Received storefrontid:", storefrontid);

		// Query the charity using the provided storefront ID
		const charity = await Charity.findOne({ storefrontId: storefrontid })
			.select(
				"charityName charityNumber storefrontId description profileImage charityBannerImage addresses listedProducts"
			)
			.populate("listedProducts");

		// Check if the charity exists
		if (!charity) {
			console.log("No charity found for storefrontId:", storefrontid);
			return res.status(404).json({ message: "Charity not found" });
		}

		// Respond with the charity data
		console.log("Charity data:", charity);
		res.status(200).json({ charity });
	} catch (error) {
		console.error("Error fetching storefront data:", error);
		res.status(500).json({ message: "Failed to fetch storefront data", error: error.message });
	}
};

// Get Charities with Pagination and Search
export const getCharityList = async (req, res) => {
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
		const charities = await Charity.find(searchQuery)
			.skip(skip) // Skip the number of documents based on page and limit
			.limit(pageLimit) // Limit the number of results per page
			.select('charityName charityNumber description phoneNumber websiteLink profileImage charityBannerImage')
			.lean(); // Use lean for better performance

		// Get the total number of charities to calculate the total pages
		const totalCharities = await Charity.countDocuments(searchQuery);

		// Calculate total pages
		const totalPages = Math.ceil(totalCharities / pageLimit);

		res.status(200).json({
			charities,
			totalPages,
			currentPage: pageNumber,
			totalCharities,
		});
	} catch (error) {
		console.error('Error fetching charities:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};

// Get Charity Details - Public Access
export const getCharityDetails = async (req, res) => {
	try {
		const { charityid } = req.params; // Correctly retrieve `charityid`
		if (!charityid) {
			return res.status(400).json({ message: 'Charity ID is required' });
		}

		const charity = await Charity.findById(charityid)
			.select(
				'charityName charityNumber description phoneNumber websiteLink profileImage charityBannerImage addresses listedProducts'
			)
			.populate('listedProducts');

		if (!charity) {
			return res.status(404).json({ message: 'Charity not found' });
		}

		res.status(200).json({ charity });
	} catch (error) {
		console.error('Error fetching charity details:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};

// Endpoint to generate Stripe Connect OAuth URL
export const generateStripeOAuthUrl = async (_req, res) => {
	// const redirectUri = `${process.env.FRONTEND_BASE_URL}/`; // URL to redirect after Stripe authentication
	const redirectUri = 'http://localhost:3000/stripe/callback';

	try {
		// Generate the Stripe Connect OAuth URL
		const oauthUrl = stripe.oauth.authorizeUrl({
			scope: 'read_write',
			redirect_uri: redirectUri,
			client_id: process.env.STRIPE_CLIENT_ID,
		});

		// Send the OAuth URL to the frontend
		res.json({ url: oauthUrl });
	} catch (error) {
		console.error('Error generating Stripe OAuth URL:', error);
		res.status(500).json({ error: 'Failed to generate Stripe OAuth URL' });
	}
};


// Handle the Stripe OAuth callback
export const stripeOAuthCallback = async (req, res) => {
	const { code } = req.query;
	const { userId, role } = req.user;
	console.log("req.user:", req.user);
	console.log("Stripe OAuth Token Response:", response);
	console.log("Saving Stripe account ID for charity:", charity);

	if (!code) {
		return res.status(400).json({ message: "Authorization code not found." });
	}

	try {
		// Exchange the authorization code for an access token
		const response = await stripe.oauth.token({
			grant_type: "authorization_code",
			code: req.query.code,
		});

		const stripeAccountId = response.stripe_user_id; // Extract Stripe account ID
		console.log('Connected account ID:', stripeAccountId);

		// Ensure the user is a charity
		if (role !== "Charity") {
			return res.status(403).json({ message: "Unauthorized. Only charities can connect a Stripe account." });
		}

		// Find the charity by userId
		const charity = await Charity.findById(userId);
		if (!charity) {
			return res.status(404).json({ message: "Charity not found." });
		}

		// Save the Stripe account ID
		charity.stripeAccountId = stripeAccountId;
		await charity.save();

		console.log(`Stripe account connected successfully for charity: ${charity._id}`);

		// Return success response
		return res.status(200).json({
			message: "Stripe account connected successfully",
			stripeAccountId,
		});
	} catch (error) {
		console.error("Stripe OAuth error:", error);

		if (error.type === "StripeInvalidGrantError") {
			return res.status(400).json({ message: "Invalid authorization code." });
		}

		return res.status(500).json({ message: "Error connecting Stripe account.", error: error.message });
	}
};

// Middleware to handle file upload
export const uploadMiddleware = upload.single("file");

export const uploadCharityList = async (req, res) => {
	try {
		// Ensure a file was uploaded
		if (!req.file) {
			return res.status(400).json({ message: "No file uploaded." });
		}

		// Parse the uploaded file using xlsx
		const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
		const sheetName = workbook.SheetNames[0]; // Get the first sheet
		const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

		if (!sheetData || sheetData.length === 0) {
			return res.status(400).json({ message: "Excel file is empty or invalid." });
		}

		// Log parsed data for debugging
		console.log("Parsed Excel data:", sheetData);

		// Map each row to the Charity schema
		const charities = sheetData.map((row, index) => {
			// Ensure a unique storefrontId is assigned to each charity
			const storefrontId = uuidv4(); // Generate unique storefrontId

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
						address: row.address || `Address ${index + 1}`,  // Assuming address exists in the sheet
						city: row.city || `City ${index + 1}`,  // Assuming city exists in the sheet
						country: row.country || 'GB',  // Defaulting to GB
						postcode: row.postcode || `Postcode ${index + 1}`,  // Assuming postcode exists in the sheet
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
		const createdCharities = await Charity.insertMany(charities);

		// Respond with success message
		res.status(201).json({
			message: "Charities uploaded successfully.",
			charities: createdCharities,
		});
	} catch (error) {
		// Log any error and respond with failure message
		console.error("Error uploading charities:", error);
		res.status(500).json({ message: "Failed to upload charities.", error });
	}
};

// Register charity with password
export const registerCharity = async (req, res) => {
	try {
		const { storefrontId, password } = req.body;

		// Find the charity using the storefrontId
		const charity = await Charity.findOne({ storefrontId });
		if (!charity) {
			return res.status(404).json({ message: 'Charity not found' });
		}

		// Encrypt the password before saving it
		const hashedPassword = await bcrypt.hash(password, 10);

		// Update the charity record with the new password and set registration status to "REGISTERED"
		charity.password = hashedPassword;
		charity.registrationStatus = 'REGISTERED';

		await charity.save();

		res.status(200).json({ message: 'Registration successful!' });
	} catch (error) {
		console.error('Error registering charity:', error);
		res.status(500).json({ message: 'Registration failed', error: error.message });
	}
};