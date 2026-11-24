import {
	analyzeProductImage,
	enhanceListing,
	enhanceBlogSeo,
	suggestEvent,
	smartProductSearch,
	searchProductsByImage,
	isGeminiConfigured,
} from "../../services/gemini.service.js";

export const aiStatus = (req, res) => {
	res.json({
		enabled: isGeminiConfigured(),
		model: process.env.GEMINI_MODEL || "gemini-2.0-flash-lite",
		fallbackModel: process.env.GEMINI_FALLBACK_MODEL || "gemini-2.0-flash-lite",
	});
};

export const analyzeImage = async (req, res) => {
	try {
		if (!req.file?.buffer) {
			return res.status(400).json({ error: "Image file is required." });
		}
		const result = await analyzeProductImage(req.file.buffer, req.file.mimetype);
		res.json({ success: true, ...result });
	} catch (err) {
		console.error("analyzeImage:", err.message);
		res.status(500).json({ error: err.message || "Image analysis failed." });
	}
};

export const enhanceListingHandler = async (req, res) => {
	try {
		const result = await enhanceListing(req.body || {});
		res.json({ success: true, ...result });
	} catch (err) {
		console.error("enhanceListing:", err.message);
		res.status(500).json({ error: err.message || "Listing enhancement failed." });
	}
};

export const enhanceBlogHandler = async (req, res) => {
	try {
		const result = await enhanceBlogSeo(req.body || {});
		res.json({ success: true, ...result });
	} catch (err) {
		console.error("enhanceBlog:", err.message);
		res.status(500).json({ error: err.message || "Blog SEO generation failed." });
	}
};

export const suggestEventHandler = async (req, res) => {
	try {
		const result = await suggestEvent(req.body || {});
		res.json({ success: true, ...result });
	} catch (err) {
		console.error("suggestEvent:", err.message);
		res.status(500).json({ error: err.message || "Event suggestion failed." });
	}
};

export const smartSearchHandler = async (req, res) => {
	try {
		const { query } = req.body || {};
		if (!query || typeof query !== "string" || query.trim().length < 2) {
			return res.status(400).json({ error: "Query must be at least 2 characters." });
		}
		const result = await smartProductSearch(query.trim());
		res.json({ success: true, ...result });
	} catch (err) {
		console.error("smartSearch:", err.message);
		res.status(500).json({ error: err.message || "Smart search failed." });
	}
};

export const searchByImageHandler = async (req, res) => {
	try {
		if (!req.file?.buffer) {
			return res.status(400).json({ error: "Image file is required." });
		}
		const result = await searchProductsByImage(req.file.buffer, req.file.mimetype);
		res.json({ success: true, ...result });
	} catch (err) {
		console.error("searchByImage:", err.message);
		res.status(500).json({ error: err.message || "Image search failed." });
	}
};
