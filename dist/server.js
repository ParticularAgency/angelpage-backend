"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const database_1 = __importDefault(require("./config/database"));
const index_1 = __importDefault(require("./routes/index")); // Import routes
const error_middleware_1 = __importDefault(require("./middlewares/error.middleware")); // Import error handling middleware
const app = (0, express_1.default)();
dotenv_1.default.config();
// Middleware
app.use((0, cors_1.default)({
    origin: "http://localhost:3000", // Adjust to the frontend's URL in production
    methods: ["GET", "POST", "PUT", "DELETE"], // Allow specific HTTP methods
    credentials: true, // Enable cookies if using session-based authentication
}));
app.use(body_parser_1.default.json()); // Parse JSON bodies
app.use(body_parser_1.default.urlencoded({ extended: true })); // Parse URL-encoded bodies
// Connect to the database
(0, database_1.default)();
// Basic Route
app.get("/api", (req, res) => {
    res.send("Welcome to the API!");
});
// Use the routes
app.use("/api", index_1.default); // Prefix all routes with /api
// Error handling middleware
app.use(error_middleware_1.default); // Add the error handling middleware
// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
