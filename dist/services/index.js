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
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const fetchCharityRealCategories_1 = require("./fetchCharityRealCategories");
const ebayAuth_1 = require("../utils/ebayAuth");
dotenv_1.default.config();
(0, ebayAuth_1.startAutoRefresh)();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/angelpage';
const PRE_SELECTED = [
    {
        name: 'British Heart Foundation',
        seller: 'bhf_shops',
        charity_ids: '225971',
    },
    { name: 'Oxfam', seller: 'oxfam_ebay_shop', charity_ids: '202918' },
    {
        name: 'Cancer Research UK',
        seller: 'cancerresearchukshop',
        charity_ids: '1089464',
    },
    {
        name: 'British Red Cross',
        seller: 'britishredcross',
        charity_ids: '220949',
    },
    {
        name: 'Children’s Society',
        seller: 'the_childrens_society',
        charity_ids: '221124',
    },
    {
        name: 'Royal British Legion Industries',
        seller: 'theroyalbritishlegion',
        charity_ids: '210063',
    },
    { name: 'Sense', seller: 'sensecharityretail', charity_ids: '289868' },
    { name: 'PDSA', seller: 'pdsa_charity', charity_ids: '208217' },
    { name: "Barnardo's", seller: 'barnardos_charity', charity_ids: '216250' },
    { name: 'Age UK', seller: 'ageuk', charity_ids: '1128267' },
    { name: 'Sue Ryder', seller: 'sueryderpre-loved', charity_ids: '1052076' },
    { name: 'Marie Curie', seller: 'mariecurietrading', charity_ids: '207994' },
];
(() => __awaiter(void 0, void 0, void 0, function* () {
    yield mongoose_1.default.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    for (const c of PRE_SELECTED) {
        try {
            yield (0, fetchCharityRealCategories_1.fetchCharityRealCategories)(c.seller, c.charity_ids);
        }
        catch (_a) {
            console.error(`❌ Failed for ${c.name}`);
        }
        console.log('⏳ Waiting 20 seconds before next charity...');
        yield new Promise(r => setTimeout(r, 20000));
    }
    yield mongoose_1.default.connection.close();
    console.log('🏁 All charities done.');
}))();
