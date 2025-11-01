// import express from "express";
// import dotenv from "dotenv";
// import http from "http";
// import { Server, Socket } from "socket.io";
// import cors from "cors";
// import bodyParser from "body-parser";
// import connectDB from "./config/database";
// import routes from "./routes/index"; // Import routes
// import errorHandler from "./middlewares/error.middleware"; // Import error handling middleware

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
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import connectDB from './config/database'; // Your MongoDB connection logic
import routes from './routes'; // Your API routes
import errorHandler from './middlewares/error.middleware'; // Error handling middleware
import productsRoutes from './api/products/products.routes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// ✅ CORS Configuration (Fixes Mac/iOS Issues)
app.use(
  cors({
    origin: process.env.FRONTEND_BASE_URL || 'http://localhost:3000', // Allow frontend domain
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // Allow cookies if necessary
  })
);
app.options('*', cors()); // Handle preflight requests

// ✅ Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ Connect to MongoDB
connectDB();

// ✅ Setup Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_BASE_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// ✅ Socket.IO Events
io.on('connection', socket => {
  console.log('A user connected');

  socket.on('new-notification', data => {
    console.log('New notification received:', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// ✅ Health Check Route
app.get('/', (req, res) => {
  res.send('✅ Backend server is running!');
});
// ✅ Public Route: Charity Products (open CORS + caching)
// ============================================================
// ✅ PUBLIC ENDPOINTS (no auth, open CORS + caching)
// ============================================================
// 🟢 1. All Charity Products
app.use(
  "/api/products/all-charity-products",
  cors({ origin: "*", methods: ["GET"] }),
  (req, res, next) => {
    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600"); // 1 hour cache
    next();
  },
  productsRoutes
);

// 🟢 2. Charity-specific Products
app.use(
  "/api/products/charity",
  cors({ origin: "*", methods: ["GET"] }),
  (req, res, next) => {
    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    next();
  },
  productsRoutes
);

// 🟢 3. All Available Charities
app.use(
  "/api/products/charities",
  cors({ origin: "*", methods: ["GET"] }),
  (req, res, next) => {
    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    next();
  },
  productsRoutes
);

// ✅ API Routes (Ensure Your Frontend Calls `/api/products/create`)
app.use('/api', routes);

// ✅ Debugging for Incorrect API Calls
app.use((req, res) => {
  console.log(`🚨 API Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
  });
});

// ✅ Error Handling Middleware
app.use(errorHandler);

// ✅ Start the Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
