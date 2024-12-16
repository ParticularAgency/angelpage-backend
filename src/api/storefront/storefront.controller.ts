import { Request, Response } from "express";
import Charity from "../../models/Charity.model"; // Adjust the path according to your structure
// import Product from "../../models/Product.model"; // Import the Product model

// Get Storefront Data by storefrontId
export const getStorefrontData = async (req: Request, res: Response) => {
	try {
		const { storefrontid } = req.params;

		console.log("Received storefrontid:", storefrontid);

		const charity = await Charity.findOne({ storefrontId: storefrontid })
			.select(
				"charityName charityNumber charityID  storefrontId description profileImage charityBannerImage addresses",
			)

		if (!charity) {
			console.log("No charity found for storefrontId:", storefrontid);
			return res.status(404).json({ message: "Charity not found" });
		}

		console.log("Charity data:", charity);
		res.status(200).json({ charity });
	} catch (error) {
		console.error("Error fetching storefront data:", error);
		res.status(500).json({ message: "Failed to fetch storefront data" });
	}
};