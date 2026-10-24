/*
  CSV writer for staff exports.

  Two protections beyond normal quoting:
  - Formula injection: a cell that starts with = + - @ (or tab / carriage
    return) can run as a formula when opened in Excel or Google Sheets,
    e.g. =HYPERLINK("http://evil", "click"). Such cells get a leading
    apostrophe so spreadsheets show them as plain text.
  - A UTF-8 byte-order mark at the start so Excel shows accented names
    (e.g. "José") correctly instead of garbled characters.

  Pure function, no imports.
*/

export type CsvCell = string | number | boolean | null | undefined;

const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "number" || typeof value === "boolean" ? String(value) : value;
  // Numbers we generate are safe; only text from people needs neutralizing
  if (typeof value === "string" && FORMULA_START.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: CsvCell[][]): string {
  const lines = [header, ...rows].map((r) => r.map(cell).join(","));
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}
