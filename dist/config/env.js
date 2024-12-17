"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    mongoURI: process.env.MONGO_URI || "",
    jwtSecret: process.env.JWT_SECRET || "defaultSecret",
    port: process.env.PORT || 5000,
};
