import { Request, Response } from "express";
import Charity from "../../models/Charity.model"; // Adjust the path based on your project structure

// Custom Type for the Request with Parameters
interface GetStorefrontRequest extends Request {
	params: {
		storefrontid: string;
	};
}

// Get Storefront Data by storefrontId
export const getStorefrontData = async (
	req: GetStorefrontRequest,
	res: Response,
): Promise<void> => {
	try {
		const { storefrontid } = req.params;

		console.log("Received storefrontid:", storefrontid);

		// Fetch charity data by storefrontId
		const charity = await Charity.findOne({
			storefrontId: storefrontid,
		}).select(
			"charityName charityNumber charityID storefrontId description profileImage charityBannerImage addresses",
		);

		if (!charity) {
			console.log("No charity found for storefrontId:", storefrontid);
			res.status(404).json({ message: "Charity not found" });
			return;
		}

		console.log("Charity data:", charity);
		res.status(200).json({ charity });
	} catch (error) {
		console.error("Error fetching storefront data:", error);
		res.status(500).json({
			message: "Failed to fetch storefront data",
			error: error instanceof Error ? error.message : "Unknown error occurred",
		});
	}
};
