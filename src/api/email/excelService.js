import ExcelJS from "exceljs";
import { google } from "googleapis";
import fs from "fs/promises";
import path from "path";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const CREDENTIALS_PATH = path.join(
	__dirname,
	"../../utils/angelpage-e-commerce-charity-1c959ff317f7.json",
);

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || "";
const EXCEL_FILE_PATH =
	process.env.SUBSCRIPTION_EXCEL_PATH ||
	path.join(__dirname, "../../data/subscriptions.xlsx");

const loadCredentials = async () => {
	try {
		const content = await fs.readFile(CREDENTIALS_PATH, "utf8");
		return JSON.parse(content);
	} catch (error) {
		console.error("Error loading credentials:", error);
		throw new Error("Failed to load credentials");
	}
};

export const writeSubscriptionToGoogleSheet = async (email) => {
	if (!SPREADSHEET_ID) {
		throw new Error("Spreadsheet ID is missing");
	}

	const credentials = await loadCredentials();

	const auth = new google.auth.GoogleAuth({
		credentials,
		scopes: SCOPES,
	});

	const sheets = google.sheets({ version: "v4", auth });

	const date = new Date().toISOString();

	try {
		await sheets.spreadsheets.values.append({
			spreadsheetId: '1l0x4r7-jwyEE3q9SJRY3y0Rh-PVtRZ8nawWuNwWtGuc',
			range: "Sheet1!A1",
			valueInputOption: "USER_ENTERED",
			requestBody: {
				values: [[email, date]],
			},
		});

		console.log("Subscription data written to Google Sheet successfully");
	} catch (error) {
		console.error("Error writing to Google Sheet:", error);
		throw new Error("Failed to write to Google Sheet");
	}
};

export const writeSubscriptionToExcel = async (email) => {
	try {
		const workbook = new ExcelJS.Workbook();
		let worksheet;

		try {
			await fs.access(EXCEL_FILE_PATH);
			await workbook.xlsx.readFile(EXCEL_FILE_PATH);
			worksheet = workbook.getWorksheet("Subscriptions");
		} catch {
			worksheet = workbook.addWorksheet("Subscriptions");
			worksheet.addRow(["Email", "Subscribed At"]);
		}

		if (!worksheet) {
			worksheet = workbook.addWorksheet("Subscriptions");
			worksheet.addRow(["Email", "Subscribed At"]);
		}

		worksheet.addRow([email, new Date().toISOString()]);
		await fs.mkdir(path.dirname(EXCEL_FILE_PATH), { recursive: true });
		await workbook.xlsx.writeFile(EXCEL_FILE_PATH);
		console.log("Subscription added to Excel:", email);
	} catch (error) {
		console.error("Error writing to Excel:", error);
	}
};
