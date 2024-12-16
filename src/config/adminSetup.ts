import User from "../models/User.model";

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
	}
};
