import AffiliateConnection from "../../models/AffiliateConnection.model.js";
import {
	encryptSecret,
	decryptSecret,
	maskSecret,
} from "../../utils/credentialCrypto.js";
import {
	fetchAffiliateApi,
	mapAffiliateApiResponse,
} from "../../services/affiliateApiMapper.service.js";
import {
	importAffiliateProducts,
	listAffiliateProducts,
	updateAffiliateProduct,
	removeAffiliateProduct,
} from "../../services/affiliateImport.service.js";
import { fetchEbayCuratedFeed } from "../../services/ebayAffiliate.service.js";
import { enqueueJob } from "../../services/jobQueue.service.js";
import { isAdminRole } from "../../constants/adminRoles.js";

function resolveOwner(req) {
	const { userId, role } = req.user;
	if (role === "CHARITY" || role === "USER") {
		return { ownerId: userId, ownerRole: role };
	}
	if (isAdminRole(role)) {
		return { ownerId: userId, ownerRole: "ADMIN" };
	}
	return null;
}

function sanitizeConnection(doc) {
	const c = doc.toObject ? doc.toObject() : doc;
	delete c.apiKeyEncrypted;
	return {
		...c,
		hasApiKey: Boolean(doc.apiKeyEncrypted),
		apiKeyPreview: doc.apiKeyEncrypted ? maskSecret("saved") : "",
	};
}

export const listConnections = async (req, res) => {
	try {
		const owner = resolveOwner(req);
		if (!owner) return res.status(403).json({ error: "Unauthorized" });

		const connections = await AffiliateConnection.find({
			ownerId: owner.ownerId,
			ownerRole: owner.ownerRole,
		}).select("+apiKeyEncrypted");

		res.json({
			success: true,
			connections: connections.map(sanitizeConnection),
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

export const createConnection = async (req, res) => {
	try {
		const owner = resolveOwner(req);
		if (!owner) return res.status(403).json({ error: "Unauthorized" });

		const {
			label,
			apiUrl,
			apiKey,
			affiliateId,
			provider,
			fieldMapping,
			itemsPath,
			syncNow,
		} = req.body;

		if (!apiUrl?.trim()) {
			return res.status(400).json({ error: "API URL is required." });
		}

		const connection = new AffiliateConnection({
			ownerId: owner.ownerId,
			ownerRole: owner.ownerRole,
			label: label || "Affiliate API",
			apiUrl: apiUrl.trim(),
			affiliateId: affiliateId || "",
			provider: provider || "generic",
			fieldMapping: fieldMapping || {},
			itemsPath: itemsPath || "products",
			apiKeyEncrypted: apiKey ? encryptSecret(apiKey) : undefined,
		});
		await connection.save();

		if (syncNow) {
			await enqueueJob("affiliate-import", {
				connectionId: connection._id.toString(),
				ownerId: owner.ownerId,
				ownerRole: owner.ownerRole,
			});
		}

		res.status(201).json({
			success: true,
			connection: sanitizeConnection(connection),
		});
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

export const updateConnection = async (req, res) => {
	try {
		const owner = resolveOwner(req);
		const connection = await AffiliateConnection.findOne({
			_id: req.params.connectionId,
			ownerId: owner?.ownerId,
			ownerRole: owner?.ownerRole,
		}).select("+apiKeyEncrypted");

		if (!connection) return res.status(404).json({ error: "Connection not found." });

		const { label, apiUrl, apiKey, affiliateId, fieldMapping, itemsPath, active } =
			req.body;
		if (label) connection.label = label;
		if (apiUrl) connection.apiUrl = apiUrl.trim();
		if (affiliateId !== undefined) connection.affiliateId = affiliateId;
		if (fieldMapping) connection.fieldMapping = fieldMapping;
		if (itemsPath) connection.itemsPath = itemsPath;
		if (active !== undefined) connection.active = active;
		if (apiKey) connection.apiKeyEncrypted = encryptSecret(apiKey);

		await connection.save();
		res.json({ success: true, connection: sanitizeConnection(connection) });
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

export const deleteConnection = async (req, res) => {
	try {
		const owner = resolveOwner(req);
		await AffiliateConnection.deleteOne({
			_id: req.params.connectionId,
			ownerId: owner?.ownerId,
			ownerRole: owner?.ownerRole,
		});
		res.json({ success: true });
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

export const testConnection = async (req, res) => {
	try {
		const owner = resolveOwner(req);
		const connection = await AffiliateConnection.findOne({
			_id: req.params.connectionId || req.body.connectionId,
			ownerId: owner?.ownerId,
			ownerRole: owner?.ownerRole,
		}).select("+apiKeyEncrypted");

		const body = req.body;
		let sample;

		if (body.provider === "ebay" || connection?.provider === "ebay") {
			sample = await fetchEbayCuratedFeed({ limit: 3 });
		} else {
			const apiUrl = body.apiUrl || connection?.apiUrl;
			const apiKey = body.apiKey
				? body.apiKey
				: connection?.apiKeyEncrypted
					? decryptSecret(connection.apiKeyEncrypted)
					: undefined;
			const raw = await fetchAffiliateApi({ apiUrl, apiKey });
			sample = mapAffiliateApiResponse(
				raw,
				body.fieldMapping || connection?.fieldMapping,
				body.itemsPath || connection?.itemsPath || "products",
			).slice(0, 3);
		}

		res.json({ success: true, sampleCount: sample.length, sample });
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

export const syncConnection = async (req, res) => {
	try {
		const owner = resolveOwner(req);
		const connection = await AffiliateConnection.findOne({
			_id: req.params.connectionId,
			ownerId: owner?.ownerId,
			ownerRole: owner?.ownerRole,
		}).select("+apiKeyEncrypted");

		if (!connection) return res.status(404).json({ error: "Connection not found." });

		await enqueueJob("affiliate-import", {
			connectionId: connection._id.toString(),
			ownerId: owner.ownerId,
			ownerRole: owner.ownerRole,
		});

		res.json({ success: true, message: "Import started." });
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

export const getAffiliateProducts = async (req, res) => {
	try {
		const owner = resolveOwner(req);
		const ownerId =
			req.query.ownerId && isAdminRole(req.user.role)
				? req.query.ownerId
				: owner?.ownerId;

		const products = await listAffiliateProducts(ownerId);
		res.json({ success: true, products });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

export const patchAffiliateProduct = async (req, res) => {
	try {
		const owner = resolveOwner(req);
		const product = await updateAffiliateProduct(
			owner.ownerId,
			req.params.productId,
			req.body,
		);
		res.json({ success: true, product });
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

export const deleteAffiliateProduct = async (req, res) => {
	try {
		const owner = resolveOwner(req);
		await removeAffiliateProduct(owner.ownerId, req.params.productId);
		res.json({ success: true });
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

export const importEbayFeedAdmin = async (req, res) => {
	try {
		if (!isAdminRole(req.user.role)) {
			return res.status(403).json({ error: "Admin only." });
		}

		const feed = await fetchEbayCuratedFeed({ limit: 50 });
		const result = await importAffiliateProducts({
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

		res.json({ success: true, ...result });
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

export async function runAffiliateImportJob({ connectionId, ownerId, ownerRole }) {
	const connection = await AffiliateConnection.findById(connectionId).select(
		"+apiKeyEncrypted",
	);
	if (!connection) throw new Error("Connection not found");

	connection.lastSyncStatus = "running";
	await connection.save();

	try {
		const plain = {
			...connection.toObject(),
			apiKey: connection.apiKeyEncrypted
				? decryptSecret(connection.apiKeyEncrypted)
				: undefined,
		};
		const result = await importAffiliateProducts({
			ownerId,
			ownerRole,
			connection: plain,
		});
		connection.lastSyncAt = new Date();
		connection.lastSyncStatus = "success";
		connection.lastImportedCount = result.importedCount;
		connection.lastSyncError = "";
		await connection.save();
		return result;
	} catch (error) {
		connection.lastSyncStatus = "failed";
		connection.lastSyncError = error.message;
		await connection.save();
		throw error;
	}
}
