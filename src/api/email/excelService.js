import XLSX from "xlsx";
import { google } from "googleapis";
import fs from "fs/promises";
import path from "path";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const CREDENTIALS_PATH = path.join(
	__dirname,
	"../../utils/angelpage-e-commerce-charity-1c959ff317f7.json",
);

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || ""; // Add the Sheet ID to your .env file

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
			range: "Sheet1!A1", // Ensure your sheet's name matches
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
		let workbook;

		// Load existing file or create a new workbook
		if (fs.existsSync(excelFilePath)) {
			workbook = XLSX.readFile(excelFilePath);
		} else {
			workbook = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(
				workbook,
				XLSX.utils.aoa_to_sheet([["Email", "Subscribed At"]]),
				"Subscriptions"
			);
		}

		const worksheet = workbook.Sheets["Subscriptions"];
		const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
		const newRow = [email, new Date().toISOString()];
		data.push(newRow);

		const updatedWorksheet = XLSX.utils.aoa_to_sheet(data);
		workbook.Sheets["Subscriptions"] = updatedWorksheet;

		XLSX.writeFile(workbook, excelFilePath);
		console.log("Subscription added to Excel:", email);
	} catch (error) {
		console.error("Error writing to Excel:", error);
	}
};
