"use strict";

const { HttpError } = require("../../lib/errors/errors");
const { MAX_BODY_BYTES } = require("../helpers/json");

// Captures the raw request body into req.rawBody, enforcing the 64 KB limit
// before anything parses it, the way app/helpers/json.rb does.
//
// The declared length answers first, so an oversized body is refused without
// being read. It cannot be trusted on its own (a chunked request has none), so
// the read also stops one byte past the limit: a body that fits is read whole
// and a longer one is cut short, and the server never holds more than the limit
// plus one byte. Routes then parse req.rawBody with jsonBody.
function captureRawBody(req, res, next) {
  const declared = req.headers["content-length"];
  if (declared && Number(declared) > MAX_BODY_BYTES) {
    return next(new HttpError(413, { error: "Request body too large" }));
  }

  const chunks = [];
  let size = 0;
  let refused = false;

  req.on("data", (chunk) => {
    if (refused) return;
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      refused = true;
      return next(new HttpError(413, { error: "Request body too large" }));
    }
    chunks.push(chunk);
  });

  req.on("end", () => {
    if (refused) return;
    req.rawBody = Buffer.concat(chunks);
    next();
  });

  req.on("error", next);
}

module.exports = { captureRawBody };
