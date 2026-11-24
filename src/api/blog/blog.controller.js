import BlogPost from "../../models/BlogPost.model";
import User from "../../models/User.model";
import Charity from "../../models/Charity.model";
import Admin from "../../models/Admin.model";
import cloudinary from "../../config/cloudinary";
import { isAdminRole } from "../../constants/adminRoles.js";
import { resolveCharityId, isCharityAccountRole } from "../../utils/charityAccess.js";

const slugify = (text) =>
	text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "")
		.replace(/[\s_-]+/g, "-")
		.replace(/^-+|-+$/g, "");

const getAuthorProfile = async (authorId, authorRole) => {
	switch (authorRole) {
		case "USER":
			return User.findById(authorId).select("firstName lastName profileImage canBlog");
		case "CHARITY":
			return Charity.findById(authorId).select(
				"charityName profileImage canBlog firstName lastName",
			);
		case "ADMIN":
			return Admin.findById(authorId).select("firstName lastName profileImage");
		default:
			return null;
	}
};

const authorDisplayName = (profile, role) => {
	if (!profile) return "Angelpage";
	if (role === "CHARITY") return profile.charityName || profile.firstName || "Charity";
	return `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "Author";
};

export const getPublishedPosts = async (req, res) => {
	try {
		const { category, limit = 20, page = 1 } = req.query;
		const query = { status: "published" };
		if (category) query.category = category;

		const posts = await BlogPost.find(query)
			.sort({ publishedAt: -1, createdAt: -1 })
			.limit(Number(limit))
			.skip((Number(page) - 1) * Number(limit))
			.select("-content");

		const total = await BlogPost.countDocuments(query);
		res.status(200).json({ posts, total, page: Number(page) });
	} catch (error) {
		res.status(500).json({ message: "Failed to fetch blog posts." });
	}
};

export const getPostBySlug = async (req, res) => {
	try {
		const post = await BlogPost.findOne({
			slug: req.params.slug,
			status: "published",
		});
		if (!post) return res.status(404).json({ message: "Post not found." });
		res.status(200).json({ post });
	} catch (error) {
		res.status(500).json({ message: "Failed to fetch post." });
	}
};

export const getMyPosts = async (req, res) => {
	try {
		const { userId, role } = req.user;
		const query = isCharityAccountRole(role)
			? { authorId: resolveCharityId(req.user), authorRole: "CHARITY" }
			: { authorId: userId, authorRole: role };
		const posts = await BlogPost.find(query).sort({
			updatedAt: -1,
		});
		res.status(200).json({ posts });
	} catch (error) {
		res.status(500).json({ message: "Failed to fetch your posts." });
	}
};

export const getAdminPosts = async (req, res) => {
	try {
		const { status } = req.query;
		const query = status ? { status } : {};
		const posts = await BlogPost.find(query).sort({ updatedAt: -1 });
		res.status(200).json({ posts });
	} catch (error) {
		res.status(500).json({ message: "Failed to fetch posts." });
	}
};

export const createPost = async (req, res) => {
	try {
		const { userId, role } = req.user;
		const { title, excerpt, content, category, tags, status: requestedStatus } =
			req.body;

		if (!title?.trim()) {
			return res.status(400).json({ message: "Title is required." });
		}

		const charityAccountId = resolveCharityId(req.user);
		const authorId = isCharityAccountRole(role) ? charityAccountId : userId;
		const authorRoleForPost = isCharityAccountRole(role) ? "CHARITY" : role;

		const profile = await getAuthorProfile(authorId, authorRoleForPost);
		if (
			!isAdminRole(role) &&
			!isCharityAccountRole(role) &&
			!profile?.canBlog
		) {
			return res.status(403).json({
				message: "Blog posting is not enabled for your account. Contact admin.",
			});
		}

		let coverImage = "";
		if (req.file?.path) {
			const result = await cloudinary.uploader.upload(req.file.path, {
				folder: "blog_covers",
			});
			coverImage = result.secure_url;
		}

		let slug = slugify(title);
		const existing = await BlogPost.findOne({ slug });
		if (existing) slug = `${slug}-${Date.now()}`;

		let status = "draft";
		if (isAdminRole(role)) {
			status = requestedStatus === "published" ? "published" : requestedStatus || "draft";
		} else if (isCharityAccountRole(role)) {
			status = "pending_review";
		} else if (requestedStatus === "pending_review") {
			status = "pending_review";
		}

		const post = await BlogPost.create({
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
			authorAvatar: profile?.profileImage || "",
			status,
			publishedAt: status === "published" ? new Date() : undefined,
		});

		res.status(201).json({ message: "Post saved.", post });
	} catch (error) {
		console.error("createPost:", error);
		res.status(500).json({ message: "Failed to create post." });
	}
};

export const updatePost = async (req, res) => {
	try {
		const { userId, role } = req.user;
		const post = await BlogPost.findById(req.params.postId);
		if (!post) return res.status(404).json({ message: "Post not found." });

		const isOwner =
			post.authorId.toString() === userId && post.authorRole === role;
		if (!isOwner && role !== "ADMIN") {
			return res.status(403).json({ message: "Unauthorized." });
		}

		const { title, excerpt, content, category, tags, status } = req.body;
		if (title) {
			post.title = title.trim();
			if (!req.body.keepSlug) post.slug = slugify(title);
		}
		if (excerpt !== undefined) post.excerpt = excerpt;
		if (content !== undefined) post.content = content;
		if (category) post.category = category;
		if (tags) post.tags = Array.isArray(tags) ? tags : JSON.parse(tags);

		if (req.file?.path) {
			const result = await cloudinary.uploader.upload(req.file.path, {
				folder: "blog_covers",
			});
			post.coverImage = result.secure_url;
		}

		if (role === "ADMIN" && status) {
			post.status = status;
			if (status === "published" && !post.publishedAt) {
				post.publishedAt = new Date();
			}
		} else if (status === "pending_review") {
			post.status = "pending_review";
		}

		await post.save();
		res.status(200).json({ message: "Post updated.", post });
	} catch (error) {
		res.status(500).json({ message: "Failed to update post." });
	}
};

export const publishPost = async (req, res) => {
	try {
		const post = await BlogPost.findById(req.params.postId);
		if (!post) return res.status(404).json({ message: "Post not found." });

		post.status = "published";
		post.publishedAt = new Date();
		await post.save();
		res.status(200).json({ message: "Post published.", post });
	} catch (error) {
		res.status(500).json({ message: "Failed to publish post." });
	}
};

export const setCanBlog = async (req, res) => {
	try {
		const { userId } = req.params;
		const { role, canBlog } = req.body;
		if (typeof canBlog !== "boolean") {
			return res.status(400).json({ message: "canBlog boolean required." });
		}
		let profile;
		if (role === "CHARITY") {
			profile = await Charity.findByIdAndUpdate(
				userId,
				{ canBlog },
				{ new: true },
			).select("charityName email canBlog");
		} else {
			profile = await User.findByIdAndUpdate(
				userId,
				{ canBlog },
				{ new: true },
			).select("firstName lastName email canBlog");
		}
		if (!profile) return res.status(404).json({ message: "User not found." });
		res.status(200).json({ message: "Blog permission updated.", profile });
	} catch (error) {
		res.status(500).json({ message: "Failed to update blog permission." });
	}
};

export const deletePost = async (req, res) => {
	try {
		const { userId, role } = req.user;
		const post = await BlogPost.findById(req.params.postId);
		if (!post) return res.status(404).json({ message: "Post not found." });

		const isOwner =
			post.authorId.toString() === userId && post.authorRole === role;
		if (!isOwner && role !== "ADMIN") {
			return res.status(403).json({ message: "Unauthorized." });
		}

		await post.deleteOne();
		res.status(200).json({ message: "Post deleted." });
	} catch (error) {
		res.status(500).json({ message: "Failed to delete post." });
	}
};
