"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Admin = exports.Charity = exports.User = void 0;
const User_model_1 = __importDefault(require("./User.model"));
exports.User = User_model_1.default;
const Charity_model_1 = __importDefault(require("./Charity.model"));
exports.Charity = Charity_model_1.default;
const Admin_model_1 = __importDefault(require("./Admin.model"));
exports.Admin = Admin_model_1.default;
