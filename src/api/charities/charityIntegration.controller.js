import Charity from "../../models/Charity.model";
import { resolveCharityId } from "../../utils/charityAccess.js";
import {
	encryptSecret,
	maskSecret,
} from "../../utils/credentialCrypto.js";
import {
	detectAndSuggestIntegration,
	syncCharityProducts,
	testCharityIntegration,
} from "../../services/charityProductSync.service.js";

function sanitizeIntegration(pi = {}) {
	return {
		productSource: pi.productSource || "manual",
		storeUrl: pi.storeUrl || "",
		shopifyDomain: pi.shopifyDomain || "",
		autoSync: pi.autoSync !== false,
		hasApiKey: Boolean(pi.apiKeyEncrypted),
		hasApiSecret: Boolean(pi.apiSecretEncrypted),
		apiKeyPreview: pi.apiKeyEncrypted ? maskSecret("configured") : "",
		lastSyncAt: pi.lastSyncAt || null,
		lastSyncStatus: pi.lastSyncStatus || "idle",
		lastSyncError: pi.lastSyncError || "",
		lastImportedCount: pi.lastImportedCount || 0,
		lastUpdatedCount: pi.lastUpdatedCount || 0,
		totalSyncedProducts: pi.totalSyncedProducts || 0,
	};
}

export const getCharityIntegration = async (req, res) => {
	try {
		const charityId = resolveCharityId(req.user);
		if (!charityId) {
			return res.status(403).json({ error: "Charity access required." });
		}

		const charity = await Charity.findById(charityId).select(
			"+productIntegration.apiKeyEncrypted +productIntegration.apiSecretEncrypted websiteLink productIntegration",
		);
		if (!charity) {
			return res.status(404).json({ error: "Charity not found." });
		}

		const integration = sanitizeIntegration(charity.productIntegration);
		if (!integration.storeUrl && charity.websiteLink) {
			integration.storeUrl = charity.websiteLink;
		}

		res.json({ success: true, integration });
	} catch (error) {
		console.error("getCharityIntegration:", error);
		res.status(500).json({ error: "Failed to load integration settings." });
	}
};

export const updateCharityIntegration = async (req, res) => {
	try {
		const charityId = resolveCharityId(req.user);
		if (!charityId) {
			return res.status(403).json({ error: "Charity access required." });
		}

		const {
			productSource,
			storeUrl,
			shopifyDomain,
			apiKey,
			apiSecret,
			autoSync,
			syncNow,
		} = req.body;

		const charity = await Charity.findById(charityId).select(
			"+productIntegration.apiKeyEncrypted +productIntegration.apiSecretEncrypted productIntegration",
		);
		if (!charity) {
			return res.status(404).json({ error: "Charity not found." });
		}

		const pi = charity.productIntegration || {};

		if (productSource) pi.productSource = productSource;
		if (storeUrl !== undefined) pi.storeUrl = storeUrl?.trim() || "";
		if (shopifyDomain !== undefined) pi.shopifyDomain = shopifyDomain?.trim() || "";
		if (autoSync !== undefined) pi.autoSync = Boolean(autoSync);

		if (apiKey !== undefined && apiKey !== "") {
			pi.apiKeyEncrypted = encryptSecret(apiKey);
		}
		if (apiSecret !== undefined && apiSecret !== "") {
			pi.apiSecretEncrypted = encryptSecret(apiSecret);
		}

		charity.productIntegration = pi;
		if (storeUrl && !charity.websiteLink) {
			charity.websiteLink = storeUrl;
		}
		await charity.save();

		let syncResult = null;
		if (syncNow && pi.productSource && pi.productSource !== "manual") {
			syncResult = await syncCharityProducts(charityId);
		}

		const refreshed = await Charity.findById(charityId).select(
			"+productIntegration.apiKeyEncrypted +productIntegration.apiSecretEncrypted productIntegration",
		);

		res.json({
			success: true,
			integration: sanitizeIntegration(refreshed.productIntegration),
			syncResult,
			message: syncResult?.message || "Integration settings saved.",
		});
	} catch (error) {
		console.error("updateCharityIntegration:", error);
		res.status(400).json({
			error: error.message || "Failed to save integration settings.",
		});
	}
};

export const detectCharityStore = async (req, res) => {
	try {
		const { storeUrl } = req.body;
		if (!storeUrl?.trim()) {
			return res.status(400).json({ error: "Store URL is required." });
		}

		const detection = await detectAndSuggestIntegration(storeUrl);
		res.json({ success: true, detection });
	} catch (error) {
		res.status(400).json({
			error: error.message || "Could not detect store platform.",
		});
	}
};

export const testCharityStoreConnection = async (req, res) => {
	try {
		const charityId = resolveCharityId(req.user);
		if (!charityId) {
			return res.status(403).json({ error: "Charity access required." });
		}

		const result = await testCharityIntegration(charityId);
		res.json({ success: true, ...result });
	} catch (error) {
		res.status(400).json({
			error: error.message || "Connection test failed.",
		});
	}
};

export const runCharityProductSync = async (req, res) => {
	try {
		const charityId = resolveCharityId(req.user);
		if (!charityId) {
			return res.status(403).json({ error: "Charity access required." });
		}

		const result = await syncCharityProducts(charityId);
		res.json({ success: true, ...result });
	} catch (error) {
		res.status(400).json({
			error: error.message || "Product sync failed.",
		});
	}
};
