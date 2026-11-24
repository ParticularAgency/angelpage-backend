import GalleryItem from "../models/GalleryItem.model.js";
import SocialPostLog from "../models/SocialPostLog.model.js";
import {
	postListingToFacebook,
	postListingToInstagram,
	postListingToTikTok,
	postListingToTwitter,
} from "./socialPosting.service.js";

const PLATFORM_FN = {
	facebook: postListingToFacebook,
	instagram: postListingToInstagram,
	tiktok: postListingToTikTok,
	twitter: postListingToTwitter,
};

const buildGalleryPayload = (item) => {
	const base = process.env.FRONTEND_BASE_URL || "https://www.angelpage.co.uk";
	const shareUrl = `${base}/reels?item=${item.slug}`;
	const isVideo = ["video", "reel"].includes(item.media?.mediaType);
	return {
		title: item.title,
		price: "",
		imageUrl: item.media.thumbnailUrl || item.media.url,
		productUrl: shareUrl,
		videoUrl: isVideo ? item.media.url : "",
		caption: item.caption || item.title,
	};
};

export async function runGallerySocialPostJob({
	galleryItemId,
	platforms,
	trigger,
	ownerId,
}) {
	const item = await GalleryItem.findById(galleryItemId);
	if (!item) throw new Error("Gallery item not found");

	const payload = buildGalleryPayload(item);
	const prefs = item.socialPosting || {};
	const channels = platforms?.length
		? platforms
		: [
				prefs.facebook !== false && "facebook",
				prefs.instagram && "instagram",
				prefs.tiktok && "tiktok",
				prefs.twitter && "twitter",
			].filter(Boolean);

	const logs = [];

	for (const platform of channels) {
		const log = await SocialPostLog.create({
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
				await log.save();
				logs.push(log);
				continue;
			}

			const sharePayload =
				platform === "facebook"
					? {
							title: payload.caption,
							price: "0",
							productUrl: payload.productUrl,
						}
					: payload;

			const result = await fn(sharePayload);
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

export async function queueGallerySocialPost(item, trigger = "auto") {
	const { enqueueJob } = await import("./jobQueue.service.js");
	await enqueueJob("gallery-social-post", {
		galleryItemId: item._id.toString(),
		trigger,
		ownerId: item.authorId?.toString(),
	});
}
