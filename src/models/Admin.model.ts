// src/models/Admin.model.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IAdmin extends Document {
	name: string;
	email: string;
	password: string;
	role: "ADMIN" | "SUPERADMIN" | "EDITOR"; // Admin roles
	canManageUsers: boolean;
	canManageContent: boolean;
	contentAccess: string[]; // Array to store accessible content types
	profileCompleted: boolean;
	createdAt: Date;
}

const adminSchema: Schema = new Schema({
	name: { type: String, required: true },
	email: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	role: {
		type: String,
		enum: ["ADMIN", "SUPERADMIN", "EDITOR"],
		default: "ADMIN",
	},
	canManageUsers: { type: Boolean, default: false },
	canManageContent: { type: Boolean, default: false },
	contentAccess: { type: [String], default: [] }, // List of accessible content types (e.g., ['users', 'blogs'])
	profileCompleted: { type: Boolean, default: false },
	createdAt: { type: Date, default: Date.now },
});

const Admin = mongoose.model<IAdmin>("Admin", adminSchema);
export default Admin;
