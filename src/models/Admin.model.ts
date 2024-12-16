import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IAdmin extends Document {
	firstName: string;
	lastName: string;
	name: string;
	email: string;
	userName: string;
	password: string;
	description: string;
	role: string;
	profileCompleted: boolean;
	verified: boolean;
	lastWelcomeBackEmailSent?: Date;
	comparePassword: (password: string) => Promise<boolean>;
	verificationCode?: string; 
	verificationExpiry?: Date; 
}

// User schema definition
const adminSchema = new Schema<IAdmin>(
	{
		firstName: { type: String, required: true },
		lastName: { type: String, required: true },
		name: { type: String, required: true },
		email: { type: String, required: true, unique: true },
		userName: { type: String, required: true, unique: true },
		password: { type: String, required: true },
		description: { type: String, required: true },
		role: { type: String, enum: ["ADMIN"], default: "ADMIN" },
		profileCompleted: { type: Boolean, default: false },
		verified: { type: Boolean, default: false },
		lastWelcomeBackEmailSent: Date,
		verificationCode: { type: String }, 
		verificationExpiry: { type: Date }, 
	},
	{ timestamps: true },
);

// Hash password before saving
adminSchema.pre("save", async function (next) {
	if (this.isModified("password")) {
		this.password = await bcrypt.hash(this.password, 10);
	}
	next();
});

// Password comparison method
adminSchema.methods.comparePassword = async function (password: string) {
	return bcrypt.compare(password, this.password);
};

export default mongoose.model<IAdmin>("Admin", adminSchema);
