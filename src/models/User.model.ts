// src/models/User.model.ts
import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
	name: { type: String, required: true },
	email: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	role: { type: String, enum: ["USER", "CHARITY", "ADMIN"], default: "USER" },
	isEmailVerified: { type: Boolean, default: false },
	profileCompleted: { type: Boolean, default: false }, // For profile progress
	lastLogin: { type: Date, default: null }, // Track for welcome-back emails
	createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
export default User;

// src/models/Admin.model.ts
import mongoose, { Schema } from "mongoose";

const adminSchema = new Schema({
	name: { type: String, required: true },
	email: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	role: {
		type: String,
		enum: ["ADMIN", "SUPERADMIN", "EDITOR"],
		default: "ADMIN",
	},
	canManageUsers: { type: Boolean, default: false }, // Role-specific permissions
	canManageContent: { type: Boolean, default: false },
	profileCompleted: { type: Boolean, default: false },
	createdAt: { type: Date, default: Date.now },
});

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;
