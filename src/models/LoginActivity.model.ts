import mongoose from "mongoose";

const LoginActivitySchema = new mongoose.Schema({
	userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
	role: { type: String, enum: ["USER", "CHARITY", "ADMIN"], required: true },
	timestamp: { type: Date, default: Date.now },
});

const LoginActivity = mongoose.model("LoginActivity", LoginActivitySchema);

export default LoginActivity;
