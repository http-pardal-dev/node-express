"use strict";

const { HttpError } = require("../errors/errors");

// Helpers for JSON handling in requests and responses, mirroring
// app/helpers/json.rb.

// Largest request body the server reads: 64 KB. Every JSON body of this API is
// a single resource with short fields, so anything larger is refused with 413
// before the body is parsed.
const MAX_BODY_BYTES = 64 * 1024;

// Serializes `data` as JSON with an HTTP status.
function json(res, data, statusCode = 200) {
  return res.status(statusCode).json(data);
}

// Reads and parses the request JSON body. The server expects a JSON object, so
// this returns a plain object; an empty body is an empty object. A body larger
// than MAX_BODY_BYTES is a 413, invalid JSON or a non-object value is a 400.
//
// Express parses the body into req.body (see app.js); this reads the raw text
// kept on req.rawBody so the size limit and the "must be an object" rule match
// the original exactly, regardless of the JSON parser Express used.
function jsonBody(req) {
  const raw = req.rawBody;

  if (raw === undefined || raw === null) return {};

  const text = Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw);
  if (text.trim() === "") return {};

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new HttpError(400, { error: "Invalid JSON" });
  }

  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new HttpError(400, { error: "JSON body must be an object" });
  }

  return data;
}

module.exports = { MAX_BODY_BYTES, json, jsonBody };
