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
exports.parseSpreadsheetBuffer = parseSpreadsheetBuffer;
const exceljs_1 = __importDefault(require("exceljs"));
/** Parse first worksheet rows into objects keyed by header row. */
function parseSpreadsheetBuffer(buffer) {
    return __awaiter(this, void 0, void 0, function* () {
        const workbook = new exceljs_1.default.Workbook();
        yield workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];
        if (!worksheet)
            return [];
        const rows = [];
        let headers = [];
        worksheet.eachRow((row, rowNumber) => {
            const values = row.values.slice(1);
            if (rowNumber === 1) {
                headers = values.map((v) => String(v !== null && v !== void 0 ? v : "").trim());
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
    });
}
