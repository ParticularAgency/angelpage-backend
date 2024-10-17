import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import connectDB from "./config/database";
import routes from "./routes/index"; // Import routes
import errorHandler from "./middlewares/error.middleware"; // Import error handling middleware

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all routes
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

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
