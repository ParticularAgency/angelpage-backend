import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface ICharityStaff extends Document {
	parentCharityId: mongoose.Types.ObjectId;
	firstName: string;
	lastName: string;
	email: string;
	password: string;
	/** STAFF = listings/orders/community · MANAGER = + analytics */
	staffRole: "STAFF" | "MANAGER";
	permissions?: string[];
	active: boolean;
	role: string;
	comparePassword: (password: string) => Promise<boolean>;
}

const charityStaffSchema = new Schema<ICharityStaff>(
	{
		parentCharityId: {
			type: Schema.Types.ObjectId,
			ref: "Charity",
			required: true,
			index: true,
		},
		firstName: { type: String, required: true },
		lastName: { type: String, required: true },
		email: { type: String, required: true, unique: true },
		password: { type: String, required: true },
		staffRole: {
			type: String,
			enum: ["STAFF", "MANAGER"],
			default: "STAFF",
		},
		permissions: { type: [String], default: [] },
		active: { type: Boolean, default: true },
		role: { type: String, default: "CHARITY_STAFF", immutable: true },
	},
	{ timestamps: true },
);

charityStaffSchema.pre("save", async function (next) {
	if (this.isModified("password")) {
		this.password = await bcrypt.hash(this.password, 10);
	}
	next();
});

charityStaffSchema.methods.comparePassword = async function (password: string) {
	return bcrypt.compare(password, this.password);
};

export default mongoose.model<ICharityStaff>("CharityStaff", charityStaffSchema);
