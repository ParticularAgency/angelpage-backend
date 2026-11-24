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
exports.startWorkers = startWorkers;
const jobQueue_service_js_1 = require("../services/jobQueue.service.js");
const affiliate_controller_js_1 = require("../api/affiliate/affiliate.controller.js");
const socialPosts_controller_js_1 = require("../api/social/socialPosts.controller.js");
const gallery_controller_js_1 = require("../api/gallery/gallery.controller.js");
function startWorkers() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, jobQueue_service_js_1.initJobQueue)();
        (0, jobQueue_service_js_1.registerJobHandler)("affiliate-import", affiliate_controller_js_1.runAffiliateImportJob);
        (0, jobQueue_service_js_1.registerJobHandler)("social-post", socialPosts_controller_js_1.runSocialPostJob);
        (0, jobQueue_service_js_1.registerJobHandler)("gallery-social-post", gallery_controller_js_1.runGallerySocialPostJob);
        (0, jobQueue_service_js_1.registerJobHandler)("scheduled-social-post", socialPosts_controller_js_1.runScheduledSocialPostJob);
    });
}
