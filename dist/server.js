"use strict";
// import express from "express";
// import dotenv from "dotenv";
// import cors from "cors";
// import bodyParser from "body-parser";
// import connectDB from "./config/database";
// import routes from "./routes/index"; // Import routes
// import errorHandler from "./middlewares/error.middleware"; // Import error handling middleware
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// dotenv.config();
// const app = express();
// // Load environment variables
// const PORT = process.env.PORT || 5000;
// // Middleware
// const FRONT_PORT = process.env.FRONTEND_BASE_URL || "http://localhost:3000";
// app.use(
// 	cors({
// 		origin: FRONT_PORT, // Allow the frontend URL
// 		methods: ["GET", "POST", "PUT", "DELETE"],
// 		credentials: true, // Allow cookies if necessary
// 	}),
// );
// app.use(bodyParser.json()); // Parse JSON bodies
// app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies
// // Connect to the database
// connectDB();
// // Basic Route for Health Check
// app.get("/", (req, res) => {
// 	res.send("Backend server is running!");
// });
// // API Routes
// app.use("/api", routes); // Prefix all routes with /api
// // Catch-All Route (404 Handling)
// app.use((req, res, next) => {
// 	res.status(404).json({
// 		success: false,
// 		message: "API endpoint not found",
// 	});
// });
// // Error handling middleware
// app.use(errorHandler); // Add the error handling middleware
// // Start the server
// app.listen(PORT, () => {
// 	console.log(`✅ Server is running on http://localhost:${PORT}`);
// });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const database_1 = __importDefault(require("./config/database"));
const index_1 = __importDefault(require("./routes/index")); // Import routes
const error_middleware_1 = __importDefault(require("./middlewares/error.middleware")); // Import error handling middleware
dotenv_1.default.config();
const app = (0, express_1.default)();
// Load environment variables
const PORT = process.env.PORT || 5000;
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || "http://localhost:3000";
// Middleware
app.use((0, cors_1.default)({
    origin: FRONTEND_BASE_URL, // Adjust to the frontend's URL in production
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"], // Add PATCH if needed
    credentials: true, // Allow cookies if using session-based authentication
}));
app.use(body_parser_1.default.json()); // Parse JSON bodies
app.use(body_parser_1.default.urlencoded({ extended: true })); // Parse URL-encoded bodies
// Connect to the database
(0, database_1.default)();
// Basic Route for Health Check
app.get("/", (req, res) => {
    res.send("Backend server is running!");
});
// API Routes
app.use("/api", index_1.default); // Prefix all routes with /api
// Catch-All Route (404 Handling)
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found",
    });
});
// Error handling middleware
app.use(error_middleware_1.default); // Add the error handling middleware
// Start the server
app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});
