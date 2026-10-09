"use strict";

// Small helpers shared by the models. They reproduce the pieces of ActiveRecord
// the validations lean on: `blank?` (nil and whitespace-only strings), the
// numeric cast used by `numericality`, real-date parsing, and the money format
// the API returns (text with trailing zeros trimmed, at least one decimal).

// Ruby's `blank?`: nil, undefined, false, and a String that is empty or only
// whitespace.
function isBlank(value) {
  if (value === null || value === undefined || value === false) return true;
  if (typeof value === "string") return value.trim() === "";
  return false;
}

function isPresent(value) {
  return !isBlank(value);
}

// Casts a value to a JS number the way ActiveRecord's `numericality` accepts a
// decimal: a JSON number, or a String written like "10", "10.5", ".5", "-3".
// Returns null when the value is not a number, so the caller can add the
// "is not a number" message instead of reaching the range checks.
function asNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(trimmed)) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

// A real calendar date in YYYY-MM-DD. Rejects "not-a-date" and impossible dates
// like "2000-13-40" (the month/day overflow when rebuilt as a UTC date).
function isValidISODate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// Today's date as YYYY-MM-DD (UTC), the comparison point for "not in the
// future" birthdates.
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// A stored Date (UTC midnight for a pure date) back to YYYY-MM-DD.
function toISODate(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

// Money on the wire: exactly two decimals, then trailing zeros trimmed but at
// least one decimal digit kept. "159.90" -> "159.9", "129.00" -> "129.0",
// "123.45" -> "123.45". Matches the original's BigDecimal serialization.
function formatMoney(value) {
  const fixed = (typeof value.toFixed === "function" ? value : Number(value)).toFixed(2);
  return fixed.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, ".0");
}

module.exports = {
  isBlank,
  isPresent,
  asNumber,
  isValidISODate,
  todayISO,
  toISODate,
  formatMoney,
};
