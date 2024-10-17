import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const connectDB = async () => {
	try {
		const mongoURI = process.env.MONGO_URI; // Get the MongoDB URI from environment variables
		if (!mongoURI) {
			throw new Error("MongoDB URI is not defined in .env");
		}

		// Connect to MongoDB without deprecated options
		await mongoose.connect(mongoURI);
		console.log("MongoDB Connected");
	} catch (error) {
		console.error("MongoDB connection error:", error);
		process.exit(1);
	}
};

export default connectDB;	
