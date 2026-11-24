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
exports.getCharityProductsByStorefrontId = exports.getStorefrontData = void 0;
const Charity_model_1 = __importDefault(require("../../models/Charity.model"));
const Product_model_1 = __importDefault(require("../../models/Product.model"));
// Get Storefront Data by storefrontId
const getStorefrontData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { storefrontid } = req.params;
        console.log("Received storefrontid:", storefrontid);
        // Fetch charity data by storefrontId
        const charity = yield Charity_model_1.default.findOne({
            storefrontId: storefrontid,
        }).select("charityName charityNumber charityID storefrontId description profileImage charityBannerImage addresses");
        if (!charity) {
            console.log("No charity found for storefrontId:", storefrontid);
            res.status(404).json({ message: "Charity not found" });
            return;
        }
        console.log("Charity data:", charity);
        res.status(200).json({ charity });
    }
    catch (error) {
        console.error("Error fetching storefront data:", error);
        res.status(500).json({
            message: "Failed to fetch storefront data",
            error: error instanceof Error ? error.message : "Unknown error occurred",
        });
    }
});
exports.getStorefrontData = getStorefrontData;
// Fetch listed products for a charity by storefrontId
const getCharityProductsByStorefrontId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { storefrontid } = req.params;
        console.log("Received storefrontid:", storefrontid);
        // Fetch charity data by storefrontId
        const charity = yield Charity_model_1.default.findOne({
            storefrontId: storefrontid,
        }).select("charityName listedProducts");
        if (!charity) {
            console.log("No charity found for storefrontId:", storefrontid);
            res.status(404).json({ message: "Charity not found" });
            return;
        }
        // Fetch listed products and populate necessary fields
        const listedProducts = yield Product_model_1.default.find({
            _id: { $in: charity.listedProducts },
            isArchived: false, // Only fetch active products
        })
            .select("name price images category subcategory condition brand material color size status")
            .populate("seller", "firstName lastName profileImage addresses")
            .populate("charity", "charityName charityID profileImage addresses")
            .sort({ createdAt: -1 });
        // Transform products to include the necessary address details
        const productsWithAddress = listedProducts.map((product) => {
            var _a, _b, _c, _d;
            return (Object.assign(Object.assign({}, product.toObject()), { charity: product.charity
                    ? {
                        charityName: (_a = product.charity) === null || _a === void 0 ? void 0 : _a.charityName,
                        profileImage: (_b = product.charity) === null || _b === void 0 ? void 0 : _b.profileImage,
                        address: ((_d = (_c = product.charity) === null || _c === void 0 ? void 0 : _c.addresses) === null || _d === void 0 ? void 0 : _d[0]) || null, // Include default address
                    }
                    : null }));
        });
        const productCount = listedProducts.length;
        return res.status(200).json({
            charity: {
                charityName: charity.charityName,
                listedProducts: productsWithAddress,
                productCount,
            },
        });
    }
    catch (error) {
        console.error("Error fetching charity products:", error);
        res.status(500).json({
            message: "Failed to fetch charity products",
            error: error instanceof Error ? error.message : "Unknown error occurred",
        });
    }
});
exports.getCharityProductsByStorefrontId = getCharityProductsByStorefrontId;
