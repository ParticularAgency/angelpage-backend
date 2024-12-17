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
dotenv_1.default.config();
const app = (0, express_1.default)();
// Load environment variables
const PORT = process.env.PORT || 5000;
// Middleware
const FRONT_PORT = process.env.FRONTEND_BASE_URL || "http://localhost:3000";
app.use((0, cors_1.default)({
    origin: FRONT_PORT, // Allow the frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // Allow cookies if necessary
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
