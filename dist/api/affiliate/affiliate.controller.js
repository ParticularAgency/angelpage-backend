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
exports.importEbayFeedAdmin = exports.deleteAffiliateProduct = exports.patchAffiliateProduct = exports.getAffiliateProducts = exports.syncConnection = exports.testConnection = exports.deleteConnection = exports.updateConnection = exports.createConnection = exports.listConnections = void 0;
exports.runAffiliateImportJob = runAffiliateImportJob;
const AffiliateConnection_model_js_1 = __importDefault(require("../../models/AffiliateConnection.model.js"));
const credentialCrypto_js_1 = require("../../utils/credentialCrypto.js");
const affiliateApiMapper_service_js_1 = require("../../services/affiliateApiMapper.service.js");
const affiliateImport_service_js_1 = require("../../services/affiliateImport.service.js");
const ebayAffiliate_service_js_1 = require("../../services/ebayAffiliate.service.js");
const jobQueue_service_js_1 = require("../../services/jobQueue.service.js");
const adminRoles_js_1 = require("../../constants/adminRoles.js");
function resolveOwner(req) {
    const { userId, role } = req.user;
    if (role === "CHARITY" || role === "USER") {
        return { ownerId: userId, ownerRole: role };
    }
    if ((0, adminRoles_js_1.isAdminRole)(role)) {
        return { ownerId: userId, ownerRole: "ADMIN" };
    }
    return null;
}
function sanitizeConnection(doc) {
    const c = doc.toObject ? doc.toObject() : doc;
    delete c.apiKeyEncrypted;
    return Object.assign(Object.assign({}, c), { hasApiKey: Boolean(doc.apiKeyEncrypted), apiKeyPreview: doc.apiKeyEncrypted ? (0, credentialCrypto_js_1.maskSecret)("saved") : "" });
}
const listConnections = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const owner = resolveOwner(req);
        if (!owner)
            return res.status(403).json({ error: "Unauthorized" });
        const connections = yield AffiliateConnection_model_js_1.default.find({
            ownerId: owner.ownerId,
            ownerRole: owner.ownerRole,
        }).select("+apiKeyEncrypted");
        res.json({
            success: true,
            connections: connections.map(sanitizeConnection),
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.listConnections = listConnections;
const createConnection = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const owner = resolveOwner(req);
        if (!owner)
            return res.status(403).json({ error: "Unauthorized" });
        const { label, apiUrl, apiKey, affiliateId, provider, fieldMapping, itemsPath, syncNow, } = req.body;
        if (!(apiUrl === null || apiUrl === void 0 ? void 0 : apiUrl.trim())) {
            return res.status(400).json({ error: "API URL is required." });
        }
        const connection = new AffiliateConnection_model_js_1.default({
            ownerId: owner.ownerId,
            ownerRole: owner.ownerRole,
            label: label || "Affiliate API",
            apiUrl: apiUrl.trim(),
            affiliateId: affiliateId || "",
            provider: provider || "generic",
            fieldMapping: fieldMapping || {},
            itemsPath: itemsPath || "products",
            apiKeyEncrypted: apiKey ? (0, credentialCrypto_js_1.encryptSecret)(apiKey) : undefined,
        });
        yield connection.save();
        if (syncNow) {
            yield (0, jobQueue_service_js_1.enqueueJob)("affiliate-import", {
                connectionId: connection._id.toString(),
                ownerId: owner.ownerId,
                ownerRole: owner.ownerRole,
            });
        }
        res.status(201).json({
            success: true,
            connection: sanitizeConnection(connection),
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
exports.createConnection = createConnection;
const updateConnection = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const owner = resolveOwner(req);
        const connection = yield AffiliateConnection_model_js_1.default.findOne({
            _id: req.params.connectionId,
            ownerId: owner === null || owner === void 0 ? void 0 : owner.ownerId,
            ownerRole: owner === null || owner === void 0 ? void 0 : owner.ownerRole,
        }).select("+apiKeyEncrypted");
        if (!connection)
            return res.status(404).json({ error: "Connection not found." });
        const { label, apiUrl, apiKey, affiliateId, fieldMapping, itemsPath, active } = req.body;
        if (label)
            connection.label = label;
        if (apiUrl)
            connection.apiUrl = apiUrl.trim();
        if (affiliateId !== undefined)
            connection.affiliateId = affiliateId;
        if (fieldMapping)
            connection.fieldMapping = fieldMapping;
        if (itemsPath)
            connection.itemsPath = itemsPath;
        if (active !== undefined)
            connection.active = active;
        if (apiKey)
            connection.apiKeyEncrypted = (0, credentialCrypto_js_1.encryptSecret)(apiKey);
        yield connection.save();
        res.json({ success: true, connection: sanitizeConnection(connection) });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
exports.updateConnection = updateConnection;
const deleteConnection = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const owner = resolveOwner(req);
        yield AffiliateConnection_model_js_1.default.deleteOne({
            _id: req.params.connectionId,
            ownerId: owner === null || owner === void 0 ? void 0 : owner.ownerId,
            ownerRole: owner === null || owner === void 0 ? void 0 : owner.ownerRole,
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
exports.deleteConnection = deleteConnection;
const testConnection = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const owner = resolveOwner(req);
        const connection = yield AffiliateConnection_model_js_1.default.findOne({
            _id: req.params.connectionId || req.body.connectionId,
            ownerId: owner === null || owner === void 0 ? void 0 : owner.ownerId,
            ownerRole: owner === null || owner === void 0 ? void 0 : owner.ownerRole,
        }).select("+apiKeyEncrypted");
        const body = req.body;
        let sample;
        if (body.provider === "ebay" || (connection === null || connection === void 0 ? void 0 : connection.provider) === "ebay") {
            sample = yield (0, ebayAffiliate_service_js_1.fetchEbayCuratedFeed)({ limit: 3 });
        }
        else {
            const apiUrl = body.apiUrl || (connection === null || connection === void 0 ? void 0 : connection.apiUrl);
            const apiKey = body.apiKey
                ? body.apiKey
                : (connection === null || connection === void 0 ? void 0 : connection.apiKeyEncrypted)
                    ? (0, credentialCrypto_js_1.decryptSecret)(connection.apiKeyEncrypted)
                    : undefined;
            const raw = yield (0, affiliateApiMapper_service_js_1.fetchAffiliateApi)({ apiUrl, apiKey });
            sample = (0, affiliateApiMapper_service_js_1.mapAffiliateApiResponse)(raw, body.fieldMapping || (connection === null || connection === void 0 ? void 0 : connection.fieldMapping), body.itemsPath || (connection === null || connection === void 0 ? void 0 : connection.itemsPath) || "products").slice(0, 3);
        }
        res.json({ success: true, sampleCount: sample.length, sample });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
exports.testConnection = testConnection;
const syncConnection = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const owner = resolveOwner(req);
        const connection = yield AffiliateConnection_model_js_1.default.findOne({
            _id: req.params.connectionId,
            ownerId: owner === null || owner === void 0 ? void 0 : owner.ownerId,
            ownerRole: owner === null || owner === void 0 ? void 0 : owner.ownerRole,
        }).select("+apiKeyEncrypted");
        if (!connection)
            return res.status(404).json({ error: "Connection not found." });
        yield (0, jobQueue_service_js_1.enqueueJob)("affiliate-import", {
            connectionId: connection._id.toString(),
            ownerId: owner.ownerId,
            ownerRole: owner.ownerRole,
        });
        res.json({ success: true, message: "Import started." });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
exports.syncConnection = syncConnection;
const getAffiliateProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const owner = resolveOwner(req);
        const ownerId = req.query.ownerId && (0, adminRoles_js_1.isAdminRole)(req.user.role)
            ? req.query.ownerId
            : owner === null || owner === void 0 ? void 0 : owner.ownerId;
        const products = yield (0, affiliateImport_service_js_1.listAffiliateProducts)(ownerId);
        res.json({ success: true, products });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getAffiliateProducts = getAffiliateProducts;
const patchAffiliateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const owner = resolveOwner(req);
        const product = yield (0, affiliateImport_service_js_1.updateAffiliateProduct)(owner.ownerId, req.params.productId, req.body);
        res.json({ success: true, product });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
exports.patchAffiliateProduct = patchAffiliateProduct;
const deleteAffiliateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const owner = resolveOwner(req);
        yield (0, affiliateImport_service_js_1.removeAffiliateProduct)(owner.ownerId, req.params.productId);
        res.json({ success: true });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
exports.deleteAffiliateProduct = deleteAffiliateProduct;
const importEbayFeedAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!(0, adminRoles_js_1.isAdminRole)(req.user.role)) {
            return res.status(403).json({ error: "Admin only." });
        }
        const feed = yield (0, ebayAffiliate_service_js_1.fetchEbayCuratedFeed)({ limit: 50 });
        const result = yield (0, affiliateImport_service_js_1.importAffiliateProducts)({
            ownerId: req.user.userId,
            ownerRole: "ADMIN",
            connection: { affiliateId: process.env.EBAY_AFFILIATE_REFERENCE_ID || "angelpage" },
            products: feed.map((item) => ({
                externalId: item.ebayItemId,
                name: item.title,
                price: item.price,
                images: item.imageUrl ? [item.imageUrl] : [],
                affiliateUrl: item.itemWebUrl,
                category: "affiliate",
                checkoutMode: "affiliate_redirect",
                source: "ebay_affiliate",
            })),
        });
        res.json(Object.assign({ success: true }, result));
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
exports.importEbayFeedAdmin = importEbayFeedAdmin;
function runAffiliateImportJob(_a) {
    return __awaiter(this, arguments, void 0, function* ({ connectionId, ownerId, ownerRole }) {
        const connection = yield AffiliateConnection_model_js_1.default.findById(connectionId).select("+apiKeyEncrypted");
        if (!connection)
            throw new Error("Connection not found");
        connection.lastSyncStatus = "running";
        yield connection.save();
        try {
            const plain = Object.assign(Object.assign({}, connection.toObject()), { apiKey: connection.apiKeyEncrypted
                    ? (0, credentialCrypto_js_1.decryptSecret)(connection.apiKeyEncrypted)
                    : undefined });
            const result = yield (0, affiliateImport_service_js_1.importAffiliateProducts)({
                ownerId,
                ownerRole,
                connection: plain,
            });
            connection.lastSyncAt = new Date();
            connection.lastSyncStatus = "success";
            connection.lastImportedCount = result.importedCount;
            connection.lastSyncError = "";
            yield connection.save();
            return result;
        }
        catch (error) {
            connection.lastSyncStatus = "failed";
            connection.lastSyncError = error.message;
            yield connection.save();
            throw error;
        }
    });
}
