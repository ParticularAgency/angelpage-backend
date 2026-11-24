import fs from "fs";
import GalleryItem from "../../models/GalleryItem.model.js";
import Product from "../../models/Product.model";
import User from "../../models/User.model";
import Charity from "../../models/Charity.model";
import Admin from "../../models/Admin.model";
import cloudinary from "../../config/cloudinary";
import { isAdminRole } from "../../constants/adminRoles.js";
import { resolveCharityId, isCharityAccountRole } from "../../utils/charityAccess.js";
import { parseSocialPostingInput } from "../../services/socialPosting.service.js";
import {
	runGallerySocialPostJob,
	queueGallerySocialPost,
} from "../../services/gallerySocial.service.js";
import { enqueueJob } from "../../services/jobQueue.service.js";

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
			return User.findById(authorId).select("firstName lastName profileImage");
		case "CHARITY":
			return Charity.findById(authorId).select(
				"charityName profileImage firstName lastName",
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
	return `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "Creator";
};

const parseKind = (kind, mimeType) => {
	if (kind === "reel" || kind === "document" || kind === "photo") return kind;
	if (mimeType?.startsWith("video/")) return "reel";
	if (mimeType === "application/pdf") return "document";
	return "photo";
};

const uploadMedia = async (file, kindHint) => {
	const isVideo =
		file.mimetype?.startsWith("video/") || kindHint === "reel";
	const folder = isVideo ? "gallery/reels" : "gallery/images";

	const options = isVideo
		? {
				folder,
				resource_type: "video",
				eager: [{ width: 640, height: 360, crop: "fill", format: "jpg" }],
			}
		: { folder };

	const result = await cloudinary.uploader.upload(file.path, options);
	const thumbnailUrl =
		isVideo && result.eager?.[0]?.secure_url
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
};

const cleanupFile = (file) => {
	if (file?.path) {
		fs.unlink(file.path, () => {});
	}
};

const parseTags = (raw) => {
	if (!raw) return [];
	if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
	if (typeof raw === "string") {
		try {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
		} catch {
			/* comma-separated fallback */
		}
		return raw
			.split(",")
			.map((tag) => tag.trim())
			.filter(Boolean);
	}
	return [];
};

export const getPublishedGallery = async (req, res) => {
	try {
		const { kind, tag, charityId, limit = 24, page = 1 } = req.query;
		const query = { status: "published" };
		if (kind) query.kind = kind;
		if (charityId) query.charityId = charityId;
		if (tag) query.tags = tag;

		const items = await GalleryItem.find(query)
			.sort({ publishedAt: -1, createdAt: -1 })
			.limit(Number(limit))
			.skip((Number(page) - 1) * Number(limit))
			.lean();

		const productIds = [
			...new Set(items.map((item) => String(item.productId || "")).filter(Boolean)),
		];
		const charityIds = [
			...new Set(items.map((item) => String(item.charityId || "")).filter(Boolean)),
		];

		const [products, charities] = await Promise.all([
			productIds.length
				? Product.find({ _id: { $in: productIds } }).select("_id slug").lean()
				: [],
			charityIds.length
				? Charity.find({ _id: { $in: charityIds } })
						.select("_id charityName profileImage")
						.lean()
				: [],
		]);

		const slugById = new Map(
			products.map((product) => [String(product._id), product.slug]),
		);
		const charityById = new Map(
			charities.map((charity) => [String(charity._id), charity]),
		);

		const enriched = items.map((item) => {
			const charity = item.charityId
				? charityById.get(String(item.charityId))
				: null;
			return {
				...item,
				productSlug: item.productId
					? slugById.get(String(item.productId)) || null
					: null,
				charityName: charity?.charityName || null,
				charityProfileImage: charity?.profileImage || null,
			};
		});

		const total = await GalleryItem.countDocuments(query);
		res.json({ items: enriched, total, page: Number(page) });
	} catch (error) {
		res.status(500).json({ message: "Failed to fetch gallery." });
	}
};

export const getGalleryBySlug = async (req, res) => {
	try {
		const item = await GalleryItem.findOne({
			slug: req.params.slug,
			status: "published",
		});
		if (!item) return res.status(404).json({ message: "Not found." });
		item.viewCount += 1;
		await item.save();
		res.json({ item });
	} catch (error) {
		res.status(500).json({ message: "Failed to fetch item." });
	}
};

export const getMyGallery = async (req, res) => {
	try {
		const { userId, role } = req.user;
		const authorId = isCharityAccountRole(role)
			? resolveCharityId(req.user)
			: userId;
		const authorRole = isCharityAccountRole(role) ? "CHARITY" : role;

		const items = await GalleryItem.find({ authorId, authorRole }).sort({
			updatedAt: -1,
		});
		res.json({ items });
	} catch (error) {
		res.status(500).json({ message: "Failed to fetch your gallery." });
	}
};

export const getAdminGallery = async (req, res) => {
	try {
		const { status } = req.query;
		const query = status ? { status } : {};
		const items = await GalleryItem.find(query).sort({ updatedAt: -1 });
		res.json({ items });
	} catch (error) {
		res.status(500).json({ message: "Failed to fetch gallery queue." });
	}
};

export const createGalleryItem = async (req, res) => {
	try {
		const { userId, role } = req.user;
		const { title, caption, kind, tags, productId, socialPosting, publishNow } =
			req.body;

		if (!title?.trim()) {
			return res.status(400).json({ message: "Title is required." });
		}
		if (!req.file?.path) {
			return res.status(400).json({ message: "Media file is required." });
		}

		const authorId = isCharityAccountRole(role)
			? resolveCharityId(req.user)
			: userId;
		const authorRole = isCharityAccountRole(role) ? "CHARITY" : role;
		const profile = await getAuthorProfile(authorId, authorRole);

		const media = await uploadMedia(req.file, kind);
		cleanupFile(req.file);

		let slug = slugify(title);
		if (await GalleryItem.findOne({ slug })) {
			slug = `${slug}-${Date.now()}`;
		}

		const parsedKind = parseKind(kind, req.file.mimetype);
		let status = "pending_review";
		if (isAdminRole(role)) {
			status =
				publishNow === "true" || publishNow === true ? "published" : "pending_review";
		}

		const item = await GalleryItem.create({
			title: title.trim(),
			slug,
			caption: caption || "",
			media,
			kind: parsedKind,
			tags: parseTags(tags),
			productId: productId || undefined,
			charityId: authorRole === "CHARITY" ? authorId : undefined,
			authorId,
			authorRole,
			authorName: authorDisplayName(profile, authorRole),
			authorAvatar: profile?.profileImage || "",
			status,
			publishedAt: status === "published" ? new Date() : undefined,
			socialPosting: {
				...parseSocialPostingInput(socialPosting),
				autoPostOnPublish: true,
				twitter: false,
			},
		});

		if (status === "published" && item.socialPosting?.autoPostOnPublish) {
			await queueGallerySocialPost(item, isAdminRole(role) ? "admin" : "auto");
		}

		res.status(201).json({ message: "Gallery item saved.", item });
	} catch (error) {
		cleanupFile(req.file);
		console.error("createGalleryItem:", error);
		res.status(500).json({ message: error.message || "Failed to create gallery item." });
	}
};

export const publishGalleryItem = async (req, res) => {
	try {
		const item = await GalleryItem.findById(req.params.id);
		if (!item) return res.status(404).json({ message: "Not found." });

		item.status = "published";
		item.publishedAt = new Date();
		await item.save();

		if (item.socialPosting?.autoPostOnPublish !== false) {
			await queueGallerySocialPost(item, "admin");
		}

		res.json({ message: "Published.", item });
	} catch (error) {
		res.status(500).json({ message: "Failed to publish." });
	}
};

export const shareGalleryItem = async (req, res) => {
	try {
		const item = await GalleryItem.findById(req.params.id);
		if (!item) return res.status(404).json({ message: "Not found." });

		const ownerId = isCharityAccountRole(req.user.role)
			? resolveCharityId(req.user)
			: req.user.userId;
		const isOwner = item.authorId.toString() === ownerId?.toString();
		if (!isOwner && !isAdminRole(req.user.role)) {
			return res.status(403).json({ message: "Not authorized." });
		}

		const { platforms } = req.body;
		await enqueueJob("gallery-social-post", {
			galleryItemId: item._id.toString(),
			platforms,
			trigger: "manual",
			ownerId: req.user.userId,
		});

		res.json({ success: true, message: "Share queued to social platforms." });
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

export const deleteGalleryItem = async (req, res) => {
	try {
		const item = await GalleryItem.findById(req.params.id);
		if (!item) return res.status(404).json({ message: "Not found." });

		const ownerId = isCharityAccountRole(req.user.role)
			? resolveCharityId(req.user)
			: req.user.userId;
		const isOwner = item.authorId.toString() === ownerId?.toString();
		if (!isOwner && !isAdminRole(req.user.role)) {
			return res.status(403).json({ message: "Not authorized." });
		}

		await item.deleteOne();
		res.json({ message: "Deleted." });
	} catch (error) {
		res.status(500).json({ message: "Failed to delete." });
	}
};

export { runGallerySocialPostJob };
