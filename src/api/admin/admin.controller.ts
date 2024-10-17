// src/api/admin/admin.controller.ts
import { Request, Response } from "express";
import Admin from "../../models/Admin.model";

// Update admin's profile with profile completion logic
export const updateAdminProfile = async (req: Request, res: Response) => {
	const { name, email, password } = req.body;
	const adminId = req.user._id;

	try {
		const admin = await Admin.findById(adminId);
		if (!admin) {
			return res.status(404).json({ message: "Admin not found." });
		}

		let profileCompleted = true; // Assume profile is complete, check for missing fields

		if (name) {
			admin.name = name;
		} else {
			profileCompleted = false;
		}

		if (email) {
			admin.email = email;
		} else {
			profileCompleted = false;
		}

		if (password) {
			// Assuming bcrypt hash is applied in middleware or service
			admin.password = password;
		} else {
			profileCompleted = false;
		}

		// Mark profile completion based on filled fields
		admin.profileCompleted = profileCompleted;

		await admin.save();
		res
			.status(200)
			.json({ message: "Profile updated successfully.", profileCompleted });
	} catch (error) {
		res.status(500).json({ message: "Error updating profile." });
	}
};
export const setAdminContentAccess = async (req: Request, res: Response) => {
	const { adminId, contentAccess } = req.body;

	if (req.user.role !== "SUPERADMIN") {
		return res
			.status(403)
			.json({ message: "Only super admins can set content access." });
	}

	try {
		const admin = await Admin.findById(adminId);
		if (!admin) {
			return res.status(404).json({ message: "Admin not found." });
		}

		admin.contentAccess = contentAccess; // contentAccess should be an array of strings

		await admin.save();
		res
			.status(200)
			.json({ message: "Admin content access updated successfully." });
	} catch (error) {
		res.status(500).json({ message: "Error setting content access." });
	}
};
