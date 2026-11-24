import ExcelJS from "exceljs";

/** Parse first worksheet rows into objects keyed by header row. */
export async function parseSpreadsheetBuffer(buffer) {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buffer);
	const worksheet = workbook.worksheets[0];
	if (!worksheet) return [];

	const rows = [];
	let headers = [];

	worksheet.eachRow((row, rowNumber) => {
		const values = row.values.slice(1);
		if (rowNumber === 1) {
			headers = values.map((v) => String(v ?? "").trim());
			return;
		}

		const obj = {};
		values.forEach((val, idx) => {
			const key = headers[idx] || `col${idx + 1}`;
			obj[key] = val;
		});

		if (Object.values(obj).some((v) => v !== null && v !== undefined && v !== "")) {
			rows.push(obj);
		}
	});

	return rows;
}
