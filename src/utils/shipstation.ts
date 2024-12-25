import axios from "axios";

const SHIPSTATION_API_URL = "https://ssapi.shipstation.com";
const SHIPSTATION_API_KEY = process.env.SHIPSTATION_API_KEY;
const SHIPSTATION_API_SECRET = process.env.SHIPSTATION_API_SECRET;

console.log("ShipStation API Key:", process.env.SHIPSTATION_API_KEY);
console.log("ShipStation API Secret:", process.env.SHIPSTATION_API_SECRET);

if (!SHIPSTATION_API_KEY || !SHIPSTATION_API_SECRET) {
	throw new Error("ShipStation API credentials are not set.");
}

const authToken = Buffer.from(
	`${process.env.SHIPSTATION_API_KEY}:${process.env.SHIPSTATION_API_SECRET}`,
).toString("base64");


export const shipStationClient = axios.create({
	baseURL: "https://ssapi.shipstation.com", 
	headers: {
		Authorization: `Basic ${authToken}`,
		"Content-Type": "application/json",
	},
});

