import Notification from "../models/Notification.model";
import { getIO } from "../config/socket";

export const notifyCharityNewListing = async ({
	charityId,
	productId,
	productName,
	sellerName,
}) => {
	if (!charityId) return;

	const notification = new Notification({
		recipientId: charityId,
		recipientType: "CHARITY",
		notificationType: "NEW_PRODUCT_POSTED",
		message: `${sellerName || "A seller"} listed "${productName}" with your charity.`,
		metadata: { productId: productId?.toString() },
		isRead: false,
	});

	await notification.save();

	try {
		getIO()
			.to(`user:${charityId}`)
			.emit("new-notification", notification);
	} catch {
		// Socket may be unavailable during scripts/tests
	}
};
