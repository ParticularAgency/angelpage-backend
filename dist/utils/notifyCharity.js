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
exports.notifyCharityNewListing = void 0;
const Notification_model_1 = __importDefault(require("../models/Notification.model"));
const socket_1 = require("../config/socket");
const notifyCharityNewListing = (_a) => __awaiter(void 0, [_a], void 0, function* ({ charityId, productId, productName, sellerName, }) {
    if (!charityId)
        return;
    const notification = new Notification_model_1.default({
        recipientId: charityId,
        recipientType: "CHARITY",
        notificationType: "NEW_PRODUCT_POSTED",
        message: `${sellerName || "A seller"} listed "${productName}" with your charity.`,
        metadata: { productId: productId === null || productId === void 0 ? void 0 : productId.toString() },
        isRead: false,
    });
    yield notification.save();
    try {
        (0, socket_1.getIO)()
            .to(`user:${charityId}`)
            .emit("new-notification", notification);
    }
    catch (_b) {
        // Socket may be unavailable during scripts/tests
    }
});
exports.notifyCharityNewListing = notifyCharityNewListing;
