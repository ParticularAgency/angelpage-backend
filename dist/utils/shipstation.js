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
exports.shipStationClient = void 0;
const axios_1 = __importDefault(require("axios"));
const API_KEY = process.env.SHIPSTATION_API_KEY;
const API_SECRET = process.env.SHIPSTATION_API_SECRET;
const API_BASE_URL = "https://ssapi.shipstation.com/";
const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64");
console.log(auth);
// const authToken = Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64");
// axios
// 	.get("https://ssapi.shipstation.com/carriers", {
// 		headers: { Authorization: `Basic ${authToken}` },
// 	})
// 	.then(response => {
// 		console.log("Carriers:", response.data);
// 	})
// 	.catch(error => {
// 		console.error("Error:", error.response?.data || error.message);
// 	});
exports.shipStationClient = {
    getCarriers() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get(`${API_BASE_URL}/carrier`, {
                headers: { Authorization: `Basic ${auth}` },
            });
            console.log(response);
            return response.data;
        });
    },
    createLabel(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.post(`${API_BASE_URL}/shipments/createlabel`, data, {
                headers: { Authorization: `Basic ${auth}` },
            });
            return response.data;
        });
    },
    trackPackage(trackingNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get(`${API_BASE_URL}/track`, {
                params: { trackingNumber },
                headers: { Authorization: `Basic ${auth}` },
            });
            return response.data;
        });
    },
    schedulePickup(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.post(`${API_BASE_URL}/pickup`, data, {
                headers: { Authorization: `Basic ${auth}` },
            });
            return response.data;
        });
    },
};
