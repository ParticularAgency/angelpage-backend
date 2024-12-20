
import Charity from "../../models/Charity.model"; 
import Product from "../../models/Product.model";


// Get Storefront Data by storefrontId
export const getStorefrontData = async (
	req,
	res,
) => {
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

// Fetch listed products for a charity by storefrontId
export const getCharityProductsByStorefrontId = async (
  req,
  res,
) => {
  try {
    const { storefrontid } = req.params;

    console.log("Received storefrontid:", storefrontid);

    // Fetch charity data by storefrontId
    const charity = await Charity.findOne({
      storefrontId: storefrontid,
    }).select("charityName listedProducts");

    if (!charity) {
      console.log("No charity found for storefrontId:", storefrontid);
      res.status(404).json({ message: "Charity not found" });
      return;
    }

    // Fetch listed products and populate necessary fields
    const listedProducts = await Product.find({
      _id: { $in: charity.listedProducts },
      isArchived: false, // Only fetch active products
    })
      .select(
        "name price images category subcategory condition brand material color size status"
      )
      .populate("seller", "firstName lastName profileImage addresses")
      .populate("charity", "charityName charityID profileImage addresses")
      .sort({ createdAt: -1 }); 

    // Transform products to include the necessary address details
    const productsWithAddress = listedProducts.map((product) => ({
      ...product.toObject(),
      charity: product.charity
        ? {
            charityName: product.charity?.charityName,
            profileImage: product.charity?.profileImage,
            address: product.charity?.addresses?.[0] || null, // Include default address
          }
        : null,
    }));
    const productCount = listedProducts.length;
    return res.status(200).json({
			charity: {
				charityName: charity.charityName,
				listedProducts: productsWithAddress,
				productCount,
			},
		});
  } catch (error) {
    console.error("Error fetching charity products:", error);
    res.status(500).json({
      message: "Failed to fetch charity products",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
};