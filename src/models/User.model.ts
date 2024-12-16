import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

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

export interface IUser extends Document {
	firstName: string;
	lastName: string;
	email: string;
	userName: string;
	password: string;
	role: string;
	description: string;
	profileImage: string;
	profileCompleted: boolean;
	dateBirth: string;
	verified: boolean;
	addresses: IAddress[];
	payments: IPaymentMethod[];
	listedProducts: mongoose.Types.ObjectId[];
	favoriteProducts: mongoose.Types.ObjectId[];
	favoriteCharities: mongoose.Types.ObjectId[];
	lastWelcomeBackEmailSent?: Date;
	comparePassword: (password: string) => Promise<boolean>;
	verificationCode?: string;
	verificationExpiry?: Date;
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
  postalCode: {
    type: String,
    required: function (this: IPaymentMethod) {
      return !this.useShippingAsBilling;
    },
    default: "",
  },
},

useShippingAsBilling: { type: Boolean, default: false },
});

// Define the main User schema with embedded addresses and payment methods
const userSchema = new Schema<IUser>(
	{
		firstName: { type: String, required: true },
		lastName: { type: String, required: true },
		email: { type: String, required: true, unique: true },
		userName: { type: String, required: true, unique: true },
		password: { type: String, required: true },
		description: { type: String, required: false },
		role: { type: String, enum: ["USER"], default: "USER" },
		profileImage: { type: String, default: "" },
		profileCompleted: { type: Boolean, default: false },
		dateBirth: { type: String, required: false },
		verified: { type: Boolean, default: false },
		addresses: [addressSchema],
		payments: [paymentMethodSchema],
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

// Hash the password before saving to the database
userSchema.pre("save", async function (next) {
	if (this.isModified("password")) {
		this.password = await bcrypt.hash(this.password, 10);
	}
	next();
});

// Method to compare the entered password with the stored hashed password
userSchema.methods.comparePassword = async function (password: string) {
	return bcrypt.compare(password, this.password);
};

export default mongoose.model<IUser>("User", userSchema);
