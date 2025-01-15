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
import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import connectDB from "./config/database"; // Your DB connection logic
import routes from "./routes"; // Your API routes
import errorHandler from "./middlewares/error.middleware"; // Error handling middleware

dotenv.config();

const app = express();
const server = http.createServer(app); // Create an HTTP server to work with Socket.IO
const io = new Server(server, {
	cors: {
		origin: process.env.FRONTEND_BASE_URL || "http://localhost:3000", // Allow frontend URL
		methods: ["GET", "POST", "PUT", "DELETE"],
		credentials: true, // Allow cookies if necessary
	},
});

// Middleware Setup
app.use(cors());
app.use(bodyParser.json()); // Parse JSON bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Connect to MongoDB
connectDB();

io.on("connection", (socket: Socket) => {
	console.log("A user connected");

	socket.on("new-notification", (data: any) => {
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
app.use('/api', routes);

// Catch-all route for 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
  });
});

// Error handling middleware
app.use(errorHandler); // Add error handling middleware

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

