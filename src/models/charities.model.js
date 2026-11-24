import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const { Schema } = mongoose;

/* ------------------------ 🏠 Address Schema ------------------------ */
const addressSchema = new Schema({
    type: { type: String, required: true },
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    postcode: { type: String, required: true },
});

/* ------------------------ Payment Schema (billing only — no PAN/CVV) ------------------------ */
const paymentMethodSchema = new Schema({
    nameAccountHolder: { type: String, required: true },
    stripePaymentMethodId: { type: String, default: "" },
    billingAddress: {
        name: {
            type: String,
            required: function () {
                return !this.useShippingAsBilling;
            },
            default: "",
        },
        address: {
            type: String,
            required: function () {
                return !this.useShippingAsBilling;
            },
            default: "",
        },
        city: {
            type: String,
            required: function () {
                return !this.useShippingAsBilling;
            },
            default: "",
        },
        country: {
            type: String,
            required: function () {
                return !this.useShippingAsBilling;
            },
            default: "",
        },
        postCode: {
            type: String,
            required: function () {
                return !this.useShippingAsBilling;
            },
            default: "",
        },
    },
    useShippingAsBilling: { type: Boolean, default: false },
});

/* ------------------------ 💚 Charity Schema ------------------------ */
const charitySchema = new Schema(
    {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, unique: true, required: true },
        userName: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        role: { type: String, enum: ["CHARITY"], default: "CHARITY" },
        profileImage: { type: String, default: "" },
        charityBannerImage: { type: String, default: "" },
        profileCompleted: { type: Boolean, default: false },
        dateBirth: { type: String },
        verified: { type: Boolean, default: false },
        addresses: [addressSchema],
        payments: [paymentMethodSchema],
        charityName: { type: String },
        charityNumber: { type: String },
        charityID: { type: String },
        phoneNumber: { type: String },
        websiteLink: { type: String },
        description: { type: String },
        storefrontId: { type: String, unique: true },
        stripeAccountId: { type: String },
        registrationStatus: { type: String, default: "PENDING" },
        totalEarned: { type: Number, default: 0 },
        totalHeldFunds: { type: Number, default: 0 },
        upcomingFunds: { type: Number, default: 0 },
        thresholdReached: { type: Boolean, default: false },
        holdDate: { type: Date },
        adminConfirmed: { type: Boolean, default: false },
        listedProducts: [{ type: Schema.Types.ObjectId, ref: "Product" }],
        favoriteProducts: [{ type: Schema.Types.ObjectId, ref: "Product" }],
        favoriteCharities: [{ type: Schema.Types.ObjectId, ref: "Charity" }],
        lastWelcomeBackEmailSent: { type: Date },
        verificationCode: { type: String },
        verificationExpiry: { type: Date },
    },
    { timestamps: true }
);

/* ------------------------ 🔒 Password Hashing ------------------------ */
charitySchema.pre("save", async function (next) {
    if (this.isNew) {
        this.storefrontId = uuidv4();
    }
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

/* ------------------------ 🔑 Compare Password ------------------------ */
charitySchema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password);
};

/* ------------------------ 📦 Export Model ------------------------ */
const Charity = mongoose.model("Charity", charitySchema);
export default Charity;
