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
exports.getIO = void 0;
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
// server.js — dotenv must load before any module that reads process.env at import time
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const database_1 = __importDefault(require("./config/database"));
const routes_1 = __importDefault(require("./routes"));
const error_middleware_1 = __importDefault(require("./middlewares/error.middleware"));
const products_routes_js_1 = __importDefault(require("./api/products/products.routes.js"));
const socket_1 = require("./config/socket");
Object.defineProperty(exports, "getIO", { enumerable: true, get: function () { return socket_1.getIO; } });
const escrowAutoRelease_service_js_1 = require("./services/escrowAutoRelease.service.js");
const index_js_1 = require("./workers/index.js");
const rateLimit_middleware_js_1 = require("./middlewares/rateLimit.middleware.js");
require("./config/jwtSecret.js");
const emailConfig_js_1 = require("./utils/emailConfig.js");
const stripe_webhook_js_1 = require("./api/webhooks/stripe.webhook.js");
const webhooks_controller_js_1 = require("./api/webhooks/webhooks.controller.js");
(0, emailConfig_js_1.validateEmailConfig)();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// ✅ CORS Configuration (Fixes Mac/iOS Issues)
const corsOptions = {
    origin: process.env.FRONTEND_BASE_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Guest-Order-Token'],
    credentials: true,
};
app.use((0, cors_1.default)(corsOptions));
app.options('*', (0, cors_1.default)(corsOptions)); // Handle preflight requests
// Stripe + Shopify webhooks require the raw request body for signature verification
app.post('/api/webhooks/stripe', express_1.default.raw({ type: 'application/json' }), stripe_webhook_js_1.handleStripeWebhook);
app.post('/api/webhooks/shopify', express_1.default.raw({ type: 'application/json' }), webhooks_controller_js_1.handleShopifyWebhook);
// ✅ Middleware
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use('/api/auth', rateLimit_middleware_js_1.authRateLimiter);
app.use('/api', rateLimit_middleware_js_1.apiRateLimiter);
app.use(['/api/order', '/api/cart', '/api/products/create', '/api/email'], rateLimit_middleware_js_1.writeRateLimiter);
// ✅ Connect to MongoDB
(0, database_1.default)();
// ✅ Setup Socket.IO (messaging, notifications, real-time events)
(0, socket_1.initSocket)(server);
// ✅ Health Check Route
app.get('/', (req, res) => {
    res.send('✅ Backend server is running!');
});
// ✅ Public Route: Charity Products (open CORS + caching)
// ============================================================
// ✅ PUBLIC ENDPOINTS (no auth, open CORS + caching)
// ============================================================
// 🟢 1. All Charity Products
app.use("/api/products/all-charity-products", (0, cors_1.default)({ origin: "*", methods: ["GET"] }), (req, res, next) => {
    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600"); // 1 hour cache
    next();
}, products_routes_js_1.default);
// 🟢 2. Charity-specific Products
app.use("/api/products/charity", (0, cors_1.default)({ origin: "*", methods: ["GET"] }), (req, res, next) => {
    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    next();
}, products_routes_js_1.default);
// 🟢 3. All Available Charities
app.use("/api/products/charities", (0, cors_1.default)({ origin: "*", methods: ["GET"] }), (req, res, next) => {
    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    next();
}, products_routes_js_1.default);
// ✅ API Routes (Ensure Your Frontend Calls `/api/products/create`)
app.use('/api', routes_1.default);
// ✅ Debugging for Incorrect API Calls
app.use((req, res) => {
    console.log(`🚨 API Not Found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
    });
});
// ✅ Error Handling Middleware
app.use(error_middleware_1.default);
// ✅ Start the Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    (0, escrowAutoRelease_service_js_1.startEscrowAutoReleaseJob)();
    (0, index_js_1.startWorkers)().catch((err) => console.error('[workers] failed to start:', err));
});
