import bcrypt from "bcrypt";
import User from "../models/User.model";

const hashPassword = async (password: string): Promise<string> => {
	const saltRounds = 10; // Define the cost factor
	return await bcrypt.hash(password, saltRounds);
};

export const setupAdmin = async () => {
	const admin = await User.findOne({ role: "ADMIN" });
	if (!admin) {
		const newAdmin = new User({
			name: "Admin",
			email: "admin@example.com",
			password: await hashPassword("adminpassword"),
			role: "ADMIN",
		});
		await newAdmin.save();
		console.log("Admin user created successfully.");
	} else {
		console.log("Admin user already exists.");
	}
};
