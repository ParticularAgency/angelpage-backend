import { Request, Response } from "express";
import { UserService } from "./users.service";

const userService = new UserService();

// User Registration
export const registerUser = async (req: Request, res: Response) => {
	try {
		const { name, email, password } = req.body; // Destructure to get name, email, password
		if (!name || !email || !password) {
			return res
				.status(400)
				.json({ message: "Name, email, and password are required." }); // Respond with error
		}
		const newUser = await userService.registerUser(req.body); // Pass the entire body
		res.status(201).json(newUser); // Respond with the new user data
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// User Login
export const loginUser = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body; // Get email and password from request body

        // Check if email and password are provided
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        // Authenticate user
        const user = await userService.loginUser(email, password);
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password." }); // Unauthorized
        }

        // Successful login
        res.status(200).json({ message: "Login successful.", user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// // Update User Profile
// export const updateUserProfile = async (req: Request, res: Response) => {
// 	try {
// 		const userId = req.user.id; // Assume user ID is available from middleware
// 		const updatedUser = await userService.updateUserProfile(userId, req.body);
// 		res.status(200).json(updatedUser);
// 	} catch (error) {
// 		res.status(500).json({ message: error.message });
// 	}
// };

// // Get User Profile
// export const getUserProfile = async (req: Request, res: Response) => {
// 	try {
// 		const userId = req.user.id; // Get user ID from middleware
// 		const userProfile = await userService.getUserProfile(userId);
// 		res.status(200).json(userProfile);
// 	} catch (error) {
// 		res.status(500).json({ message: error.message });
// 	}
// };

// // Get User Products
// export const getUserProducts = async (req: Request, res: Response) => {
// 	try {
// 		const userId = req.user.id; // Get user ID from middleware
// 		const products = await userService.getUserProducts(userId);
// 		res.status(200).json(products);
// 	} catch (error) {
// 		res.status(500).json({ message: error.message });
// 	}
// };

// // Get Favorite Products
// export const getFavoriteProducts = async (req: Request, res: Response) => {
// 	try {
// 		const userId = req.user.id; // Get user ID from middleware
// 		const favorites = await userService.getFavoriteProducts(userId);
// 		res.status(200).json(favorites);
// 	} catch (error) {
// 		res.status(500).json({ message: error.message });
// 	}
// };

// // Get User Orders
// export const getUserOrders = async (req: Request, res: Response) => {
// 	try {
// 		const userId = req.user.id; // Get user ID from middleware
// 		const orders = await userService.getUserOrders(userId);
// 		res.status(200).json(orders);
// 	} catch (error) {
// 		res.status(500).json({ message: error.message });
// 	}
// };

// // Get Order Details
// export const getOrderDetails = async (req: Request, res: Response) => {
// 	try {
// 		const userId = req.user.id; // Get user ID from middleware
// 		const orderId = req.params.orderId;
// 		const orderDetails = await userService.getOrderDetails(userId, orderId);
// 		res.status(200).json(orderDetails);
// 	} catch (error) {
// 		res.status(404).json({ message: error.message }); // Not found
// 	}
// };

// // Get Charity List
// export const getCharityList = async (req: Request, res: Response) => {
// 	try {
// 		const charities = await userService.getCharityList();
// 		res.status(200).json(charities);
// 	} catch (error) {
// 		res.status(500).json({ message: error.message });
// 	}
// };

// // Get Charity Details
// export const getCharityDetails = async (req: Request, res: Response) => {
// 	try {
// 		const charityId = req.params.charityId;
// 		const charityDetails = await userService.getCharityDetails(charityId);
// 		res.status(200).json(charityDetails);
// 	} catch (error) {
// 		res.status(404).json({ message: error.message }); // Not found
// 	}
// };

// // Donate to a Charity
// export const donateToCharity = async (req: Request, res: Response) => {
// 	try {
// 		const charityId = req.params.charityId;
// 		const userId = req.user.id; // Get user ID from middleware
// 		const donationData = req.body; // Donation amount and other data
// 		const donation = await userService.donateToCharity(
// 			userId,
// 			charityId,
// 			donationData,
// 		);
// 		res.status(201).json(donation); // Respond with donation details
// 	} catch (error) {
// 		res.status(500).json({ message: error.message });
// 	}
// };
