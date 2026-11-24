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
exports.cancelScheduledPost = exports.listScheduledPosts = exports.scheduleSocialPost = exports.triggerSocialPost = exports.getSocialPostLogs = void 0;
exports.runSocialPostJob = runSocialPostJob;
exports.runScheduledSocialPostJob = runScheduledSocialPostJob;
exports.queueAutoPostNewListing = queueAutoPostNewListing;
const SocialPostLog_model_js_1 = __importDefault(require("../../models/SocialPostLog.model.js"));
const ScheduledPost_model_js_1 = __importDefault(require("../../models/ScheduledPost.model.js"));
const Product_model_1 = __importDefault(require("../../models/Product.model"));
const socialPosting_service_js_1 = require("../../services/socialPosting.service.js");
const jobQueue_service_js_1 = require("../../services/jobQueue.service.js");
const adminRoles_js_1 = require("../../constants/adminRoles.js");
const PLATFORM_FN = {
    facebook: socialPosting_service_js_1.postListingToFacebook,
    instagram: socialPosting_service_js_1.postListingToInstagram,
    tiktok: socialPosting_service_js_1.postListingToTikTok,
    twitter: socialPosting_service_js_1.postListingToTwitter,
};
function runSocialPostJob(_a) {
    return __awaiter(this, arguments, void 0, function* ({ productId, platforms, trigger, ownerId }) {
        var _b, _c, _d, _e, _f;
        const product = yield Product_model_1.default.findById(productId);
        if (!product)
            throw new Error("Product not found");
        if (product.checkoutMode === "affiliate_redirect" ||
            product.checkoutMode === "ebay_redirect") {
            return { skipped: true, reason: "Affiliate listings are not auto-posted" };
        }
        const base = process.env.FRONTEND_BASE_URL || "https://www.angelpage.co.uk";
        const payload = {
            title: product.name,
            price: product.price,
            imageUrl: (_c = (_b = product.images) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.url,
            productUrl: `${base}/product/${product._id}`,
            videoUrl: ((_d = product.socialPosting) === null || _d === void 0 ? void 0 : _d.tiktokVideoUrl) || ((_f = (_e = product.videos) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.url) || "",
        };
        const prefs = product.socialPosting || {};
        const channels = (platforms === null || platforms === void 0 ? void 0 : platforms.length)
            ? platforms
            : [
                prefs.facebook !== false && "facebook",
                prefs.instagram && "instagram",
                prefs.tiktok && "tiktok",
            ].filter(Boolean);
        const logs = [];
        for (const platform of channels) {
            const log = yield SocialPostLog_model_js_1.default.create({
                productId,
                ownerId: ownerId || product.seller,
                platform,
                status: "pending",
                trigger: trigger || "manual",
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
                const result = yield fn(payload);
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
const getSocialPostLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, role } = req.user;
        const filter = (0, adminRoles_js_1.isAdminRole)(role) ? {} : { ownerId: userId };
        if (req.query.productId)
            filter.productId = req.query.productId;
        const logs = yield SocialPostLog_model_js_1.default.find(filter)
            .sort({ createdAt: -1 })
            .limit(100)
            .populate("productId", "name images");
        res.json({ success: true, logs });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getSocialPostLogs = getSocialPostLogs;
const triggerSocialPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { productId, platforms } = req.body;
        if (!productId)
            return res.status(400).json({ error: "productId required" });
        const product = yield Product_model_1.default.findById(productId);
        if (!product)
            return res.status(404).json({ error: "Product not found" });
        const isOwner = ((_a = product.seller) === null || _a === void 0 ? void 0 : _a.toString()) === req.user.userId;
        if (!isOwner && !(0, adminRoles_js_1.isAdminRole)(req.user.role)) {
            return res.status(403).json({ error: "Not authorized" });
        }
        yield (0, jobQueue_service_js_1.enqueueJob)("social-post", {
            productId,
            platforms,
            trigger: (0, adminRoles_js_1.isAdminRole)(req.user.role) ? "admin" : "manual",
            ownerId: req.user.userId,
        });
        res.json({ success: true, message: "Post queued." });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
exports.triggerSocialPost = triggerSocialPost;
const scheduleSocialPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId, platforms, scheduledFor, caption } = req.body;
        if (!productId || !scheduledFor) {
            return res.status(400).json({ error: "productId and scheduledFor required" });
        }
        const when = new Date(scheduledFor);
        if (Number.isNaN(when.getTime()) || when < new Date()) {
            return res.status(400).json({ error: "scheduledFor must be a future date" });
        }
        const scheduled = yield ScheduledPost_model_js_1.default.create({
            productId,
            ownerId: req.user.userId,
            platforms: platforms || ["facebook", "instagram"],
            scheduledFor: when,
            caption: caption || "",
        });
        const delay = when.getTime() - Date.now();
        const job = yield (0, jobQueue_service_js_1.enqueueJob)("scheduled-social-post", { scheduledPostId: scheduled._id.toString() }, { delay });
        if (job === null || job === void 0 ? void 0 : job.id) {
            scheduled.jobId = String(job.id);
            yield scheduled.save();
        }
        res.status(201).json({ success: true, scheduled });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
exports.scheduleSocialPost = scheduleSocialPost;
const listScheduledPosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const filter = (0, adminRoles_js_1.isAdminRole)(req.user.role) ? {} : { ownerId: req.user.userId };
        const posts = yield ScheduledPost_model_js_1.default.find(filter)
            .sort({ scheduledFor: 1 })
            .limit(50)
            .populate("productId", "name");
        res.json({ success: true, posts });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.listScheduledPosts = listScheduledPosts;
const cancelScheduledPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const filter = {
            _id: req.params.id,
            status: "scheduled",
        };
        if (!(0, adminRoles_js_1.isAdminRole)(req.user.role)) {
            filter.ownerId = req.user.userId;
        }
        const post = yield ScheduledPost_model_js_1.default.findOneAndUpdate(filter, { status: "cancelled" }, { new: true });
        if (!post)
            return res.status(404).json({ error: "Scheduled post not found" });
        res.json({ success: true, post });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
exports.cancelScheduledPost = cancelScheduledPost;
function runScheduledSocialPostJob(_a) {
    return __awaiter(this, arguments, void 0, function* ({ scheduledPostId }) {
        const scheduled = yield ScheduledPost_model_js_1.default.findById(scheduledPostId);
        if (!scheduled || scheduled.status !== "scheduled")
            return;
        scheduled.status = "processing";
        yield scheduled.save();
        try {
            yield runSocialPostJob({
                productId: scheduled.productId.toString(),
                platforms: scheduled.platforms,
                trigger: "scheduled",
                ownerId: scheduled.ownerId,
            });
            scheduled.status = "completed";
            yield scheduled.save();
        }
        catch (error) {
            scheduled.status = "failed";
            scheduled.error = error.message;
            yield scheduled.save();
            throw error;
        }
    });
}
function queueAutoPostNewListing(product) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        yield (0, jobQueue_service_js_1.enqueueJob)("social-post", {
            productId: product._id.toString(),
            trigger: "auto",
            ownerId: (_a = product.seller) === null || _a === void 0 ? void 0 : _a.toString(),
        });
    });
}
