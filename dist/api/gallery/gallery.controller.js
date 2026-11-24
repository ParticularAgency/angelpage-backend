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
exports.runGallerySocialPostJob = exports.deleteGalleryItem = exports.shareGalleryItem = exports.publishGalleryItem = exports.createGalleryItem = exports.getAdminGallery = exports.getMyGallery = exports.getGalleryBySlug = exports.getPublishedGallery = void 0;
const fs_1 = __importDefault(require("fs"));
const GalleryItem_model_js_1 = __importDefault(require("../../models/GalleryItem.model.js"));
const User_model_1 = __importDefault(require("../../models/User.model"));
const Charity_model_1 = __importDefault(require("../../models/Charity.model"));
const Admin_model_1 = __importDefault(require("../../models/Admin.model"));
const cloudinary_1 = __importDefault(require("../../config/cloudinary"));
const adminRoles_js_1 = require("../../constants/adminRoles.js");
const charityAccess_js_1 = require("../../utils/charityAccess.js");
const socialPosting_service_js_1 = require("../../services/socialPosting.service.js");
const gallerySocial_service_js_1 = require("../../services/gallerySocial.service.js");
Object.defineProperty(exports, "runGallerySocialPostJob", { enumerable: true, get: function () { return gallerySocial_service_js_1.runGallerySocialPostJob; } });
const jobQueue_service_js_1 = require("../../services/jobQueue.service.js");
const slugify = (text) => text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
const getAuthorProfile = (authorId, authorRole) => __awaiter(void 0, void 0, void 0, function* () {
    switch (authorRole) {
        case "USER":
            return User_model_1.default.findById(authorId).select("firstName lastName profileImage");
        case "CHARITY":
            return Charity_model_1.default.findById(authorId).select("charityName profileImage firstName lastName");
        case "ADMIN":
            return Admin_model_1.default.findById(authorId).select("firstName lastName profileImage");
        default:
            return null;
    }
});
const authorDisplayName = (profile, role) => {
    if (!profile)
        return "Angelpage";
    if (role === "CHARITY")
        return profile.charityName || profile.firstName || "Charity";
    return `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "Creator";
};
const parseKind = (kind, mimeType) => {
    if (kind === "reel" || kind === "document" || kind === "photo")
        return kind;
    if (mimeType === null || mimeType === void 0 ? void 0 : mimeType.startsWith("video/"))
        return "reel";
    if (mimeType === "application/pdf")
        return "document";
    return "photo";
};
const uploadMedia = (file, kindHint) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const isVideo = ((_a = file.mimetype) === null || _a === void 0 ? void 0 : _a.startsWith("video/")) || kindHint === "reel";
    const folder = isVideo ? "gallery/reels" : "gallery/images";
    const options = isVideo
        ? {
            folder,
            resource_type: "video",
            eager: [{ width: 640, height: 360, crop: "fill", format: "jpg" }],
        }
        : { folder };
    const result = yield cloudinary_1.default.uploader.upload(file.path, options);
    const thumbnailUrl = isVideo && ((_c = (_b = result.eager) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.secure_url)
        ? result.eager[0].secure_url
        : result.secure_url;
    return {
        url: result.secure_url,
        publicId: result.public_id,
        mediaType: isVideo ? "reel" : kindHint === "document" ? "document" : "image",
        mimeType: file.mimetype,
        thumbnailUrl,
        durationSec: result.duration || undefined,
    };
});
const cleanupFile = (file) => {
    if (file === null || file === void 0 ? void 0 : file.path) {
        fs_1.default.unlink(file.path, () => { });
    }
};
const getPublishedGallery = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { kind, limit = 24, page = 1 } = req.query;
        const query = { status: "published" };
        if (kind)
            query.kind = kind;
        const items = yield GalleryItem_model_js_1.default.find(query)
            .sort({ publishedAt: -1, createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = yield GalleryItem_model_js_1.default.countDocuments(query);
        res.json({ items, total, page: Number(page) });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch gallery." });
    }
});
exports.getPublishedGallery = getPublishedGallery;
const getGalleryBySlug = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield GalleryItem_model_js_1.default.findOne({
            slug: req.params.slug,
            status: "published",
        });
        if (!item)
            return res.status(404).json({ message: "Not found." });
        item.viewCount += 1;
        yield item.save();
        res.json({ item });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch item." });
    }
});
exports.getGalleryBySlug = getGalleryBySlug;
const getMyGallery = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, role } = req.user;
        const authorId = (0, charityAccess_js_1.isCharityAccountRole)(role)
            ? (0, charityAccess_js_1.resolveCharityId)(req.user)
            : userId;
        const authorRole = (0, charityAccess_js_1.isCharityAccountRole)(role) ? "CHARITY" : role;
        const items = yield GalleryItem_model_js_1.default.find({ authorId, authorRole }).sort({
            updatedAt: -1,
        });
        res.json({ items });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch your gallery." });
    }
});
exports.getMyGallery = getMyGallery;
const getAdminGallery = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status } = req.query;
        const query = status ? { status } : {};
        const items = yield GalleryItem_model_js_1.default.find(query).sort({ updatedAt: -1 });
        res.json({ items });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch gallery queue." });
    }
});
exports.getAdminGallery = getAdminGallery;
const createGalleryItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { userId, role } = req.user;
        const { title, caption, kind, tags, productId, socialPosting, publishNow } = req.body;
        if (!(title === null || title === void 0 ? void 0 : title.trim())) {
            return res.status(400).json({ message: "Title is required." });
        }
        if (!((_a = req.file) === null || _a === void 0 ? void 0 : _a.path)) {
            return res.status(400).json({ message: "Media file is required." });
        }
        const authorId = (0, charityAccess_js_1.isCharityAccountRole)(role)
            ? (0, charityAccess_js_1.resolveCharityId)(req.user)
            : userId;
        const authorRole = (0, charityAccess_js_1.isCharityAccountRole)(role) ? "CHARITY" : role;
        const profile = yield getAuthorProfile(authorId, authorRole);
        const media = yield uploadMedia(req.file, kind);
        cleanupFile(req.file);
        let slug = slugify(title);
        if (yield GalleryItem_model_js_1.default.findOne({ slug })) {
            slug = `${slug}-${Date.now()}`;
        }
        const parsedKind = parseKind(kind, req.file.mimetype);
        let status = "pending_review";
        if ((0, adminRoles_js_1.isAdminRole)(role)) {
            status =
                publishNow === "true" || publishNow === true ? "published" : "pending_review";
        }
        const item = yield GalleryItem_model_js_1.default.create({
            title: title.trim(),
            slug,
            caption: caption || "",
            media,
            kind: parsedKind,
            tags: tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : [],
            productId: productId || undefined,
            charityId: authorRole === "CHARITY" ? authorId : undefined,
            authorId,
            authorRole,
            authorName: authorDisplayName(profile, authorRole),
            authorAvatar: (profile === null || profile === void 0 ? void 0 : profile.profileImage) || "",
            status,
            publishedAt: status === "published" ? new Date() : undefined,
            socialPosting: Object.assign(Object.assign({}, (0, socialPosting_service_js_1.parseSocialPostingInput)(socialPosting)), { autoPostOnPublish: true, twitter: false }),
        });
        if (status === "published" && ((_b = item.socialPosting) === null || _b === void 0 ? void 0 : _b.autoPostOnPublish)) {
            yield (0, gallerySocial_service_js_1.queueGallerySocialPost)(item, (0, adminRoles_js_1.isAdminRole)(role) ? "admin" : "auto");
        }
        res.status(201).json({ message: "Gallery item saved.", item });
    }
    catch (error) {
        cleanupFile(req.file);
        console.error("createGalleryItem:", error);
        res.status(500).json({ message: error.message || "Failed to create gallery item." });
    }
});
exports.createGalleryItem = createGalleryItem;
const publishGalleryItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const item = yield GalleryItem_model_js_1.default.findById(req.params.id);
        if (!item)
            return res.status(404).json({ message: "Not found." });
        item.status = "published";
        item.publishedAt = new Date();
        yield item.save();
        if (((_a = item.socialPosting) === null || _a === void 0 ? void 0 : _a.autoPostOnPublish) !== false) {
            yield (0, gallerySocial_service_js_1.queueGallerySocialPost)(item, "admin");
        }
        res.json({ message: "Published.", item });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to publish." });
    }
});
exports.publishGalleryItem = publishGalleryItem;
const shareGalleryItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield GalleryItem_model_js_1.default.findById(req.params.id);
        if (!item)
            return res.status(404).json({ message: "Not found." });
        const ownerId = (0, charityAccess_js_1.isCharityAccountRole)(req.user.role)
            ? (0, charityAccess_js_1.resolveCharityId)(req.user)
            : req.user.userId;
        const isOwner = item.authorId.toString() === (ownerId === null || ownerId === void 0 ? void 0 : ownerId.toString());
        if (!isOwner && !(0, adminRoles_js_1.isAdminRole)(req.user.role)) {
            return res.status(403).json({ message: "Not authorized." });
        }
        const { platforms } = req.body;
        yield (0, jobQueue_service_js_1.enqueueJob)("gallery-social-post", {
            galleryItemId: item._id.toString(),
            platforms,
            trigger: "manual",
            ownerId: req.user.userId,
        });
        res.json({ success: true, message: "Share queued to social platforms." });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.shareGalleryItem = shareGalleryItem;
const deleteGalleryItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield GalleryItem_model_js_1.default.findById(req.params.id);
        if (!item)
            return res.status(404).json({ message: "Not found." });
        const ownerId = (0, charityAccess_js_1.isCharityAccountRole)(req.user.role)
            ? (0, charityAccess_js_1.resolveCharityId)(req.user)
            : req.user.userId;
        const isOwner = item.authorId.toString() === (ownerId === null || ownerId === void 0 ? void 0 : ownerId.toString());
        if (!isOwner && !(0, adminRoles_js_1.isAdminRole)(req.user.role)) {
            return res.status(403).json({ message: "Not authorized." });
        }
        yield item.deleteOne();
        res.json({ message: "Deleted." });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to delete." });
    }
});
exports.deleteGalleryItem = deleteGalleryItem;
