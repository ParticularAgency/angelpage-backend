"use strict";
/**
 * Social auto-posting for approved listings (Meta Facebook/Instagram + TikTok).
 *
 * Required env (see .env.example):
 * - META_PAGE_ACCESS_TOKEN, META_PAGE_ID
 * - META_INSTAGRAM_ACCOUNT_ID (optional; resolved from Page if omitted)
 * - TIKTOK_ACCESS_TOKEN, TIKTOK_OPEN_ID (for video publish)
 * - FRONTEND_BASE_URL
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postListingToMeta = exports.defaultSocialPostingPrefs = void 0;
exports.parseSocialPostingInput = parseSocialPostingInput;
exports.postListingToFacebook = postListingToFacebook;
exports.postListingToInstagram = postListingToInstagram;
exports.postListingToTikTok = postListingToTikTok;
exports.postListingToTwitter = postListingToTwitter;
exports.autoPostNewListing = autoPostNewListing;
const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v19.0";
const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;
const defaultSocialPostingPrefs = () => ({
    facebook: true,
    instagram: true,
    tiktok: false,
    tiktokVideoUrl: "",
});
exports.defaultSocialPostingPrefs = defaultSocialPostingPrefs;
function parseSocialPostingInput(raw) {
    if (!raw)
        return (0, exports.defaultSocialPostingPrefs)();
    try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        return {
            facebook: parsed.facebook !== false,
            instagram: !!parsed.instagram,
            tiktok: !!parsed.tiktok,
            tiktokVideoUrl: parsed.tiktokVideoUrl || "",
        };
    }
    catch (_a) {
        return (0, exports.defaultSocialPostingPrefs)();
    }
}
function buildCaption({ title, price, productUrl }) {
    const hasPrice = price !== "" &&
        price !== undefined &&
        price !== null &&
        Number(price) > 0;
    if (!hasPrice) {
        return `${title} on Angelpage. ${productUrl}`;
    }
    return `${title} — £${price} on Angelpage. 90% goes to charity. ${productUrl}`;
}
function metaGraphPost(path, body, token) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield fetch(`${META_GRAPH_BASE}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(Object.assign(Object.assign({}, body), { access_token: token })),
        });
        if (!res.ok) {
            const err = yield res.text();
            throw new Error(`Meta API failed (${path}): ${err}`);
        }
        return res.json();
    });
}
function resolveInstagramAccountId(pageId, token) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (process.env.META_INSTAGRAM_ACCOUNT_ID) {
            return process.env.META_INSTAGRAM_ACCOUNT_ID;
        }
        const res = yield fetch(`${META_GRAPH_BASE}/${pageId}?fields=instagram_business_account&access_token=${token}`);
        if (!res.ok) {
            const err = yield res.text();
            throw new Error(`Failed to resolve Instagram account: ${err}`);
        }
        const data = yield res.json();
        return ((_a = data.instagram_business_account) === null || _a === void 0 ? void 0 : _a.id) || null;
    });
}
function postListingToFacebook(_a) {
    return __awaiter(this, arguments, void 0, function* ({ title, price, productUrl }) {
        const token = process.env.META_PAGE_ACCESS_TOKEN;
        const pageId = process.env.META_PAGE_ID;
        if (!token || !pageId) {
            return { platform: "facebook", skipped: true, reason: "Meta credentials not configured" };
        }
        const message = buildCaption({ title, price, productUrl });
        const data = yield metaGraphPost(`/${pageId}/feed`, { message, link: productUrl }, token);
        return { platform: "facebook", success: true, data };
    });
}
function postListingToInstagram(_a) {
    return __awaiter(this, arguments, void 0, function* ({ title, price, imageUrl, productUrl }) {
        const token = process.env.META_PAGE_ACCESS_TOKEN;
        const pageId = process.env.META_PAGE_ID;
        if (!token || !pageId) {
            return { platform: "instagram", skipped: true, reason: "Meta credentials not configured" };
        }
        if (!imageUrl) {
            return { platform: "instagram", skipped: true, reason: "Product image required for Instagram" };
        }
        const igAccountId = yield resolveInstagramAccountId(pageId, token);
        if (!igAccountId) {
            return {
                platform: "instagram",
                skipped: true,
                reason: "Instagram Business account not linked to Facebook Page",
            };
        }
        const caption = buildCaption({ title, price, productUrl });
        const container = yield metaGraphPost(`/${igAccountId}/media`, { image_url: imageUrl, caption }, token);
        const published = yield metaGraphPost(`/${igAccountId}/media_publish`, { creation_id: container.id }, token);
        return { platform: "instagram", success: true, data: published };
    });
}
function postListingToTikTok(_a) {
    return __awaiter(this, arguments, void 0, function* ({ title, productUrl, videoUrl }) {
        var _b;
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
        const res = yield fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
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
        const data = yield res.json().catch(() => ({}));
        if (!res.ok) {
            const message = ((_b = data === null || data === void 0 ? void 0 : data.error) === null || _b === void 0 ? void 0 : _b.message) || (data === null || data === void 0 ? void 0 : data.message) || (yield res.text().catch(() => "TikTok publish failed"));
            throw new Error(`TikTok post failed: ${message}`);
        }
        return { platform: "tiktok", success: true, data };
    });
}
/** Twitter/X — requires TWITTER_BEARER_TOKEN + TWITTER_USER_ID */
function postListingToTwitter(_a) {
    return __awaiter(this, arguments, void 0, function* ({ title, price, productUrl }) {
        const token = process.env.TWITTER_BEARER_TOKEN;
        if (!token) {
            return { platform: "twitter", skipped: true, reason: "Twitter API not configured" };
        }
        const text = `${title} — £${price} on Angelpage (90% to charity) ${productUrl}`.slice(0, 280);
        const res = yield fetch("https://api.twitter.com/2/tweets", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ text }),
        });
        const data = yield res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error((data === null || data === void 0 ? void 0 : data.detail) || (data === null || data === void 0 ? void 0 : data.title) || "Twitter post failed");
        }
        return { platform: "twitter", success: true, data };
    });
}
/** @deprecated use postListingToFacebook */
exports.postListingToMeta = postListingToFacebook;
function autoPostNewListing(product) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f;
        const prefs = Object.assign(Object.assign({}, (0, exports.defaultSocialPostingPrefs)()), (((_b = (_a = product.socialPosting) === null || _a === void 0 ? void 0 : _a.toObject) === null || _b === void 0 ? void 0 : _b.call(_a)) || product.socialPosting || {}));
        const base = process.env.FRONTEND_BASE_URL || "https://www.angelpage.co.uk";
        const productUrl = `${base}/product/${product._id}`;
        const payload = {
            title: product.name,
            price: product.price,
            imageUrl: (_d = (_c = product.images) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.url,
            productUrl,
            videoUrl: prefs.tiktokVideoUrl || ((_f = (_e = product.videos) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.url) || "",
        };
        const tasks = [];
        if (prefs.facebook)
            tasks.push(() => postListingToFacebook(payload));
        if (prefs.instagram)
            tasks.push(() => postListingToInstagram(payload));
        if (prefs.tiktok)
            tasks.push(() => postListingToTikTok(payload));
        if (tasks.length === 0) {
            return [{ platform: "none", skipped: true, reason: "All social channels disabled by seller" }];
        }
        const results = yield Promise.allSettled(tasks.map((run) => run()));
        return results.map((result) => {
            var _a;
            if (result.status === "fulfilled")
                return result.value;
            return {
                success: false,
                error: ((_a = result.reason) === null || _a === void 0 ? void 0 : _a.message) || String(result.reason),
            };
        });
    });
}
