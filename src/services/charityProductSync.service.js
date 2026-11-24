import Charity from "../models/Charity.model";
import { decryptSecret } from "../utils/credentialCrypto.js";
import { detectStorePlatform } from "./charityIntegrationDetect.service.js";
import { upsertImportedProducts } from "./charityProductImport.service.js";
import { fetchShopifyProducts, testShopifyConnection } from "./shopifySync.service.js";
import { fetchWooCommerceProducts, testWooCommerceConnection } from "./wooCommerceSync.service.js";
import { fetchScrapedProducts, testScrapeConnection } from "./scrapeProductSync.service.js";

function integrationConfig(charity) {
	const pi = charity.productIntegration || {};
	return {
		productSource: pi.productSource || "manual",
		storeUrl: pi.storeUrl || charity.websiteLink || "",
		shopifyDomain: pi.shopifyDomain || "",
		apiKey: pi.apiKeyEncrypted ? decryptSecret(pi.apiKeyEncrypted) : "",
		apiSecret: pi.apiSecretEncrypted ? decryptSecret(pi.apiSecretEncrypted) : "",
		autoSync: pi.autoSync !== false,
	};
}

async function fetchProductsForIntegration(config) {
	const { productSource, storeUrl, shopifyDomain, apiKey, apiSecret } = config;

	switch (productSource) {
		case "shopify":
		case "api_key":
			return fetchShopifyProducts({
				storeUrl,
				shopifyDomain,
				accessToken: apiKey || undefined,
			});
		case "woocommerce":
		case "wordpress":
			return fetchWooCommerceProducts({
				storeUrl,
				consumerKey: apiKey,
				consumerSecret: apiSecret,
			});
		case "scrape":
			return fetchScrapedProducts({ storeUrl });
		case "manual":
			return [];
		default:
			if (apiKey) {
				try {
					return await fetchShopifyProducts({
						storeUrl,
						shopifyDomain,
						accessToken: apiKey,
					});
				} catch {
					return fetchWooCommerceProducts({
						storeUrl,
						consumerKey: apiKey,
						consumerSecret: apiSecret,
					});
				}
			}
			return fetchScrapedProducts({ storeUrl });
	}
}

export async function testCharityIntegration(charityId) {
	const charity = await Charity.findById(charityId);
	if (!charity) throw new Error("Charity not found");

	const config = integrationConfig(charity);
	if (!config.storeUrl && config.productSource !== "manual") {
		throw new Error("Store URL is required.");
	}

	switch (config.productSource) {
		case "shopify":
		case "api_key":
			return testShopifyConnection({
				storeUrl: config.storeUrl,
				shopifyDomain: config.shopifyDomain,
				accessToken: config.apiKey,
			});
		case "woocommerce":
		case "wordpress":
			return testWooCommerceConnection({
				storeUrl: config.storeUrl,
				consumerKey: config.apiKey,
				consumerSecret: config.apiSecret,
			});
		case "scrape":
			return testScrapeConnection({ storeUrl: config.storeUrl });
		default:
			return detectStorePlatform(config.storeUrl);
	}
}

export async function syncCharityProducts(charityId) {
	const charity = await Charity.findById(charityId);
	if (!charity) throw new Error("Charity not found");

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

	await Charity.findByIdAndUpdate(charityId, {
		"productIntegration.lastSyncStatus": "running",
		"productIntegration.lastSyncError": "",
	});

	try {
		const externalProducts = await fetchProductsForIntegration(config);
		const result = await upsertImportedProducts(charityId, externalProducts, {
			autoPublish: true,
		});

		await Charity.findByIdAndUpdate(charityId, {
			"productIntegration.lastSyncAt": new Date(),
			"productIntegration.lastSyncStatus": "success",
			"productIntegration.lastSyncError": "",
			"productIntegration.lastImportedCount": result.importedCount,
			"productIntegration.lastUpdatedCount": result.updatedCount,
			"productIntegration.totalSyncedProducts": result.totalListed,
		});

		return {
			...result,
			message: `Synced ${result.importedCount} new and ${result.updatedCount} updated products.`,
		};
	} catch (error) {
		await Charity.findByIdAndUpdate(charityId, {
			"productIntegration.lastSyncAt": new Date(),
			"productIntegration.lastSyncStatus": "failed",
			"productIntegration.lastSyncError": error.message,
		});
		throw error;
	}
}

export async function detectAndSuggestIntegration(storeUrl) {
	return detectStorePlatform(storeUrl);
}
