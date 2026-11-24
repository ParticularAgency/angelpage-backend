"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * One-time PCI cleanup: strip legacy card fields from Mongo documents.
 *
 * Usage:
 *   node -r dotenv/config dist/scripts/unsetLegacyCardFields.js
 * or with ts-node / compiled JS as your project prefers.
 *
 * Safe to re-run.
 */
const mongoose_1 = __importDefault(require("mongoose"));
const COLLECTIONS = ["users", "charities", "admins", "orders"];
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!uri) {
            throw new Error("MONGO_URI is required");
        }
        yield mongoose_1.default.connect(uri);
        const db = mongoose_1.default.connection.db;
        if (!db)
            throw new Error("No DB connection");
        for (const name of COLLECTIONS) {
            const col = db.collection(name);
            const result = yield col.updateMany({}, {
                $unset: {
                    "payments.$[].accountNumber": "",
                    "payments.$[].expiryDate": "",
                    "payments.$[].cvvNumber": "",
                    "paymentMethod.accountNumber": "",
                    "paymentMethod.expiryDate": "",
                    "paymentMethod.cvvNumber": "",
                },
            });
            console.log(`${name}: matched=${result.matchedCount} modified=${result.modifiedCount}`);
        }
        yield mongoose_1.default.disconnect();
        console.log("Done.");
    });
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
