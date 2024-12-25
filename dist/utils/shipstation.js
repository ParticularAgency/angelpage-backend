"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shipStationClient = void 0;
const axios_1 = __importDefault(require("axios"));
const SHIPSTATION_API_URL = "https://ssapi.shipstation.com";
const SHIPSTATION_API_KEY = process.env.SHIPSTATION_API_KEY;
const SHIPSTATION_API_SECRET = process.env.SHIPSTATION_API_SECRET;
console.log("ShipStation API Key:", process.env.SHIPSTATION_API_KEY);
console.log("ShipStation API Secret:", process.env.SHIPSTATION_API_SECRET);
if (!SHIPSTATION_API_KEY || !SHIPSTATION_API_SECRET) {
    throw new Error("ShipStation API credentials are not set.");
}
const authToken = Buffer.from(`${process.env.SHIPSTATION_API_KEY}:${process.env.SHIPSTATION_API_SECRET}`).toString("base64");
exports.shipStationClient = axios_1.default.create({
    baseURL: "https://ssapi.shipstation.com",
    headers: {
        Authorization: `Basic ${authToken}`,
        "Content-Type": "application/json",
    },
});
