import SocialPostLog from "../../models/SocialPostLog.model.js";
import ScheduledPost from "../../models/ScheduledPost.model.js";
import Product from "../../models/Product.model";
import {
	postListingToFacebook,
	postListingToInstagram,
	postListingToTikTok,
	postListingToTwitter,
} from "../../services/socialPosting.service.js";
import { enqueueJob } from "../../services/jobQueue.service.js";
import { isAdminRole } from "../../constants/adminRoles.js";

const PLATFORM_FN = {
	facebook: postListingToFacebook,
	instagram: postListingToInstagram,
	tiktok: postListingToTikTok,
	twitter: postListingToTwitter,
};

export async function runSocialPostJob({ productId, platforms, trigger, ownerId }) {
	const product = await Product.findById(productId);
	if (!product) throw new Error("Product not found");

	if (
		product.checkoutMode === "affiliate_redirect" ||
		product.checkoutMode === "ebay_redirect"
	) {
		return { skipped: true, reason: "Affiliate listings are not auto-posted" };
	}

	const base = process.env.FRONTEND_BASE_URL || "https://www.angelpage.co.uk";
	const payload = {
		title: product.name,
		price: product.price,
		imageUrl: product.images?.[0]?.url,
		productUrl: `${base}/product/${product._id}`,
		videoUrl:
			product.socialPosting?.tiktokVideoUrl || product.videos?.[0]?.url || "",
	};

	const prefs = product.socialPosting || {};
	const channels = platforms?.length
		? platforms
		: [
				prefs.facebook !== false && "facebook",
				prefs.instagram && "instagram",
				prefs.tiktok && "tiktok",
			].filter(Boolean);

	const logs = [];

	for (const platform of channels) {
		const log = await SocialPostLog.create({
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
				await log.save();
				logs.push(log);
				continue;
			}

			const result = await fn(payload);
			log.status = result.skipped
				? "skipped"
				: result.success
					? "success"
					: "failed";
			log.response = result;
			log.error = result.reason || result.error || "";
			await log.save();
			logs.push(log);
		} catch (error) {
			log.status = "failed";
			log.error = error.message;
			await log.save();
			logs.push(log);
		}
	}

	return logs;
}

export const getSocialPostLogs = async (req, res) => {
	try {
		const { userId, role } = req.user;
		const filter = isAdminRole(role) ? {} : { ownerId: userId };
		if (req.query.productId) filter.productId = req.query.productId;

		const logs = await SocialPostLog.find(filter)
			.sort({ createdAt: -1 })
			.limit(100)
			.populate("productId", "name images");

		res.json({ success: true, logs });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

export const triggerSocialPost = async (req, res) => {
	try {
		const { productId, platforms } = req.body;
		if (!productId) return res.status(400).json({ error: "productId required" });

		const product = await Product.findById(productId);
		if (!product) return res.status(404).json({ error: "Product not found" });

		const isOwner = product.seller?.toString() === req.user.userId;
		if (!isOwner && !isAdminRole(req.user.role)) {
			return res.status(403).json({ error: "Not authorized" });
		}

		await enqueueJob("social-post", {
			productId,
			platforms,
			trigger: isAdminRole(req.user.role) ? "admin" : "manual",
			ownerId: req.user.userId,
		});

		res.json({ success: true, message: "Post queued." });
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

export const scheduleSocialPost = async (req, res) => {
	try {
		const { productId, platforms, scheduledFor, caption } = req.body;
		if (!productId || !scheduledFor) {
			return res.status(400).json({ error: "productId and scheduledFor required" });
		}

		const when = new Date(scheduledFor);
		if (Number.isNaN(when.getTime()) || when < new Date()) {
			return res.status(400).json({ error: "scheduledFor must be a future date" });
		}

		const scheduled = await ScheduledPost.create({
			productId,
			ownerId: req.user.userId,
			platforms: platforms || ["facebook", "instagram"],
			scheduledFor: when,
			caption: caption || "",
		});

		const delay = when.getTime() - Date.now();
		const job = await enqueueJob(
			"scheduled-social-post",
			{ scheduledPostId: scheduled._id.toString() },
			{ delay },
		);

		if (job?.id) {
			scheduled.jobId = String(job.id);
			await scheduled.save();
		}

		res.status(201).json({ success: true, scheduled });
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

export const listScheduledPosts = async (req, res) => {
	try {
		const filter = isAdminRole(req.user.role) ? {} : { ownerId: req.user.userId };
		const posts = await ScheduledPost.find(filter)
			.sort({ scheduledFor: 1 })
			.limit(50)
			.populate("productId", "name");

		res.json({ success: true, posts });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

export const cancelScheduledPost = async (req, res) => {
	try {
		const filter = {
			_id: req.params.id,
			status: "scheduled",
		};
		if (!isAdminRole(req.user.role)) {
			filter.ownerId = req.user.userId;
		}

		const post = await ScheduledPost.findOneAndUpdate(
			filter,
			{ status: "cancelled" },
			{ new: true },
		);

		if (!post) return res.status(404).json({ error: "Scheduled post not found" });
		res.json({ success: true, post });
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

export async function runScheduledSocialPostJob({ scheduledPostId }) {
	const scheduled = await ScheduledPost.findById(scheduledPostId);
	if (!scheduled || scheduled.status !== "scheduled") return;

	scheduled.status = "processing";
	await scheduled.save();

	try {
		await runSocialPostJob({
			productId: scheduled.productId.toString(),
			platforms: scheduled.platforms,
			trigger: "scheduled",
			ownerId: scheduled.ownerId,
		});
		scheduled.status = "completed";
		await scheduled.save();
	} catch (error) {
		scheduled.status = "failed";
		scheduled.error = error.message;
		await scheduled.save();
		throw error;
	}
}

export async function queueAutoPostNewListing(product) {
	await enqueueJob("social-post", {
		productId: product._id.toString(),
		trigger: "auto",
		ownerId: product.seller?.toString(),
	});
}
