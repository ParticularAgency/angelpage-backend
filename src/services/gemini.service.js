import Product from "../models/Product.model";
import {
	PRODUCT_CATEGORIES,
	BLOG_CATEGORIES,
	EVENT_TYPES,
	EVENT_CATEGORIES,
} from "../constants/productCategories.js";

const getGeminiApiKey = () =>
	(process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "");

const getGeminiModel = () => process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";

const getGeminiFallbackModel = () =>
	process.env.GEMINI_FALLBACK_MODEL || "gemini-2.0-flash-lite";

const categoryListText = () =>
	PRODUCT_CATEGORIES.map(
		(c) => `${c.name}: ${c.subCategories.join(", ")}`,
	).join("\n");

const parseJsonResponse = (text) => {
	if (!text) throw new Error("Empty AI response");
	const trimmed = text.trim();
	try {
		return JSON.parse(trimmed);
	} catch {
		const match = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
		if (match) return JSON.parse(match[0]);
		throw new Error("AI returned invalid JSON");
	}
};

const parseGeminiError = (status, errBody) => {
	let parsed;
	try {
		parsed = JSON.parse(errBody);
	} catch {
		parsed = null;
	}
	const apiMessage = parsed?.error?.message || errBody || "Unknown Gemini error";

	if (status === 429) {
		const retryMatch = apiMessage.match(/retry in ([\d.]+)s/i);
		const retryHint = retryMatch
			? ` Try again in about ${Math.ceil(Number(retryMatch[1]))} seconds.`
			: " Wait a minute and try again.";
		return new Error(
			`Gemini API quota exceeded (free tier limit).${retryHint} Enable billing in Google AI Studio or switch GEMINI_MODEL to gemini-2.0-flash-lite.`,
		);
	}
	if (status === 401 || status === 403) {
		return new Error("Gemini API key is invalid or not authorized. Check GEMINI_API_KEY.");
	}
	if (status === 404) {
		return new Error(
			`Gemini model not found. Set GEMINI_MODEL to a valid model (e.g. gemini-2.0-flash-lite).`,
		);
	}
	return new Error(`AI service error (${status}): ${apiMessage.slice(0, 200)}`);
};

const parseRetryDelayMs = (errBody) => {
	try {
		const parsed = JSON.parse(errBody);
		const message = parsed?.error?.message || "";
		const match = message.match(/retry in ([\d.]+)s/i);
		if (match) return Math.min(Math.ceil(Number(match[1]) * 1000) + 500, 60000);
		const retryInfo = parsed?.error?.details?.find((d) =>
			String(d["@type"] || "").includes("RetryInfo"),
		);
		if (retryInfo?.retryDelay) {
			const sec = parseInt(String(retryInfo.retryDelay), 10);
			if (!Number.isNaN(sec)) return Math.min(sec * 1000 + 500, 60000);
		}
	} catch {
		/* ignore */
	}
	return 6000;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const callGeminiOnce = async ({ prompt, imageBase64, mimeType, model }) => {
	const GEMINI_API_KEY = getGeminiApiKey();
	if (!GEMINI_API_KEY) {
		throw new Error("GEMINI_API_KEY is not configured on the server.");
	}

	const parts = [{ text: prompt }];
	if (imageBase64) {
		parts.push({
			inline_data: {
				mime_type: mimeType || "image/jpeg",
				data: imageBase64,
			},
		});
	}

	const res = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				contents: [{ role: "user", parts }],
				generationConfig: {
					temperature: 0.4,
					responseMimeType: "application/json",
				},
			}),
		},
	);

	if (!res.ok) {
		const errBody = await res.text();
		console.error("Gemini API error:", res.status, model, errBody.slice(0, 500));
		const err = parseGeminiError(res.status, errBody);
		err.status = res.status;
		err.body = errBody;
		throw err;
	}

	const data = await res.json();
	const text =
		data?.candidates?.[0]?.content?.parts?.[0]?.text ||
		data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("");

	return parseJsonResponse(text);
};

const callGemini = async ({ prompt, imageBase64, mimeType }) => {
	const primaryModel = getGeminiModel();
	const fallbackModel = getGeminiFallbackModel();
	const modelsToTry =
		primaryModel === fallbackModel
			? [primaryModel]
			: [primaryModel, fallbackModel];

	let lastError;
	for (const model of modelsToTry) {
		try {
			return await callGeminiOnce({ prompt, imageBase64, mimeType, model });
		} catch (err) {
			lastError = err;
			if (err.status === 429 && modelsToTry.indexOf(model) < modelsToTry.length - 1) {
				console.warn(`Gemini quota hit for ${model}, trying ${fallbackModel}...`);
				continue;
			}
			if (err.status === 429) {
				const delayMs = parseRetryDelayMs(err.body || "");
				console.warn(`Gemini 429 — retrying ${model} after ${delayMs}ms`);
				await sleep(delayMs);
				try {
					return await callGeminiOnce({ prompt, imageBase64, mimeType, model });
				} catch (retryErr) {
					lastError = retryErr;
				}
			}
			if (err.status === 404 && modelsToTry.indexOf(model) < modelsToTry.length - 1) {
				continue;
			}
			throw err;
		}
	}
	throw lastError || new Error("AI service temporarily unavailable.");
};

export const analyzeProductImage = async (imageBuffer, mimeType) => {
	const base64 = imageBuffer.toString("base64");
	return callGemini({
		prompt: `You are a UK second-hand marketplace listing assistant for Angelpage (charity-linked resale).
Analyze this product image and return JSON only:
{
  "title": "concise marketplace title max 80 chars",
  "brand": "brand or empty string",
  "color": "primary colour",
  "material": "material if visible",
  "condition": "one of: New with tags, Like new, Good, Fair, Well worn",
  "category": "must be one category name from this list: ${PRODUCT_CATEGORIES.map((c) => c.name).join(", ")}",
  "subcategory": "must match a subcategory under the chosen category",
  "size": "size if clothing/shoes else empty",
  "additionalInfo": "2-4 sentence buyer-friendly description highlighting features, style, and charity resale appeal",
  "searchKeywords": ["5-8 search terms buyers might use"]
}
Pick the closest category/subcategory from:
${categoryListText()}`,
		imageBase64: base64,
		mimeType,
	});
};

export const enhanceListing = async (fields) => {
	return callGemini({
		prompt: `Improve this UK marketplace listing for Angelpage charity resale. Return JSON only:
{
  "suggestedTitle": "SEO-friendly title max 80 chars",
  "suggestedDescription": "compelling 2-5 sentence description",
  "brand": "suggested brand or keep existing",
  "color": "suggested colour",
  "material": "suggested material",
  "category": "from allowed categories",
  "subcategory": "matching subcategory",
  "searchKeywords": ["relevant keywords"]
}
Allowed categories:
${categoryListText()}

Current listing:
${JSON.stringify(fields, null, 2)}`,
	});
};

export const enhanceBlogSeo = async (fields) => {
	return callGemini({
		prompt: `You are an SEO copywriter for Angelpage, a UK charity-linked marketplace blog.
Return JSON only:
{
  "title": "engaging article title max 70 chars",
  "metaTitle": "SEO title max 60 chars with primary keyword",
  "metaDescription": "meta description 140-160 chars",
  "excerpt": "compelling excerpt 1-2 sentences for cards",
  "content": "article body 3-6 paragraphs plain text or light HTML <p> tags, UK English, charity/sustainability tone",
  "category": "one of: ${BLOG_CATEGORIES.join(", ")}",
  "tags": ["6-10 lowercase SEO tags as pills"],
  "keywords": ["5-8 SEO keywords"],
  "slugSuggestion": "url-friendly-slug"
}
Input:
${JSON.stringify(fields, null, 2)}`,
	});
};

export const suggestEvent = async (fields) => {
	return callGemini({
		prompt: `You are a community events copywriter for Angelpage charity platform (UK).
Return JSON only:
{
  "title": "compelling event title max 80 chars",
  "excerpt": "short hook 1-2 sentences for listings",
  "description": "full description 3-5 paragraphs, warm and actionable",
  "category": "one of: ${EVENT_CATEGORIES.join(", ")}",
  "eventType": "one of: ${EVENT_TYPES.join(", ")}",
  "topic": "one-line topic/theme",
  "pollQuestion": "optional poll question or empty string",
  "pollOptions": ["3-5 poll options if pollQuestion set, else empty array"],
  "keywords": ["5-8 discovery keywords"]
}
Context:
${JSON.stringify(fields, null, 2)}`,
	});
};

const buildProductSearchQuery = (terms) => {
	const unique = [...new Set(terms.filter(Boolean).map((t) => String(t).trim()))];
	if (!unique.length) return null;

	const orClauses = [];
	for (const term of unique.slice(0, 12)) {
		const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		orClauses.push(
			{ name: { $regex: escaped, $options: "i" } },
			{ brand: { $regex: escaped, $options: "i" } },
			{ category: { $regex: escaped, $options: "i" } },
			{ subcategory: { $regex: escaped, $options: "i" } },
			{ additionalInfo: { $regex: escaped, $options: "i" } },
		);
	}
	return { status: "LIVE", $or: orClauses };
};

export const smartProductSearch = async (query) => {
	const expansion = await callGemini({
		prompt: `Expand this product search query for a UK fashion/resale marketplace.
Return JSON only: { "searchTerms": ["original query plus synonyms, brands, categories, typo fixes, max 10 terms"], "intent": "brief intent" }
Query: "${query}"`,
	});

	const terms = [
		query,
		...(expansion.searchTerms || []),
		...(expansion.keywords || []),
	];

	const mongoQuery = buildProductSearchQuery(terms);
	if (!mongoQuery) return { intent: expansion.intent, products: [] };

	const products = await Product.find(mongoQuery)
		.select("name brand category subcategory price images condition")
		.limit(20)
		.lean();

	return {
		intent: expansion.intent || "product search",
		searchTerms: terms.slice(0, 10),
		products,
	};
};

export const searchProductsByImage = async (imageBuffer, mimeType) => {
	const analysis = await analyzeProductImage(imageBuffer, mimeType);
	const terms = [
		analysis.title,
		analysis.brand,
		analysis.color,
		analysis.category,
		analysis.subcategory,
		...(analysis.searchKeywords || []),
	].filter(Boolean);

	const mongoQuery = buildProductSearchQuery(terms);
	let products = [];
	if (mongoQuery) {
		const found = await Product.find(mongoQuery)
			.select("name slug brand category subcategory price images condition")
			.limit(40)
			.lean();
		const scoreOf = (product) => {
			const name = String(product.name || "").toLowerCase();
			const brand = String(product.brand || "").toLowerCase();
			const category = String(product.category || "").toLowerCase();
			const subcategory = String(product.subcategory || "").toLowerCase();
			let score = 0;
			for (const raw of terms) {
				const term = String(raw).trim().toLowerCase();
				if (term.length < 2) continue;
				if (name.includes(term)) score += 6;
				if (brand && (brand === term || brand.includes(term))) score += 4;
				if (category === term || category.includes(term)) score += 5;
				if (subcategory === term || subcategory.includes(term)) score += 4;
			}
			return score;
		};
		products = found
			.map((product) => ({ ...product, matchScore: scoreOf(product) }))
			.sort((a, b) => b.matchScore - a.matchScore)
			.slice(0, 8);
	}

	return {
		analysis,
		products,
		searchTerms: terms,
	};
};

export const isGeminiConfigured = () => Boolean(getGeminiApiKey());
