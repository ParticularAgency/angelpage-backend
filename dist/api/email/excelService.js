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
exports.writeSubscriptionToExcel = exports.writeSubscriptionToGoogleSheet = void 0;
const xlsx_1 = __importDefault(require("xlsx"));
const googleapis_1 = require("googleapis");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const CREDENTIALS_PATH = path_1.default.join(__dirname, "../../utils/angelpage-e-commerce-charity-1c959ff317f7.json");
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || ""; // Add the Sheet ID to your .env file
const loadCredentials = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const content = yield promises_1.default.readFile(CREDENTIALS_PATH, "utf8");
        return JSON.parse(content);
    }
    catch (error) {
        console.error("Error loading credentials:", error);
        throw new Error("Failed to load credentials");
    }
});
const writeSubscriptionToGoogleSheet = (email) => __awaiter(void 0, void 0, void 0, function* () {
    if (!SPREADSHEET_ID) {
        throw new Error("Spreadsheet ID is missing");
    }
    const credentials = yield loadCredentials();
    const auth = new googleapis_1.google.auth.GoogleAuth({
        credentials,
        scopes: SCOPES,
    });
    const sheets = googleapis_1.google.sheets({ version: "v4", auth });
    const date = new Date().toISOString();
    try {
        yield sheets.spreadsheets.values.append({
            spreadsheetId: '1l0x4r7-jwyEE3q9SJRY3y0Rh-PVtRZ8nawWuNwWtGuc',
            range: "Sheet1!A1", // Ensure your sheet's name matches
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [[email, date]],
            },
        });
        console.log("Subscription data written to Google Sheet successfully");
    }
    catch (error) {
        console.error("Error writing to Google Sheet:", error);
        throw new Error("Failed to write to Google Sheet");
    }
});
exports.writeSubscriptionToGoogleSheet = writeSubscriptionToGoogleSheet;
const writeSubscriptionToExcel = (email) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let workbook;
        // Load existing file or create a new workbook
        if (promises_1.default.existsSync(excelFilePath)) {
            workbook = xlsx_1.default.readFile(excelFilePath);
        }
        else {
            workbook = xlsx_1.default.utils.book_new();
            xlsx_1.default.utils.book_append_sheet(workbook, xlsx_1.default.utils.aoa_to_sheet([["Email", "Subscribed At"]]), "Subscriptions");
        }
        const worksheet = workbook.Sheets["Subscriptions"];
        const data = xlsx_1.default.utils.sheet_to_json(worksheet, { header: 1 });
        const newRow = [email, new Date().toISOString()];
        data.push(newRow);
        const updatedWorksheet = xlsx_1.default.utils.aoa_to_sheet(data);
        workbook.Sheets["Subscriptions"] = updatedWorksheet;
        xlsx_1.default.writeFile(workbook, excelFilePath);
        console.log("Subscription added to Excel:", email);
    }
    catch (error) {
        console.error("Error writing to Excel:", error);
    }
});
exports.writeSubscriptionToExcel = writeSubscriptionToExcel;
