"use strict";

const { HttpError } = require("../../lib/errors/errors");

// Shared validation of query parameters: pagination, sorting and filters,
// mirroring app/helpers/params.rb.
//
// Query parameters always arrive as Strings (or Arrays/Hashes when the client
// repeats or nests a key). These helpers accept only the shapes the routes
// understand and stop the request with 400 otherwise, so an unexpected type can
// never reach a query and silently change its meaning.

// How many records a paginated list returns at most.
const MAX_LIMIT = 100;

// Columns a client may sort products by. The allowlist keeps the column name
// from ever reaching the query unchecked.
const PRODUCT_SORT_COLUMNS = ["id", "name", "price", "category", "created_at"];

function invalid(name, message) {
  throw new HttpError(400, { error: "Invalid parameter", messages: [message] });
}

// Reads a pagination parameter: a positive integer, or the default when the
// client did not send it. Anything else is a 400 naming the parameter.
function integerParam(raw, name, { default: defaultValue, max = null } = {}) {
  if (raw === undefined) return defaultValue;

  if (typeof raw !== "string" || !/^[1-9]\d*$/.test(raw)) {
    invalid(name, `${name} must be a positive integer`);
  }

  const value = Number(raw);
  if (max !== null && value > max) {
    invalid(name, `${name} must be at most ${max}`);
  }

  return value;
}

// Reads a numeric filter parameter: a decimal number as the client would write
// it ("10", "10.5", "-3", ".5"). Anything else is a 400 naming the parameter.
function decimalParam(raw, name) {
  if (raw === undefined) return null;

  if (typeof raw !== "string" || !/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(raw)) {
    invalid(name, `${name} must be a number`);
  }

  return raw;
}

// Reads a sorting parameter: a column of the allowlist, with an optional "-"
// prefix for descending order. Anything else is a 400 listing the accepted
// values. Returns a Prisma orderBy object.
function sortParam(raw, allowed, { default: defaultValue }) {
  if (raw === undefined) return defaultValue;

  if (typeof raw !== "string") {
    invalid("sort", `sort must be one of: ${allowed.join(", ")}`);
  }

  const descending = raw.startsWith("-");
  const column = descending ? raw.slice(1) : raw;

  if (!allowed.includes(column)) {
    invalid("sort", `sort must be one of: ${allowed.join(", ")}`);
  }

  return { [column]: descending ? "desc" : "asc" };
}

// Reads a filter parameter against an allowlist of values (a String the client
// may send, such as a status). Anything else is a 400 listing the accepted
// values.
function inclusionParam(raw, name, allowed) {
  if (raw === undefined) return null;

  if (typeof raw !== "string" || !allowed.includes(raw)) {
    invalid(name, `${name} must be one of: ${allowed.join(", ")}`);
  }

  return raw;
}

// Reads a text filter parameter: a String within the length the model accepts.
// A longer value could never match (the model forbids storing it), and a
// non-String would change the meaning of the query.
function textParam(raw, name, { maxLength }) {
  if (raw === undefined) return null;

  if (typeof raw !== "string" || raw.length > maxLength) {
    invalid(name, `${name} must be a text of at most ${maxLength} characters`);
  }

  return raw;
}

module.exports = {
  MAX_LIMIT,
  PRODUCT_SORT_COLUMNS,
  integerParam,
  decimalParam,
  sortParam,
  inclusionParam,
  textParam,
};
