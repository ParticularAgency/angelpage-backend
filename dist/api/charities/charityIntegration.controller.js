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
exports.runCharityProductSync = exports.testCharityStoreConnection = exports.detectCharityStore = exports.updateCharityIntegration = exports.getCharityIntegration = void 0;
const Charity_model_1 = __importDefault(require("../../models/Charity.model"));
const charityAccess_js_1 = require("../../utils/charityAccess.js");
const credentialCrypto_js_1 = require("../../utils/credentialCrypto.js");
const charityProductSync_service_js_1 = require("../../services/charityProductSync.service.js");
function sanitizeIntegration(pi = {}) {
    return {
        productSource: pi.productSource || "manual",
        storeUrl: pi.storeUrl || "",
        shopifyDomain: pi.shopifyDomain || "",
        autoSync: pi.autoSync !== false,
        hasApiKey: Boolean(pi.apiKeyEncrypted),
        hasApiSecret: Boolean(pi.apiSecretEncrypted),
        apiKeyPreview: pi.apiKeyEncrypted ? (0, credentialCrypto_js_1.maskSecret)("configured") : "",
        lastSyncAt: pi.lastSyncAt || null,
        lastSyncStatus: pi.lastSyncStatus || "idle",
        lastSyncError: pi.lastSyncError || "",
        lastImportedCount: pi.lastImportedCount || 0,
        lastUpdatedCount: pi.lastUpdatedCount || 0,
        totalSyncedProducts: pi.totalSyncedProducts || 0,
    };
}
const getCharityIntegration = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const charityId = (0, charityAccess_js_1.resolveCharityId)(req.user);
        if (!charityId) {
            return res.status(403).json({ error: "Charity access required." });
        }
        const charity = yield Charity_model_1.default.findById(charityId).select("+productIntegration.apiKeyEncrypted +productIntegration.apiSecretEncrypted websiteLink productIntegration");
        if (!charity) {
            return res.status(404).json({ error: "Charity not found." });
        }
        const integration = sanitizeIntegration(charity.productIntegration);
        if (!integration.storeUrl && charity.websiteLink) {
            integration.storeUrl = charity.websiteLink;
        }
        res.json({ success: true, integration });
    }
    catch (error) {
        console.error("getCharityIntegration:", error);
        res.status(500).json({ error: "Failed to load integration settings." });
    }
});
exports.getCharityIntegration = getCharityIntegration;
const updateCharityIntegration = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const charityId = (0, charityAccess_js_1.resolveCharityId)(req.user);
        if (!charityId) {
            return res.status(403).json({ error: "Charity access required." });
        }
        const { productSource, storeUrl, shopifyDomain, apiKey, apiSecret, autoSync, syncNow, } = req.body;
        const charity = yield Charity_model_1.default.findById(charityId).select("+productIntegration.apiKeyEncrypted +productIntegration.apiSecretEncrypted productIntegration");
        if (!charity) {
            return res.status(404).json({ error: "Charity not found." });
        }
        const pi = charity.productIntegration || {};
        if (productSource)
            pi.productSource = productSource;
        if (storeUrl !== undefined)
            pi.storeUrl = (storeUrl === null || storeUrl === void 0 ? void 0 : storeUrl.trim()) || "";
        if (shopifyDomain !== undefined)
            pi.shopifyDomain = (shopifyDomain === null || shopifyDomain === void 0 ? void 0 : shopifyDomain.trim()) || "";
        if (autoSync !== undefined)
            pi.autoSync = Boolean(autoSync);
        if (apiKey !== undefined && apiKey !== "") {
            pi.apiKeyEncrypted = (0, credentialCrypto_js_1.encryptSecret)(apiKey);
        }
        if (apiSecret !== undefined && apiSecret !== "") {
            pi.apiSecretEncrypted = (0, credentialCrypto_js_1.encryptSecret)(apiSecret);
        }
        charity.productIntegration = pi;
        if (storeUrl && !charity.websiteLink) {
            charity.websiteLink = storeUrl;
        }
        yield charity.save();
        let syncResult = null;
        if (syncNow && pi.productSource && pi.productSource !== "manual") {
            syncResult = yield (0, charityProductSync_service_js_1.syncCharityProducts)(charityId);
        }
        const refreshed = yield Charity_model_1.default.findById(charityId).select("+productIntegration.apiKeyEncrypted +productIntegration.apiSecretEncrypted productIntegration");
        res.json({
            success: true,
            integration: sanitizeIntegration(refreshed.productIntegration),
            syncResult,
            message: (syncResult === null || syncResult === void 0 ? void 0 : syncResult.message) || "Integration settings saved.",
        });
    }
    catch (error) {
        console.error("updateCharityIntegration:", error);
        res.status(400).json({
            error: error.message || "Failed to save integration settings.",
        });
    }
});
exports.updateCharityIntegration = updateCharityIntegration;
const detectCharityStore = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { storeUrl } = req.body;
        if (!(storeUrl === null || storeUrl === void 0 ? void 0 : storeUrl.trim())) {
            return res.status(400).json({ error: "Store URL is required." });
        }
        const detection = yield (0, charityProductSync_service_js_1.detectAndSuggestIntegration)(storeUrl);
        res.json({ success: true, detection });
    }
    catch (error) {
        res.status(400).json({
            error: error.message || "Could not detect store platform.",
        });
    }
});
exports.detectCharityStore = detectCharityStore;
const testCharityStoreConnection = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const charityId = (0, charityAccess_js_1.resolveCharityId)(req.user);
        if (!charityId) {
            return res.status(403).json({ error: "Charity access required." });
        }
        const result = yield (0, charityProductSync_service_js_1.testCharityIntegration)(charityId);
        res.json(Object.assign({ success: true }, result));
    }
    catch (error) {
        res.status(400).json({
            error: error.message || "Connection test failed.",
        });
    }
});
exports.testCharityStoreConnection = testCharityStoreConnection;
const runCharityProductSync = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const charityId = (0, charityAccess_js_1.resolveCharityId)(req.user);
        if (!charityId) {
            return res.status(403).json({ error: "Charity access required." });
        }
        const result = yield (0, charityProductSync_service_js_1.syncCharityProducts)(charityId);
        res.json(Object.assign({ success: true }, result));
    }
    catch (error) {
        res.status(400).json({
            error: error.message || "Product sync failed.",
        });
    }
});
exports.runCharityProductSync = runCharityProductSync;
