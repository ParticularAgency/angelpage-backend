"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errorHandler = (err, req, res, next) => {
    const statusCode = err.status || 500;
    const isDevelopment = process.env.NODE_ENV === "development";
    console.error("Error Message:", err.message);
    console.error("Error Stack:", err.stack);
    const response = Object.assign({ status: statusCode, message: statusCode >= 500
            ? "Internal Server Error"
            : err.message || "An error occurred" }, (isDevelopment && { error: err.stack }));
    res.status(statusCode).json(response);
};
exports.default = errorHandler;
