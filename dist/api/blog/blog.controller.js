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
exports.deletePost = exports.setCanBlog = exports.publishPost = exports.updatePost = exports.createPost = exports.getAdminPosts = exports.getMyPosts = exports.getPostBySlug = exports.getPublishedPosts = void 0;
const BlogPost_model_1 = __importDefault(require("../../models/BlogPost.model"));
const User_model_1 = __importDefault(require("../../models/User.model"));
const Charity_model_1 = __importDefault(require("../../models/Charity.model"));
const Admin_model_1 = __importDefault(require("../../models/Admin.model"));
const cloudinary_1 = __importDefault(require("../../config/cloudinary"));
const adminRoles_js_1 = require("../../constants/adminRoles.js");
const charityAccess_js_1 = require("../../utils/charityAccess.js");
const slugify = (text) => text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
const getAuthorProfile = (authorId, authorRole) => __awaiter(void 0, void 0, void 0, function* () {
    switch (authorRole) {
        case "USER":
            return User_model_1.default.findById(authorId).select("firstName lastName profileImage canBlog");
        case "CHARITY":
            return Charity_model_1.default.findById(authorId).select("charityName profileImage canBlog firstName lastName");
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
    return `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "Author";
};
const getPublishedPosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { category, limit = 20, page = 1 } = req.query;
        const query = { status: "published" };
        if (category)
            query.category = category;
        const posts = yield BlogPost_model_1.default.find(query)
            .sort({ publishedAt: -1, createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))
            .select("-content");
        const total = yield BlogPost_model_1.default.countDocuments(query);
        res.status(200).json({ posts, total, page: Number(page) });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch blog posts." });
    }
});
exports.getPublishedPosts = getPublishedPosts;
const getPostBySlug = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const post = yield BlogPost_model_1.default.findOne({
            slug: req.params.slug,
            status: "published",
        });
        if (!post)
            return res.status(404).json({ message: "Post not found." });
        res.status(200).json({ post });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch post." });
    }
});
exports.getPostBySlug = getPostBySlug;
const getMyPosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, role } = req.user;
        const query = (0, charityAccess_js_1.isCharityAccountRole)(role)
            ? { authorId: (0, charityAccess_js_1.resolveCharityId)(req.user), authorRole: "CHARITY" }
            : { authorId: userId, authorRole: role };
        const posts = yield BlogPost_model_1.default.find(query).sort({
            updatedAt: -1,
        });
        res.status(200).json({ posts });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch your posts." });
    }
});
exports.getMyPosts = getMyPosts;
const getAdminPosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status } = req.query;
        const query = status ? { status } : {};
        const posts = yield BlogPost_model_1.default.find(query).sort({ updatedAt: -1 });
        res.status(200).json({ posts });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch posts." });
    }
});
exports.getAdminPosts = getAdminPosts;
const createPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { userId, role } = req.user;
        const { title, excerpt, content, category, tags, status: requestedStatus } = req.body;
        if (!(title === null || title === void 0 ? void 0 : title.trim())) {
            return res.status(400).json({ message: "Title is required." });
        }
        const charityAccountId = (0, charityAccess_js_1.resolveCharityId)(req.user);
        const authorId = (0, charityAccess_js_1.isCharityAccountRole)(role) ? charityAccountId : userId;
        const authorRoleForPost = (0, charityAccess_js_1.isCharityAccountRole)(role) ? "CHARITY" : role;
        const profile = yield getAuthorProfile(authorId, authorRoleForPost);
        if (!(0, adminRoles_js_1.isAdminRole)(role) &&
            !(0, charityAccess_js_1.isCharityAccountRole)(role) &&
            !(profile === null || profile === void 0 ? void 0 : profile.canBlog)) {
            return res.status(403).json({
                message: "Blog posting is not enabled for your account. Contact admin.",
            });
        }
        let coverImage = "";
        if ((_a = req.file) === null || _a === void 0 ? void 0 : _a.path) {
            const result = yield cloudinary_1.default.uploader.upload(req.file.path, {
                folder: "blog_covers",
            });
            coverImage = result.secure_url;
        }
        let slug = slugify(title);
        const existing = yield BlogPost_model_1.default.findOne({ slug });
        if (existing)
            slug = `${slug}-${Date.now()}`;
        let status = "draft";
        if ((0, adminRoles_js_1.isAdminRole)(role)) {
            status = requestedStatus === "published" ? "published" : requestedStatus || "draft";
        }
        else if ((0, charityAccess_js_1.isCharityAccountRole)(role)) {
            status = "pending_review";
        }
        else if (requestedStatus === "pending_review") {
            status = "pending_review";
        }
        const post = yield BlogPost_model_1.default.create({
            title: title.trim(),
            slug,
            excerpt: excerpt || "",
            content: content || "",
            coverImage,
            category: category || "stories",
            tags: tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : [],
            authorId,
            authorRole: authorRoleForPost,
            authorName: authorDisplayName(profile, authorRoleForPost),
            authorAvatar: (profile === null || profile === void 0 ? void 0 : profile.profileImage) || "",
            status,
            publishedAt: status === "published" ? new Date() : undefined,
        });
        res.status(201).json({ message: "Post saved.", post });
    }
    catch (error) {
        console.error("createPost:", error);
        res.status(500).json({ message: "Failed to create post." });
    }
});
exports.createPost = createPost;
const updatePost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { userId, role } = req.user;
        const post = yield BlogPost_model_1.default.findById(req.params.postId);
        if (!post)
            return res.status(404).json({ message: "Post not found." });
        const isOwner = post.authorId.toString() === userId && post.authorRole === role;
        if (!isOwner && role !== "ADMIN") {
            return res.status(403).json({ message: "Unauthorized." });
        }
        const { title, excerpt, content, category, tags, status } = req.body;
        if (title) {
            post.title = title.trim();
            if (!req.body.keepSlug)
                post.slug = slugify(title);
        }
        if (excerpt !== undefined)
            post.excerpt = excerpt;
        if (content !== undefined)
            post.content = content;
        if (category)
            post.category = category;
        if (tags)
            post.tags = Array.isArray(tags) ? tags : JSON.parse(tags);
        if ((_a = req.file) === null || _a === void 0 ? void 0 : _a.path) {
            const result = yield cloudinary_1.default.uploader.upload(req.file.path, {
                folder: "blog_covers",
            });
            post.coverImage = result.secure_url;
        }
        if (role === "ADMIN" && status) {
            post.status = status;
            if (status === "published" && !post.publishedAt) {
                post.publishedAt = new Date();
            }
        }
        else if (status === "pending_review") {
            post.status = "pending_review";
        }
        yield post.save();
        res.status(200).json({ message: "Post updated.", post });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update post." });
    }
});
exports.updatePost = updatePost;
const publishPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const post = yield BlogPost_model_1.default.findById(req.params.postId);
        if (!post)
            return res.status(404).json({ message: "Post not found." });
        post.status = "published";
        post.publishedAt = new Date();
        yield post.save();
        res.status(200).json({ message: "Post published.", post });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to publish post." });
    }
});
exports.publishPost = publishPost;
const setCanBlog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const { role, canBlog } = req.body;
        if (typeof canBlog !== "boolean") {
            return res.status(400).json({ message: "canBlog boolean required." });
        }
        let profile;
        if (role === "CHARITY") {
            profile = yield Charity_model_1.default.findByIdAndUpdate(userId, { canBlog }, { new: true }).select("charityName email canBlog");
        }
        else {
            profile = yield User_model_1.default.findByIdAndUpdate(userId, { canBlog }, { new: true }).select("firstName lastName email canBlog");
        }
        if (!profile)
            return res.status(404).json({ message: "User not found." });
        res.status(200).json({ message: "Blog permission updated.", profile });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update blog permission." });
    }
});
exports.setCanBlog = setCanBlog;
const deletePost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, role } = req.user;
        const post = yield BlogPost_model_1.default.findById(req.params.postId);
        if (!post)
            return res.status(404).json({ message: "Post not found." });
        const isOwner = post.authorId.toString() === userId && post.authorRole === role;
        if (!isOwner && role !== "ADMIN") {
            return res.status(403).json({ message: "Unauthorized." });
        }
        yield post.deleteOne();
        res.status(200).json({ message: "Post deleted." });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to delete post." });
    }
});
exports.deletePost = deletePost;
