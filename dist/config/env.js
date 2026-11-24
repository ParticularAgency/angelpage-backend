"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const jwtSecret_js_1 = require("./jwtSecret.js");
dotenv_1.default.config();
exports.config = {
    mongoURI: process.env.MONGO_URI || "",
    jwtSecret: jwtSecret_js_1.JWT_SECRET,
    port: process.env.PORT || 5000,
};
