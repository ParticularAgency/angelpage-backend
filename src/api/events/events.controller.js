import { isAdminRole } from "../../constants/adminRoles.js";
import { resolveCharityId, isCharityAccountRole } from "../../utils/charityAccess.js";
import CommunityEvent from "../../models/CommunityEvent.model";
import Charity from "../../models/Charity.model";
import Admin from "../../models/Admin.model";
import cloudinary from "../../config/cloudinary";
import {
	createEventDonationCheckout,
	confirmEventDonationPayment,
	buildDonationReceipt,
	resolveEventFunds,
} from "../../services/eventDonation.service.js";
import EventDonation from "../../models/EventDonation.model";

const slugify = (text) =>
	text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "")
		.replace(/[\s_-]+/g, "-")
		.replace(/^-+|-+$/g, "");

const parsePollOptions = (raw) => {
	if (!raw) return [];
	if (Array.isArray(raw)) return raw.map((t) => ({ text: String(t), votes: 0 }));
	try {
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed)) {
			return parsed.map((o) =>
				typeof o === "string" ? { text: o, votes: 0 } : { text: o.text, votes: o.votes || 0 },
			);
		}
	} catch {
		/* ignore */
	}
	return [];
};

const parseFundAllocations = (raw) => {
	if (!raw) return [];
	if (Array.isArray(raw)) return raw;
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

const authorNameFor = async (userId, role) => {
	if (role === "CHARITY") {
		const c = await Charity.findById(userId).select("charityName");
		return c?.charityName || "Charity";
	}
	if (isAdminRole(role)) {
		const a = await Admin.findById(userId).select("firstName lastName");
		return `${a?.firstName || ""} ${a?.lastName || ""}`.trim() || "Angelpage";
	}
	return "Angelpage";
};

export const getPublishedEvents = async (req, res) => {
	try {
		const { featured, eventType, limit = 12 } = req.query;
		const query = { status: "published" };
		if (featured === "true") query.featuredOnHomepage = true;
		if (eventType) query.eventType = eventType;

		const events = await CommunityEvent.find(query)
			.sort({ featuredOnHomepage: -1, startAt: -1, createdAt: -1 })
			.limit(Number(limit))
			.select("-pollOptions.votes");

		res.status(200).json({ events });
	} catch (error) {
		res.status(500).json({ message: "Failed to fetch events." });
	}
};

export const getEventBySlug = async (req, res) => {
	try {
		const event = await CommunityEvent.findOne({
			slug: req.params.slug,
			status: "published",
		});
		if (!event) return res.status(404).json({ message: "Event not found." });
		res.status(200).json({ event });
	} catch (error) {
		res.status(500).json({ message: "Failed to fetch event." });
	}
};

export const getAdminEvents = async (req, res) => {
	try {
		const { status } = req.query;
		const query = status ? { status } : {};
		const events = await CommunityEvent.find(query).sort({ updatedAt: -1 });
		res.status(200).json({ events });
	} catch (error) {
		res.status(500).json({ message: "Failed to fetch events." });
	}
};

export const getMyEvents = async (req, res) => {
	try {
		const { userId, role } = req.user;
		const charityAccountId = resolveCharityId(req.user);
		const query = isCharityAccountRole(role)
			? { authorId: charityAccountId, authorRole: "CHARITY" }
			: { authorId: userId, authorRole: role };
		const events = await CommunityEvent.find(query).sort({ updatedAt: -1 });
		res.status(200).json({ events });
	} catch (error) {
		res.status(500).json({ message: "Failed to fetch your events." });
	}
};

export const createEvent = async (req, res) => {
	try {
		const { userId, role } = req.user;
		const charityAccountId = resolveCharityId(req.user);
		if (!isAdminRole(role) && !isCharityAccountRole(role)) {
			return res.status(403).json({ message: "Unauthorized." });
		}

		const {
			title,
			excerpt,
			description,
			eventType,
			category,
			startAt,
			endAt,
			donationGoal,
			donationUrl,
			liveStreamUrl,
			pollQuestion,
			pollOptions,
			featuredOnHomepage,
		} = req.body;

		if (!title?.trim()) {
			return res.status(400).json({ message: "Title is required." });
		}

		let coverImage = "";
		if (req.file?.path) {
			const result = await cloudinary.uploader.upload(req.file.path, {
				folder: "community_events",
			});
			coverImage = result.secure_url;
		}

		let slug = slugify(title);
		if (await CommunityEvent.findOne({ slug })) {
			slug = `${slug}-${Date.now()}`;
		}

		const status =
			isAdminRole(role) && req.body.status === "published"
				? "published"
				: "pending_review";

		const event = await CommunityEvent.create({
			title: title.trim(),
			slug,
			excerpt: excerpt || "",
			description: description || "",
			eventType: eventType || "general",
			category: category || "community",
			coverImage,
			startAt: startAt ? new Date(startAt) : undefined,
			endAt: endAt ? new Date(endAt) : undefined,
			donationGoal: Number(donationGoal) || 0,
			donationUrl: donationUrl || "",
			liveStreamUrl: liveStreamUrl || "",
			charityId: isCharityAccountRole(role) ? charityAccountId : req.body.charityId || undefined,
			fundAllocations: parseFundAllocations(req.body.fundAllocations),
			pollQuestion: pollQuestion || "",
			pollOptions: parsePollOptions(pollOptions),
			featuredOnHomepage: featuredOnHomepage === "true" || featuredOnHomepage === true,
			status,
			authorId: isCharityAccountRole(role) ? charityAccountId : userId,
			authorRole: isCharityAccountRole(role) ? "CHARITY" : role,
			authorName: await authorNameFor(
				isCharityAccountRole(role) ? charityAccountId : userId,
				isCharityAccountRole(role) ? "CHARITY" : role,
			),
		});

		res.status(201).json({ message: "Event created.", event });
	} catch (error) {
		console.error("createEvent:", error);
		res.status(500).json({ message: "Failed to create event." });
	}
};

export const publishEvent = async (req, res) => {
	try {
		const event = await CommunityEvent.findById(req.params.eventId);
		if (!event) return res.status(404).json({ message: "Event not found." });
		event.status = "published";
		await event.save();
		res.status(200).json({ message: "Event published.", event });
	} catch (error) {
		res.status(500).json({ message: "Failed to publish event." });
	}
};

export const updateEvent = async (req, res) => {
	try {
		const event = await CommunityEvent.findById(req.params.eventId);
		if (!event) return res.status(404).json({ message: "Event not found." });

		const fields = [
			"title",
			"excerpt",
			"description",
			"eventType",
			"category",
			"donationUrl",
			"liveStreamUrl",
			"pollQuestion",
			"featuredOnHomepage",
			"donationGoal",
			"donationRaised",
			"charityId",
			"fundAllocations",
		];
		fields.forEach((f) => {
			if (req.body[f] !== undefined) event[f] = req.body[f];
		});
		if (req.body.startAt) event.startAt = new Date(req.body.startAt);
		if (req.body.endAt) event.endAt = new Date(req.body.endAt);
		if (req.body.pollOptions) event.pollOptions = parsePollOptions(req.body.pollOptions);
		if (req.body.fundAllocations !== undefined) {
			event.fundAllocations = parseFundAllocations(req.body.fundAllocations);
		}
		if (req.body.status && isAdminRole(req.user.role)) event.status = req.body.status;

		if (req.file?.path) {
			const result = await cloudinary.uploader.upload(req.file.path, {
				folder: "community_events",
			});
			event.coverImage = result.secure_url;
		}

		await event.save();
		res.status(200).json({ message: "Event updated.", event });
	} catch (error) {
		res.status(500).json({ message: "Failed to update event." });
	}
};

export const voteEventPoll = async (req, res) => {
	try {
		const { optionIndex } = req.body;
		const idx = Number(optionIndex);
		if (Number.isNaN(idx) || idx < 0) {
			return res.status(400).json({ message: "Invalid option." });
		}

		const event = await CommunityEvent.findOne({
			_id: req.params.eventId,
			status: "published",
		});
		if (!event) return res.status(404).json({ message: "Event not found." });
		if (!event.pollOptions?.[idx]) {
			return res.status(400).json({ message: "Poll option not found." });
		}

		event.pollOptions[idx].votes = (event.pollOptions[idx].votes || 0) + 1;
		await event.save();

		res.status(200).json({
			message: "Vote recorded.",
			pollOptions: event.pollOptions,
		});
	} catch (error) {
		res.status(500).json({ message: "Failed to record vote." });
	}
};

export const createEventDonation = async (req, res) => {
	try {
		const { eventId } = req.params;
		const { amount, fundId, donorName, donorEmail, isAnonymous } = req.body;

		const { donation, event, clientSecret } = await createEventDonationCheckout({
			eventId,
			amount,
			fundId,
			donorName,
			donorEmail,
			isAnonymous,
			donorUserId: req.user?.userId,
		});

		res.status(201).json({
			donationId: donation._id,
			donationNumber: donation.donationNumber,
			clientSecret,
			charityName: donation.charityName,
			funds: resolveEventFunds(event),
			event: {
				_id: event._id,
				title: event.title,
				slug: event.slug,
				donationGoal: event.donationGoal,
				donationRaised: event.donationRaised,
			},
		});
	} catch (error) {
		res.status(400).json({ message: error.message || "Could not start donation." });
	}
};

export const confirmEventDonation = async (req, res) => {
	try {
		const { donationId } = req.params;
		const { paymentIntentId } = req.body;

		const result = await confirmEventDonationPayment(donationId, paymentIntentId);

		res.status(200).json({
			message: "Donation confirmed.",
			receipt: result.receipt,
			event: {
				_id: result.event?._id,
				donationRaised: result.event?.donationRaised,
				donationGoal: result.event?.donationGoal,
			},
		});
	} catch (error) {
		res.status(400).json({ message: error.message || "Could not confirm donation." });
	}
};

export const getEventDonationReceipt = async (req, res) => {
	try {
		const donation = await EventDonation.findById(req.params.donationId);
		if (!donation) {
			return res.status(404).json({ message: "Donation not found." });
		}

		const event = await CommunityEvent.findById(donation.eventId);
		res.status(200).json({
			receipt: buildDonationReceipt(donation, event),
			event: event
				? {
						slug: event.slug,
						title: event.title,
						donationRaised: event.donationRaised,
						donationGoal: event.donationGoal,
					}
				: null,
		});
	} catch (error) {
		res.status(500).json({ message: "Failed to fetch receipt." });
	}
};

export const confirmEventDonationFromQuery = async (req, res) => {
	try {
		const { donationId } = req.params;
		const paymentIntentId =
			req.body?.paymentIntentId ||
			req.query?.payment_intent ||
			req.query?.paymentIntentId;

		const result = await confirmEventDonationPayment(donationId, paymentIntentId);

		res.status(200).json({
			message: "Donation confirmed.",
			receipt: result.receipt,
			event: {
				slug: result.event?.slug,
				title: result.event?.title,
				donationRaised: result.event?.donationRaised,
				donationGoal: result.event?.donationGoal,
			},
		});
	} catch (error) {
		res.status(400).json({ message: error.message || "Could not confirm donation." });
	}
};
