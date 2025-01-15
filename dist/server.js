"use strict";
// import express from "express";
// import dotenv from "dotenv";
// import http from "http";
// import { Server, Socket } from "socket.io";
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
// const server = http.createServer(app);
// // Load environment variables
// const PORT = process.env.PORT || 5000;
// // Middleware
// const FRONT_PORT = process.env.FRONTEND_BASE_URL || "http://localhost:3000";
// const io = new Server(server, {
// 	cors:{
// 		origin: FRONT_PORT, // Allow the frontend URL
// 		methods: ["GET", "POST", "PUT", "DELETE"],
// 		credentials: true, // Allow cookies if necessary
// 	},
// });
// // Middleware Setup
// app.use(cors());
// app.use(bodyParser.json()); // Parse JSON bodies
// app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies
// // Connect to the database
// connectDB();
// io.on("connection", (socket: Socket) => {
// 	console.log("A user connected");
// 	socket.on("new-notification", (data: any) => {
// 		console.log("New notification received:", data);
// 	});
// 	socket.on("disconnect", () => {
// 		console.log("User disconnected");
// 	});
// });
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
// server.js
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const database_1 = __importDefault(require("./config/database")); // Your DB connection logic
const routes_1 = __importDefault(require("./routes")); // Your API routes
const error_middleware_1 = __importDefault(require("./middlewares/error.middleware")); // Error handling middleware
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app); // Create an HTTP server to work with Socket.IO
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.FRONTEND_BASE_URL || "http://localhost:3000", // Allow frontend URL
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true, // Allow cookies if necessary
    },
});
// Middleware Setup
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json()); // Parse JSON bodies
app.use(body_parser_1.default.urlencoded({ extended: true })); // Parse URL-encoded bodies
// Connect to MongoDB
(0, database_1.default)();
io.on("connection", (socket) => {
    console.log("A user connected");
    socket.on("new-notification", (data) => {
        console.log("New notification received:", data);
    });
    socket.on("disconnect", () => {
        console.log("User disconnected");
    });
});
// Basic route for health check
app.get('/', (req, res) => {
    res.send('Backend server is running!');
});
// API Routes
app.use('/api', routes_1.default);
// Catch-all route for 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
    });
});
// Error handling middleware
app.use(error_middleware_1.default); // Add error handling middleware
// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
