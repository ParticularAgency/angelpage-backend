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
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchByImageHandler = exports.smartSearchHandler = exports.suggestEventHandler = exports.enhanceBlogHandler = exports.enhanceListingHandler = exports.analyzeImage = exports.aiStatus = void 0;
const gemini_service_js_1 = require("../../services/gemini.service.js");
const aiStatus = (req, res) => {
    res.json({ enabled: (0, gemini_service_js_1.isGeminiConfigured)(), model: process.env.GEMINI_MODEL || "gemini-2.0-flash" });
};
exports.aiStatus = aiStatus;
const analyzeImage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        if (!((_a = req.file) === null || _a === void 0 ? void 0 : _a.buffer)) {
            return res.status(400).json({ error: "Image file is required." });
        }
        const result = yield (0, gemini_service_js_1.analyzeProductImage)(req.file.buffer, req.file.mimetype);
        res.json(Object.assign({ success: true }, result));
    }
    catch (err) {
        console.error("analyzeImage:", err.message);
        res.status(500).json({ error: err.message || "Image analysis failed." });
    }
});
exports.analyzeImage = analyzeImage;
const enhanceListingHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, gemini_service_js_1.enhanceListing)(req.body || {});
        res.json(Object.assign({ success: true }, result));
    }
    catch (err) {
        console.error("enhanceListing:", err.message);
        res.status(500).json({ error: err.message || "Listing enhancement failed." });
    }
});
exports.enhanceListingHandler = enhanceListingHandler;
const enhanceBlogHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, gemini_service_js_1.enhanceBlogSeo)(req.body || {});
        res.json(Object.assign({ success: true }, result));
    }
    catch (err) {
        console.error("enhanceBlog:", err.message);
        res.status(500).json({ error: err.message || "Blog SEO generation failed." });
    }
});
exports.enhanceBlogHandler = enhanceBlogHandler;
const suggestEventHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, gemini_service_js_1.suggestEvent)(req.body || {});
        res.json(Object.assign({ success: true }, result));
    }
    catch (err) {
        console.error("suggestEvent:", err.message);
        res.status(500).json({ error: err.message || "Event suggestion failed." });
    }
});
exports.suggestEventHandler = suggestEventHandler;
const smartSearchHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { query } = req.body || {};
        if (!query || typeof query !== "string" || query.trim().length < 2) {
            return res.status(400).json({ error: "Query must be at least 2 characters." });
        }
        const result = yield (0, gemini_service_js_1.smartProductSearch)(query.trim());
        res.json(Object.assign({ success: true }, result));
    }
    catch (err) {
        console.error("smartSearch:", err.message);
        res.status(500).json({ error: err.message || "Smart search failed." });
    }
});
exports.smartSearchHandler = smartSearchHandler;
const searchByImageHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        if (!((_a = req.file) === null || _a === void 0 ? void 0 : _a.buffer)) {
            return res.status(400).json({ error: "Image file is required." });
        }
        const result = yield (0, gemini_service_js_1.searchProductsByImage)(req.file.buffer, req.file.mimetype);
        res.json(Object.assign({ success: true }, result));
    }
    catch (err) {
        console.error("searchByImage:", err.message);
        res.status(500).json({ error: err.message || "Image search failed." });
    }
});
exports.searchByImageHandler = searchByImageHandler;
