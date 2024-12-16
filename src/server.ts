import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import connectDB from "./config/database";
import routes from "./routes/index"; // Import routes
import errorHandler from "./middlewares/error.middleware"; // Import error handling middleware

const app = express();

// Middleware
app.use(
	cors({
		origin: process.env.FRONTEND_BASE_URL || "http://localhost:3000", // Use environment variable for frontend's URL
		methods: ["GET", "POST", "PUT", "DELETE"], // Allow specific HTTP methods
		credentials: true, // Enable cookies if using session-based authentication
	}),
);
app.use(bodyParser.json()); // Parse JSON bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Connect to the database
connectDB();

// Basic Route
app.get("/api", (req, res) => {
	res.send("Welcome to the API!");
});

// Use the routes
app.use("/api", routes); // Prefix all routes with /api

// Error handling middleware
app.use(errorHandler); // Add the error handling middleware

// Export the app (Vercel requires this)
export default app;
