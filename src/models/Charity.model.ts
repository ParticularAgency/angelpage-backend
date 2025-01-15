import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

interface IAddress {
	type: string;
	name: string;
	address: string;
	city: string;
	country: string;
	postcode: string;
}

interface IPaymentMethod {
	nameAccountHolder: string;
	accountNumber: string;
	expiryDate: string;
	cvvNumber: string;
	billingAddress: {
		name: string;
		address: string;
		city: string;
		country: string;
		postCode: string;
	};
	useShippingAsBilling: boolean;
}

export interface ICharity extends Document {
	firstName: string;
	lastName: string;
	charityName: string;
	charityNumber: string;
	charityID: string;
	email: string;
	userName: string;
	password: string;
	description: string;
	websiteLink: string;
	phoneNumber: string;
	role: string;
	profileImage: string;
	charityBannerImage: string; // Use string instead of String
	profileCompleted: boolean;
	dateBirth: string;
	verified: boolean;
	addresses: IAddress[];
	payments: IPaymentMethod[];
	storefrontId: string;
	listedProducts: mongoose.Types.ObjectId[];
	favoriteProducts: mongoose.Types.ObjectId[];
	favoriteCharities: mongoose.Types.ObjectId[];
	comparePassword: (password: string) => Promise<boolean>;
	lastWelcomeBackEmailSent?: Date;
	verificationCode?: string;
	verificationExpiry?: Date;
	stripeAccountId?: string;
}

// Address schema for embedding
const addressSchema = new Schema<IAddress>({
	type: { type: String, required: true },
	name: { type: String, required: true },
	address: { type: String, required: true },
	city: { type: String, required: true },
	country: { type: String, required: true },
	postcode: { type: String, required: true },
});

// Payment method schema for embedding
const paymentMethodSchema = new Schema<IPaymentMethod>({
	nameAccountHolder: { type: String, required: true },
	accountNumber: { type: String, required: true },
	expiryDate: { type: String, required: true },
	cvvNumber: { type: String, required: true },
	billingAddress: {
		name: {
			type: String,
			required: function (this: IPaymentMethod) {
				return !this.useShippingAsBilling;
			},
			default: "",
		},
		address: {
			type: String,
			required: function (this: IPaymentMethod) {
				return !this.useShippingAsBilling;
			},
			default: "",
		},
		city: {
			type: String,
			required: function (this: IPaymentMethod) {
				return !this.useShippingAsBilling;
			},
			default: "",
		},
		country: {
			type: String,
			required: function (this: IPaymentMethod) {
				return !this.useShippingAsBilling;
			},
			default: "",
		},
		postCode: {
			type: String,
			required: function (this: IPaymentMethod) {
				return !this.useShippingAsBilling;
			},
			default: "",
		},
	},
	useShippingAsBilling: { type: Boolean, default: false },
});

// Charity schema definition
const charitySchema = new Schema<ICharity>(
	{
		firstName: { type: String, required: true },
		lastName: { type: String, required: true },
		email: { type: String, unique: true, required: true },
		userName: { type: String, required: true, unique: true },
		password: { type: String, required: true },
		role: { type: String, enum: ["CHARITY"], default: "CHARITY" },
		profileImage: { type: String, default: "" },
		charityBannerImage: { type: String, default: "" }, // Updated type
		profileCompleted: { type: Boolean, default: false },
		dateBirth: { type: String, required: false },
		verified: { type: Boolean, default: false },
		addresses: [addressSchema],
		payments: [paymentMethodSchema],
		charityName: { type: String, required: false },
		charityNumber: { type: String, required: false },
		charityID: { type: String, required: false },
		phoneNumber: { type: String, required: false },
		websiteLink: { type: String, required: false },
		description: { type: String, required: false },
		storefrontId: { type: String, unique: true, required: false },
		stripeAccountId: { type: String, required: false },
		listedProducts: [{ type: Schema.Types.ObjectId, ref: "Product" }],
		favoriteProducts: [
			{ type: mongoose.Schema.Types.ObjectId, ref: "Product" },
		],
		favoriteCharities: [
			{ type: mongoose.Schema.Types.ObjectId, ref: "Charity" },
		],

		lastWelcomeBackEmailSent: Date,
		verificationCode: { type: String },
		verificationExpiry: { type: Date },
	},
	{ timestamps: true },
);

// Hash password before saving
charitySchema.pre("save", async function (next) {
	if (this.isNew) {
		this.storefrontId = uuidv4();
	}
	if (this.isModified("password")) {
		this.password = await bcrypt.hash(this.password, 10);
	}
	next();
});

// Password comparison method
charitySchema.methods.comparePassword = async function (password: string) {
	return bcrypt.compare(password, this.password);
};

export default mongoose.model<ICharity>("Charity", charitySchema);
