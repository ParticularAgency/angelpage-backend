import User, { IUser } from "../../models/User.model"; // Adjust path as needed
import bcrypt from "bcrypt";

export class UserService {
	// Register User
	async registerUser(userData: {
		name: string;
		email: string;
		password: string;
	}): Promise<IUser> {
		const { name, email, password } = userData;

		// Validate input
		if (!name || !email || !password) {
			throw new Error("All fields are required.");
		}

		// Hash the password before saving to the database
		const hashedPassword = await bcrypt.hash(password, 10);
		const newUser = new User({
			name,
			email,
			password: hashedPassword,
		});

		return await newUser.save();
	}

	// Example of another method
	async getUserById(userId: string): Promise<IUser | null> {
		return await User.findById(userId).exec();
	}

	// User login method
	async loginUser(email: string, password: string) {
		// Find user by email
		const user = await User.findOne({ email });
		if (!user) return null; // User not found

		// Check if the provided password matches the stored hashed password
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) return null; // Passwords do not match

		// Optionally, you can return user data without password
		const { password: _, ...userData } = user.toObject(); // Exclude password
		return userData; // Return user data
	}

	// // Update User Profile
	// async updateUserProfile(userId, updates) {
	// 	const updatedUser = await User.findByIdAndUpdate(userId, updates, {
	// 		new: true,
	// 	});
	// 	return updatedUser;
	// }


	// // Get User Profile
	// async getUserProfile(userId) {
	// 	const userProfile = await User.findById(userId);
	// 	return userProfile;
	// }

	// // Get User Products
	// async getUserProducts(userId) {
	// 	const products = await Product.find({ owner: userId });
	// 	return products;
	// }

	// // Get Favorite Products
	// async getFavoriteProducts(userId) {
	// 	const user = await User.findById(userId).populate("favorites");
	// 	return user.favorites;
	// }

	// // Get User Orders
	// async getUserOrders(userId) {
	// 	// Logic to fetch user orders
	// 	// Assuming you have an Order model
	// }

	// // Get Order Details
	// async getOrderDetails(userId, orderId) {
	// 	// Logic to fetch order details
	// }

	// // Get Charity List
	// async getCharityList() {
	// 	const charities = await Charity.find();
	// 	return charities;
	// }

	// // Get Charity Details
	// async getCharityDetails(charityId) {
	// 	const charityDetails = await Charity.findById(charityId);
	// 	return charityDetails;
	// }

	// // Donate to a Charity
	// async donateToCharity(userId, charityId, donationData) {
	// 	// Logic for processing donation
	// }
}
