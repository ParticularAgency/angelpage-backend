/**
 * Social auto-posting for approved listings (Meta Facebook/Instagram + TikTok).
 *
 * Required env (see .env.example):
 * - META_PAGE_ACCESS_TOKEN, META_PAGE_ID
 * - META_INSTAGRAM_ACCOUNT_ID (optional; resolved from Page if omitted)
 * - TIKTOK_ACCESS_TOKEN, TIKTOK_OPEN_ID (for video publish)
 * - FRONTEND_BASE_URL
 */

const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v19.0";
const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

export const defaultSocialPostingPrefs = () => ({
	facebook: true,
	instagram: true,
	tiktok: false,
	tiktokVideoUrl: "",
});

export function parseSocialPostingInput(raw) {
	if (!raw) return defaultSocialPostingPrefs();
	try {
		const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
		return {
			facebook: parsed.facebook !== false,
			instagram: !!parsed.instagram,
			tiktok: !!parsed.tiktok,
			tiktokVideoUrl: parsed.tiktokVideoUrl || "",
		};
	} catch {
		return defaultSocialPostingPrefs();
	}
}

function buildCaption({ title, price, productUrl }) {
	const hasPrice =
		price !== "" &&
		price !== undefined &&
		price !== null &&
		Number(price) > 0;
	if (!hasPrice) {
		return `${title} on Angelpage. ${productUrl}`;
	}
	return `${title} — £${price} on Angelpage. 90% goes to charity. ${productUrl}`;
}

async function metaGraphPost(path, body, token) {
	const res = await fetch(`${META_GRAPH_BASE}${path}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ ...body, access_token: token }),
	});
	if (!res.ok) {
		const err = await res.text();
		throw new Error(`Meta API failed (${path}): ${err}`);
	}
	return res.json();
}

async function resolveInstagramAccountId(pageId, token) {
	if (process.env.META_INSTAGRAM_ACCOUNT_ID) {
		return process.env.META_INSTAGRAM_ACCOUNT_ID;
	}
	const res = await fetch(
		`${META_GRAPH_BASE}/${pageId}?fields=instagram_business_account&access_token=${token}`,
	);
	if (!res.ok) {
		const err = await res.text();
		throw new Error(`Failed to resolve Instagram account: ${err}`);
	}
	const data = await res.json();
	return data.instagram_business_account?.id || null;
}

export async function postListingToFacebook({ title, price, productUrl }) {
	const token = process.env.META_PAGE_ACCESS_TOKEN;
	const pageId = process.env.META_PAGE_ID;
	if (!token || !pageId) {
		return { platform: "facebook", skipped: true, reason: "Meta credentials not configured" };
	}

	const message = buildCaption({ title, price, productUrl });
	const data = await metaGraphPost(`/${pageId}/feed`, { message, link: productUrl }, token);
	return { platform: "facebook", success: true, data };
}

export async function postListingToInstagram({ title, price, imageUrl, productUrl }) {
	const token = process.env.META_PAGE_ACCESS_TOKEN;
	const pageId = process.env.META_PAGE_ID;
	if (!token || !pageId) {
		return { platform: "instagram", skipped: true, reason: "Meta credentials not configured" };
	}
	if (!imageUrl) {
		return { platform: "instagram", skipped: true, reason: "Product image required for Instagram" };
	}

	const igAccountId = await resolveInstagramAccountId(pageId, token);
	if (!igAccountId) {
		return {
			platform: "instagram",
			skipped: true,
			reason: "Instagram Business account not linked to Facebook Page",
		};
	}

	const caption = buildCaption({ title, price, productUrl });
	const container = await metaGraphPost(
		`/${igAccountId}/media`,
		{ image_url: imageUrl, caption },
		token,
	);
	const published = await metaGraphPost(
		`/${igAccountId}/media_publish`,
		{ creation_id: container.id },
		token,
	);
	return { platform: "instagram", success: true, data: published };
}

export async function postListingToTikTok({ title, productUrl, videoUrl }) {
	const token = process.env.TIKTOK_ACCESS_TOKEN;
	if (!token) {
		return { platform: "tiktok", skipped: true, reason: "TikTok credentials not configured" };
	}
	if (!videoUrl) {
		return {
			platform: "tiktok",
			skipped: true,
			reason: "Upload a listing video (Photos step) or paste a TikTok video URL to enable TikTok posting",
		};
	}

	const caption = `${title} — Shop on Angelpage: ${productUrl}`;
	const res = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			post_info: {
				title: caption.slice(0, 150),
				privacy_level: process.env.TIKTOK_PRIVACY_LEVEL || "PUBLIC_TO_EVERYONE",
				disable_duet: false,
				disable_comment: false,
				disable_stitch: false,
			},
			source_info: {
				source: "PULL_FROM_URL",
				video_url: videoUrl,
			},
		}),
	});

	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		const message =
			data?.error?.message || data?.message || (await res.text().catch(() => "TikTok publish failed"));
		throw new Error(`TikTok post failed: ${message}`);
	}

	return { platform: "tiktok", success: true, data };
}

/** Twitter/X — requires TWITTER_BEARER_TOKEN + TWITTER_USER_ID */
export async function postListingToTwitter({ title, price, productUrl }) {
	const token = process.env.TWITTER_BEARER_TOKEN;
	if (!token) {
		return { platform: "twitter", skipped: true, reason: "Twitter API not configured" };
	}

	const text = `${title} — £${price} on Angelpage (90% to charity) ${productUrl}`.slice(0, 280);
	const res = await fetch("https://api.twitter.com/2/tweets", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ text }),
	});

	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.detail || data?.title || "Twitter post failed");
	}
	return { platform: "twitter", success: true, data };
}

/** @deprecated use postListingToFacebook */
export const postListingToMeta = postListingToFacebook;

export async function autoPostNewListing(product) {
	const prefs = {
		...defaultSocialPostingPrefs(),
		...(product.socialPosting?.toObject?.() || product.socialPosting || {}),
	};
	const base = process.env.FRONTEND_BASE_URL || "https://www.angelpage.co.uk";
	const productUrl = `${base}/product/${product._id}`;
	const payload = {
		title: product.name,
		price: product.price,
		imageUrl: product.images?.[0]?.url,
		productUrl,
		videoUrl: prefs.tiktokVideoUrl || product.videos?.[0]?.url || "",
	};

	const tasks = [];
	if (prefs.facebook) tasks.push(() => postListingToFacebook(payload));
	if (prefs.instagram) tasks.push(() => postListingToInstagram(payload));
	if (prefs.tiktok) tasks.push(() => postListingToTikTok(payload));

	if (tasks.length === 0) {
		return [{ platform: "none", skipped: true, reason: "All social channels disabled by seller" }];
	}

	const results = await Promise.allSettled(tasks.map((run) => run()));
	return results.map((result) => {
		if (result.status === "fulfilled") return result.value;
		return {
			success: false,
			error: result.reason?.message || String(result.reason),
		};
	});
}
