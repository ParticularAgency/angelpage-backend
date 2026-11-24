import Admin from "../../models/Admin.model";
import { ALL_ADMIN_ROLES } from "../../constants/adminRoles.js";
import { resolveAdminPermissions } from "../../constants/adminPermissions.js";

const parsePermissions = (raw) => {
	if (Array.isArray(raw)) return raw;
	if (typeof raw === "string") {
		try {
			const parsed = JSON.parse(raw);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return raw.split(",").map((s) => s.trim()).filter(Boolean);
		}
	}
	return [];
};

export const listAdminTeam = async (req, res) => {
	try {
		const team = await Admin.find()
			.select("firstName lastName email role permissions createdAt verified")
			.sort({ createdAt: -1 });
		res.status(200).json({
			team: team.map((m) => ({
				...m.toObject(),
				permissions: resolveAdminPermissions(m.role, m.permissions),
			})),
		});
	} catch (error) {
		res.status(500).json({ message: "Failed to list admin team." });
	}
};

export const createSubAdmin = async (req, res) => {
	try {
		const { firstName, lastName, email, password, role, userName, permissions } =
			req.body;

		if (!ALL_ADMIN_ROLES.includes(role) || role === "ADMIN") {
			return res.status(400).json({
				message:
					"role must be OPS_ADMIN, CONTENT_ADMIN, or FINANCE_ADMIN (use existing super admin for ADMIN).",
			});
		}

		const exists = await Admin.findOne({ email });
		if (exists) {
			return res.status(400).json({ message: "Email already in use." });
		}

		const resolvedPermissions = resolveAdminPermissions(
			role,
			parsePermissions(permissions),
		);
		if (!resolvedPermissions.length) {
			return res.status(400).json({
				message: "Select at least one access permission.",
			});
		}

		const admin = new Admin({
			firstName,
			lastName,
			email,
			password,
			userName: userName || email.split("@")[0],
			role,
			permissions: resolvedPermissions,
		});
		await admin.save();

		res.status(201).json({
			message: "Sub-admin created.",
			admin: {
				id: admin._id,
				firstName: admin.firstName,
				lastName: admin.lastName,
				email: admin.email,
				role: admin.role,
				permissions: admin.permissions,
			},
		});
	} catch (error) {
		console.error("createSubAdmin:", error);
		res.status(500).json({ message: "Failed to create sub-admin." });
	}
};

export const updateSubAdminRole = async (req, res) => {
	try {
		const { adminId } = req.params;
		const { role, permissions } = req.body;

		const admin = await Admin.findById(adminId);
		if (!admin) {
			return res.status(404).json({ message: "Admin not found." });
		}
		if (admin.role === "ADMIN") {
			return res.status(400).json({ message: "Cannot modify super admin." });
		}

		if (role && ALL_ADMIN_ROLES.includes(role) && role !== "ADMIN") {
			admin.role = role;
		}
		if (permissions !== undefined) {
			admin.permissions = resolveAdminPermissions(
				admin.role,
				parsePermissions(permissions),
			);
		}

		await admin.save();

		res.status(200).json({
			message: "Admin updated.",
			admin: {
				id: admin._id,
				email: admin.email,
				role: admin.role,
				permissions: resolveAdminPermissions(admin.role, admin.permissions),
			},
		});
	} catch (error) {
		res.status(500).json({ message: "Failed to update admin." });
	}
};

export const getMyAdminPanels = async (req, res) => {
	const permissions = resolveAdminPermissions(
		req.user.role,
		req.user.permissions,
	);
	res.status(200).json({
		role: req.user.role,
		permissions,
	});
};
