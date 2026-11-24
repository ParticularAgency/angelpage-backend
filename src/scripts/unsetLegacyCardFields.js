/**
 * One-time PCI cleanup: strip legacy card fields from Mongo documents.
 *
 * Usage:
 *   node -r dotenv/config dist/scripts/unsetLegacyCardFields.js
 * or with ts-node / compiled JS as your project prefers.
 *
 * Safe to re-run.
 */
import mongoose from "mongoose";

const COLLECTIONS = ["users", "charities", "admins", "orders"];

async function main() {
	const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
	if (!uri) {
		throw new Error("MONGO_URI is required");
	}
	await mongoose.connect(uri);
	const db = mongoose.connection.db;
	if (!db) throw new Error("No DB connection");

	for (const name of COLLECTIONS) {
		const col = db.collection(name);
		const result = await col.updateMany(
			{},
			{
				$unset: {
					"payments.$[].accountNumber": "",
					"payments.$[].expiryDate": "",
					"payments.$[].cvvNumber": "",
					"paymentMethod.accountNumber": "",
					"paymentMethod.expiryDate": "",
					"paymentMethod.cvvNumber": "",
				},
			},
		);
		console.log(`${name}: matched=${result.matchedCount} modified=${result.modifiedCount}`);
	}

	await mongoose.disconnect();
	console.log("Done.");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
