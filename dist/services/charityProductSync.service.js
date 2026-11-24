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
exports.testCharityIntegration = testCharityIntegration;
exports.syncCharityProducts = syncCharityProducts;
exports.detectAndSuggestIntegration = detectAndSuggestIntegration;
const Charity_model_1 = __importDefault(require("../models/Charity.model"));
const credentialCrypto_js_1 = require("../utils/credentialCrypto.js");
const charityIntegrationDetect_service_js_1 = require("./charityIntegrationDetect.service.js");
const charityProductImport_service_js_1 = require("./charityProductImport.service.js");
const shopifySync_service_js_1 = require("./shopifySync.service.js");
const wooCommerceSync_service_js_1 = require("./wooCommerceSync.service.js");
const scrapeProductSync_service_js_1 = require("./scrapeProductSync.service.js");
function integrationConfig(charity) {
    const pi = charity.productIntegration || {};
    return {
        productSource: pi.productSource || "manual",
        storeUrl: pi.storeUrl || charity.websiteLink || "",
        shopifyDomain: pi.shopifyDomain || "",
        apiKey: pi.apiKeyEncrypted ? (0, credentialCrypto_js_1.decryptSecret)(pi.apiKeyEncrypted) : "",
        apiSecret: pi.apiSecretEncrypted ? (0, credentialCrypto_js_1.decryptSecret)(pi.apiSecretEncrypted) : "",
        autoSync: pi.autoSync !== false,
    };
}
function fetchProductsForIntegration(config) {
    return __awaiter(this, void 0, void 0, function* () {
        const { productSource, storeUrl, shopifyDomain, apiKey, apiSecret } = config;
        switch (productSource) {
            case "shopify":
            case "api_key":
                return (0, shopifySync_service_js_1.fetchShopifyProducts)({
                    storeUrl,
                    shopifyDomain,
                    accessToken: apiKey || undefined,
                });
            case "woocommerce":
            case "wordpress":
                return (0, wooCommerceSync_service_js_1.fetchWooCommerceProducts)({
                    storeUrl,
                    consumerKey: apiKey,
                    consumerSecret: apiSecret,
                });
            case "scrape":
                return (0, scrapeProductSync_service_js_1.fetchScrapedProducts)({ storeUrl });
            case "manual":
                return [];
            default:
                if (apiKey) {
                    try {
                        return yield (0, shopifySync_service_js_1.fetchShopifyProducts)({
                            storeUrl,
                            shopifyDomain,
                            accessToken: apiKey,
                        });
                    }
                    catch (_a) {
                        return (0, wooCommerceSync_service_js_1.fetchWooCommerceProducts)({
                            storeUrl,
                            consumerKey: apiKey,
                            consumerSecret: apiSecret,
                        });
                    }
                }
                return (0, scrapeProductSync_service_js_1.fetchScrapedProducts)({ storeUrl });
        }
    });
}
function testCharityIntegration(charityId) {
    return __awaiter(this, void 0, void 0, function* () {
        const charity = yield Charity_model_1.default.findById(charityId);
        if (!charity)
            throw new Error("Charity not found");
        const config = integrationConfig(charity);
        if (!config.storeUrl && config.productSource !== "manual") {
            throw new Error("Store URL is required.");
        }
        switch (config.productSource) {
            case "shopify":
            case "api_key":
                return (0, shopifySync_service_js_1.testShopifyConnection)({
                    storeUrl: config.storeUrl,
                    shopifyDomain: config.shopifyDomain,
                    accessToken: config.apiKey,
                });
            case "woocommerce":
            case "wordpress":
                return (0, wooCommerceSync_service_js_1.testWooCommerceConnection)({
                    storeUrl: config.storeUrl,
                    consumerKey: config.apiKey,
                    consumerSecret: config.apiSecret,
                });
            case "scrape":
                return (0, scrapeProductSync_service_js_1.testScrapeConnection)({ storeUrl: config.storeUrl });
            default:
                return (0, charityIntegrationDetect_service_js_1.detectStorePlatform)(config.storeUrl);
        }
    });
}
function syncCharityProducts(charityId) {
    return __awaiter(this, void 0, void 0, function* () {
        const charity = yield Charity_model_1.default.findById(charityId);
        if (!charity)
            throw new Error("Charity not found");
        const config = integrationConfig(charity);
        if (config.productSource === "manual") {
            return {
                importedCount: 0,
                updatedCount: 0,
                skippedCount: 0,
                message: "Manual listing mode — use Post product or Bulk upload.",
            };
        }
        if (!config.storeUrl) {
            throw new Error("Add your store URL or API credentials in Product sync settings.");
        }
        yield Charity_model_1.default.findByIdAndUpdate(charityId, {
            "productIntegration.lastSyncStatus": "running",
            "productIntegration.lastSyncError": "",
        });
        try {
            const externalProducts = yield fetchProductsForIntegration(config);
            const result = yield (0, charityProductImport_service_js_1.upsertImportedProducts)(charityId, externalProducts, {
                autoPublish: true,
            });
            yield Charity_model_1.default.findByIdAndUpdate(charityId, {
                "productIntegration.lastSyncAt": new Date(),
                "productIntegration.lastSyncStatus": "success",
                "productIntegration.lastSyncError": "",
                "productIntegration.lastImportedCount": result.importedCount,
                "productIntegration.lastUpdatedCount": result.updatedCount,
                "productIntegration.totalSyncedProducts": result.totalListed,
            });
            return Object.assign(Object.assign({}, result), { message: `Synced ${result.importedCount} new and ${result.updatedCount} updated products.` });
        }
        catch (error) {
            yield Charity_model_1.default.findByIdAndUpdate(charityId, {
                "productIntegration.lastSyncAt": new Date(),
                "productIntegration.lastSyncStatus": "failed",
                "productIntegration.lastSyncError": error.message,
            });
            throw error;
        }
    });
}
function detectAndSuggestIntegration(storeUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, charityIntegrationDetect_service_js_1.detectStorePlatform)(storeUrl);
    });
}
