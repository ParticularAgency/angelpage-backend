"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const messages_controller_1 = require("./messages.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = express_1.default.Router();
router.post("/conversations/start", (0, auth_middleware_1.authMiddleware)(), messages_controller_1.startConversation);
router.post("/messages/send", (0, auth_middleware_1.authMiddleware)(), messages_controller_1.sendMessage);
router.get("/conversations/:conversationId", (0, auth_middleware_1.authMiddleware)(), messages_controller_1.fetchConversation);
router.get("/messages/recipient/:userId", (0, auth_middleware_1.authMiddleware)(), messages_controller_1.fetchRecipientMessages);
router.get("/conversations/:userId", messages_controller_1.getUserConversations);
exports.default = router;
