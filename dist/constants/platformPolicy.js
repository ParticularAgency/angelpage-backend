"use strict";
/** Platform policy constants — align with PRD / stakeholder decisions */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLATFORM_FEE_RATE = exports.CHARITY_SHARE_RATE = exports.CHARITY_SHARE_PERCENT = exports.TANGIBLE_PRODUCTS_ONLY = exports.DEFAULT_COUNTRY = exports.ALLOWED_SHIPPING_COUNTRIES = exports.ESCROW_HOLD_DAYS = void 0;
exports.ESCROW_HOLD_DAYS = 14;
exports.ALLOWED_SHIPPING_COUNTRIES = ["United Kingdom", "UK", "GB"];
exports.DEFAULT_COUNTRY = "United Kingdom";
exports.TANGIBLE_PRODUCTS_ONLY = true;
exports.CHARITY_SHARE_PERCENT = 90;
exports.CHARITY_SHARE_RATE = exports.CHARITY_SHARE_PERCENT / 100;
exports.PLATFORM_FEE_RATE = 1 - exports.CHARITY_SHARE_RATE;
