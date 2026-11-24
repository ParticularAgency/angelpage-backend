import dotenv from "dotenv";
import { JWT_SECRET } from "./jwtSecret.js";

dotenv.config();

export const config = {
	mongoURI: process.env.MONGO_URI || "",
	jwtSecret: JWT_SECRET,
	port: process.env.PORT || 5000,
};
