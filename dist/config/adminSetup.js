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
exports.setupAdmin = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const User_model_1 = __importDefault(require("../models/User.model"));
const hashPassword = (password) => __awaiter(void 0, void 0, void 0, function* () {
    const saltRounds = 10; // Define the cost factor
    return yield bcrypt_1.default.hash(password, saltRounds);
});
const setupAdmin = () => __awaiter(void 0, void 0, void 0, function* () {
    const admin = yield User_model_1.default.findOne({ role: "ADMIN" });
    if (!admin) {
        const newAdmin = new User_model_1.default({
            name: "Admin",
            email: "admin@example.com",
            password: yield hashPassword("adminpassword"),
            role: "ADMIN",
        });
        yield newAdmin.save();
        console.log("Admin user created successfully.");
    }
    else {
        console.log("Admin user already exists.");
    }
});
exports.setupAdmin = setupAdmin;
