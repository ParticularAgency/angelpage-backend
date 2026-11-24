"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.runGallerySocialPostJob = runGallerySocialPostJob;
exports.queueGallerySocialPost = queueGallerySocialPost;
const GalleryItem_model_js_1 = __importDefault(require("../models/GalleryItem.model.js"));
const SocialPostLog_model_js_1 = __importDefault(require("../models/SocialPostLog.model.js"));
const socialPosting_service_js_1 = require("./socialPosting.service.js");
const PLATFORM_FN = {
    facebook: socialPosting_service_js_1.postListingToFacebook,
    instagram: socialPosting_service_js_1.postListingToInstagram,
    tiktok: socialPosting_service_js_1.postListingToTikTok,
    twitter: socialPosting_service_js_1.postListingToTwitter,
};
const buildGalleryPayload = (item) => {
    var _a;
    const base = process.env.FRONTEND_BASE_URL || "https://www.angelpage.co.uk";
    const shareUrl = `${base}/reels?item=${item.slug}`;
    const isVideo = ["video", "reel"].includes((_a = item.media) === null || _a === void 0 ? void 0 : _a.mediaType);
    return {
        title: item.title,
        price: "",
        imageUrl: item.media.thumbnailUrl || item.media.url,
        productUrl: shareUrl,
        videoUrl: isVideo ? item.media.url : "",
        caption: item.caption || item.title,
    };
};
function runGallerySocialPostJob(_a) {
    return __awaiter(this, arguments, void 0, function* ({ galleryItemId, platforms, trigger, ownerId, }) {
        const item = yield GalleryItem_model_js_1.default.findById(galleryItemId);
        if (!item)
            throw new Error("Gallery item not found");
        const payload = buildGalleryPayload(item);
        const prefs = item.socialPosting || {};
        const channels = (platforms === null || platforms === void 0 ? void 0 : platforms.length)
            ? platforms
            : [
                prefs.facebook !== false && "facebook",
                prefs.instagram && "instagram",
                prefs.tiktok && "tiktok",
                prefs.twitter && "twitter",
            ].filter(Boolean);
        const logs = [];
        for (const platform of channels) {
            const log = yield SocialPostLog_model_js_1.default.create({
                galleryItemId,
                ownerId: ownerId || item.authorId,
                platform,
                status: "pending",
                trigger: trigger || "manual",
                contentType: "gallery_item",
                attempts: 1,
            });
            try {
                const fn = PLATFORM_FN[platform];
                if (!fn) {
                    log.status = "skipped";
                    log.error = "Platform not supported";
                    yield log.save();
                    logs.push(log);
                    continue;
                }
                const sharePayload = platform === "facebook"
                    ? {
                        title: payload.caption,
                        price: "0",
                        productUrl: payload.productUrl,
                    }
                    : payload;
                const result = yield fn(sharePayload);
                log.status = result.skipped
                    ? "skipped"
                    : result.success
                        ? "success"
                        : "failed";
                log.response = result;
                log.error = result.reason || result.error || "";
                yield log.save();
                logs.push(log);
            }
            catch (error) {
                log.status = "failed";
                log.error = error.message;
                yield log.save();
                logs.push(log);
            }
        }
        return logs;
    });
}
function queueGallerySocialPost(item_1) {
    return __awaiter(this, arguments, void 0, function* (item, trigger = "auto") {
        var _a;
        const { enqueueJob } = yield Promise.resolve().then(() => __importStar(require("./jobQueue.service.js")));
        yield enqueueJob("gallery-social-post", {
            galleryItemId: item._id.toString(),
            trigger,
            ownerId: (_a = item.authorId) === null || _a === void 0 ? void 0 : _a.toString(),
        });
    });
}
