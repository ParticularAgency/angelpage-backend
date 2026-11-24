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
exports.voteEventPoll = exports.updateEvent = exports.publishEvent = exports.createEvent = exports.getMyEvents = exports.getAdminEvents = exports.getEventBySlug = exports.getPublishedEvents = void 0;
const adminRoles_js_1 = require("../../constants/adminRoles.js");
const charityAccess_js_1 = require("../../utils/charityAccess.js");
const CommunityEvent_model_1 = __importDefault(require("../../models/CommunityEvent.model"));
const Charity_model_1 = __importDefault(require("../../models/Charity.model"));
const Admin_model_1 = __importDefault(require("../../models/Admin.model"));
const cloudinary_1 = __importDefault(require("../../config/cloudinary"));
const slugify = (text) => text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
const parsePollOptions = (raw) => {
    if (!raw)
        return [];
    if (Array.isArray(raw))
        return raw.map((t) => ({ text: String(t), votes: 0 }));
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed.map((o) => typeof o === "string" ? { text: o, votes: 0 } : { text: o.text, votes: o.votes || 0 });
        }
    }
    catch (_a) {
        /* ignore */
    }
    return [];
};
const authorNameFor = (userId, role) => __awaiter(void 0, void 0, void 0, function* () {
    if (role === "CHARITY") {
        const c = yield Charity_model_1.default.findById(userId).select("charityName");
        return (c === null || c === void 0 ? void 0 : c.charityName) || "Charity";
    }
    if ((0, adminRoles_js_1.isAdminRole)(role)) {
        const a = yield Admin_model_1.default.findById(userId).select("firstName lastName");
        return `${(a === null || a === void 0 ? void 0 : a.firstName) || ""} ${(a === null || a === void 0 ? void 0 : a.lastName) || ""}`.trim() || "Angelpage";
    }
    return "Angelpage";
});
const getPublishedEvents = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { featured, eventType, limit = 12 } = req.query;
        const query = { status: "published" };
        if (featured === "true")
            query.featuredOnHomepage = true;
        if (eventType)
            query.eventType = eventType;
        const events = yield CommunityEvent_model_1.default.find(query)
            .sort({ featuredOnHomepage: -1, startAt: -1, createdAt: -1 })
            .limit(Number(limit))
            .select("-pollOptions.votes");
        res.status(200).json({ events });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch events." });
    }
});
exports.getPublishedEvents = getPublishedEvents;
const getEventBySlug = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const event = yield CommunityEvent_model_1.default.findOne({
            slug: req.params.slug,
            status: "published",
        });
        if (!event)
            return res.status(404).json({ message: "Event not found." });
        res.status(200).json({ event });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch event." });
    }
});
exports.getEventBySlug = getEventBySlug;
const getAdminEvents = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status } = req.query;
        const query = status ? { status } : {};
        const events = yield CommunityEvent_model_1.default.find(query).sort({ updatedAt: -1 });
        res.status(200).json({ events });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch events." });
    }
});
exports.getAdminEvents = getAdminEvents;
const getMyEvents = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, role } = req.user;
        const charityAccountId = (0, charityAccess_js_1.resolveCharityId)(req.user);
        const query = (0, charityAccess_js_1.isCharityAccountRole)(role)
            ? { authorId: charityAccountId, authorRole: "CHARITY" }
            : { authorId: userId, authorRole: role };
        const events = yield CommunityEvent_model_1.default.find(query).sort({ updatedAt: -1 });
        res.status(200).json({ events });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch your events." });
    }
});
exports.getMyEvents = getMyEvents;
const createEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { userId, role } = req.user;
        const charityAccountId = (0, charityAccess_js_1.resolveCharityId)(req.user);
        if (!(0, adminRoles_js_1.isAdminRole)(role) && !(0, charityAccess_js_1.isCharityAccountRole)(role)) {
            return res.status(403).json({ message: "Unauthorized." });
        }
        const { title, excerpt, description, eventType, category, startAt, endAt, donationGoal, donationUrl, liveStreamUrl, pollQuestion, pollOptions, featuredOnHomepage, } = req.body;
        if (!(title === null || title === void 0 ? void 0 : title.trim())) {
            return res.status(400).json({ message: "Title is required." });
        }
        let coverImage = "";
        if ((_a = req.file) === null || _a === void 0 ? void 0 : _a.path) {
            const result = yield cloudinary_1.default.uploader.upload(req.file.path, {
                folder: "community_events",
            });
            coverImage = result.secure_url;
        }
        let slug = slugify(title);
        if (yield CommunityEvent_model_1.default.findOne({ slug })) {
            slug = `${slug}-${Date.now()}`;
        }
        const status = (0, adminRoles_js_1.isAdminRole)(role) && req.body.status === "published"
            ? "published"
            : "pending_review";
        const event = yield CommunityEvent_model_1.default.create({
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
            pollQuestion: pollQuestion || "",
            pollOptions: parsePollOptions(pollOptions),
            featuredOnHomepage: featuredOnHomepage === "true" || featuredOnHomepage === true,
            status,
            authorId: (0, charityAccess_js_1.isCharityAccountRole)(role) ? charityAccountId : userId,
            authorRole: (0, charityAccess_js_1.isCharityAccountRole)(role) ? "CHARITY" : role,
            authorName: yield authorNameFor((0, charityAccess_js_1.isCharityAccountRole)(role) ? charityAccountId : userId, (0, charityAccess_js_1.isCharityAccountRole)(role) ? "CHARITY" : role),
        });
        res.status(201).json({ message: "Event created.", event });
    }
    catch (error) {
        console.error("createEvent:", error);
        res.status(500).json({ message: "Failed to create event." });
    }
});
exports.createEvent = createEvent;
const publishEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const event = yield CommunityEvent_model_1.default.findById(req.params.eventId);
        if (!event)
            return res.status(404).json({ message: "Event not found." });
        event.status = "published";
        yield event.save();
        res.status(200).json({ message: "Event published.", event });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to publish event." });
    }
});
exports.publishEvent = publishEvent;
const updateEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const event = yield CommunityEvent_model_1.default.findById(req.params.eventId);
        if (!event)
            return res.status(404).json({ message: "Event not found." });
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
        ];
        fields.forEach((f) => {
            if (req.body[f] !== undefined)
                event[f] = req.body[f];
        });
        if (req.body.startAt)
            event.startAt = new Date(req.body.startAt);
        if (req.body.endAt)
            event.endAt = new Date(req.body.endAt);
        if (req.body.pollOptions)
            event.pollOptions = parsePollOptions(req.body.pollOptions);
        if (req.body.status && (0, adminRoles_js_1.isAdminRole)(req.user.role))
            event.status = req.body.status;
        if ((_a = req.file) === null || _a === void 0 ? void 0 : _a.path) {
            const result = yield cloudinary_1.default.uploader.upload(req.file.path, {
                folder: "community_events",
            });
            event.coverImage = result.secure_url;
        }
        yield event.save();
        res.status(200).json({ message: "Event updated.", event });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update event." });
    }
});
exports.updateEvent = updateEvent;
const voteEventPoll = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { optionIndex } = req.body;
        const idx = Number(optionIndex);
        if (Number.isNaN(idx) || idx < 0) {
            return res.status(400).json({ message: "Invalid option." });
        }
        const event = yield CommunityEvent_model_1.default.findOne({
            _id: req.params.eventId,
            status: "published",
        });
        if (!event)
            return res.status(404).json({ message: "Event not found." });
        if (!((_a = event.pollOptions) === null || _a === void 0 ? void 0 : _a[idx])) {
            return res.status(400).json({ message: "Poll option not found." });
        }
        event.pollOptions[idx].votes = (event.pollOptions[idx].votes || 0) + 1;
        yield event.save();
        res.status(200).json({
            message: "Vote recorded.",
            pollOptions: event.pollOptions,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to record vote." });
    }
});
exports.voteEventPoll = voteEventPoll;
