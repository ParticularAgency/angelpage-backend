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
exports.fetchNewToken = fetchNewToken;
exports.getValidToken = getValidToken;
exports.startAutoRefresh = startAutoRefresh;
/* eslint-env node */
const node_fetch_1 = __importDefault(require("node-fetch"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/* ---------------------------------------------
   🧠 eBay OAuth Token Manager (JavaScript)
--------------------------------------------- */
const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID;
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET;
const EBAY_ENV = process.env.EBAY_ENV || 'PRODUCTION'; // or 'SANDBOX'
const TOKEN_URL = EBAY_ENV === 'PRODUCTION'
    ? 'https://api.ebay.com/identity/v1/oauth2/token'
    : 'https://api.sandbox.ebay.com/identity/v1/oauth2/token';
let currentToken = null;
let tokenExpiry = 0;
/**
 * 🪙 Request a fresh OAuth token from eBay
 */
function fetchNewToken() {
    return __awaiter(this, void 0, void 0, function* () {
        const credentials = Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString('base64');
        const body = new URLSearchParams({
            grant_type: 'client_credentials',
            scope: 'https://api.ebay.com/oauth/api_scope',
        });
        const res = yield (0, node_fetch_1.default)(TOKEN_URL, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body,
        });
        if (!res.ok) {
            const errText = yield res.text();
            throw new Error(`❌ Failed to get eBay token: ${res.status} ${errText}`);
        }
        const data = yield res.json();
        currentToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // refresh 1 min early
        console.log(`🔑 New eBay token fetched, valid for ${Math.round(data.expires_in / 60)} minutes`);
        return currentToken;
    });
}
/**
 * 🔄 Get current token, auto-refresh if expired
 */
function getValidToken() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!currentToken || Date.now() > tokenExpiry) {
            return yield fetchNewToken();
        }
        return currentToken;
    });
}
/**
 * ♻️ Optional auto-refresh background task (every 2 hours)
 */
function startAutoRefresh(intervalMinutes = 110) {
    setInterval(() => __awaiter(this, void 0, void 0, function* () {
        try {
            yield fetchNewToken();
            console.log('♻️ eBay token refreshed automatically');
        }
        catch (err) {
            console.error('❌ Token auto-refresh failed:', err);
        }
    }), intervalMinutes * 60 * 1000);
}
