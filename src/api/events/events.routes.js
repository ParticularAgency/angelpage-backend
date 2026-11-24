import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
	getPublishedEvents,
	getEventBySlug,
	getAdminEvents,
	getMyEvents,
	createEvent,
	publishEvent,
	updateEvent,
	voteEventPoll,
	createEventDonation,
	confirmEventDonation,
	getEventDonationReceipt,
	confirmEventDonationFromQuery,
} from "./events.controller";

const router = Router();
const upload = multer({ dest: "uploads/" });

router.get("/", getPublishedEvents);
router.get("/mine", authMiddleware(["ADMIN", "CHARITY", "CHARITY_STAFF"]), getMyEvents);
router.get("/admin/all", authMiddleware(["ADMIN"]), getAdminEvents);
router.get("/slug/:slug", getEventBySlug);
router.post("/:eventId/poll/vote", voteEventPoll);
router.post("/:eventId/donations", createEventDonation);
router.post("/donations/:donationId/confirm", confirmEventDonation);
router.get("/donations/:donationId/confirm", confirmEventDonationFromQuery);
router.get("/donations/:donationId/receipt", getEventDonationReceipt);
router.post(
	"/",
	authMiddleware(["ADMIN", "CHARITY", "CHARITY_STAFF"]),
	upload.single("coverImage"),
	createEvent,
);
router.patch("/:eventId/publish", authMiddleware(["ADMIN"]), publishEvent);
router.patch(
	"/:eventId",
	authMiddleware(["ADMIN", "CHARITY", "CHARITY_STAFF"]),
	upload.single("coverImage"),
	updateEvent,
);

export default router;
