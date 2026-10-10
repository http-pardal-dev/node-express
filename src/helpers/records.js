"use strict";

const { HttpError } = require("../../lib/errors/errors");

// Shared resource behavior: lookup, attribute filtering and persistence,
// mirroring app/helpers/records.rb.
//
// The routes stay explicit about what each request does; these helpers only
// remove the repetition of finding a record, rejecting unexpected input and
// turning persistence failures into HTTP responses.

// Finds a resource by id, or stops the request. Every route that takes an :id
// uses this, so an invalid id and a missing record always answer the same way,
// in the same order:
//
//   - 400 when the id is not a positive integer: no record could ever have it,
//     so the client sent a malformed address and the query is skipped;
//   - 404 when the id is well formed but no record has it.
//
// `findById` is an async lookup the route provides (Prisma), and `label` is the
// resource name used in the 404 message ("User not found").
async function findOr404(req, id, { findById, label }) {
  if (!/^[1-9]\d*$/.test(String(id))) {
    throw new HttpError(400, { error: "Invalid id", messages: ["id must be a positive integer"] });
  }

  const record = await findById(Number(id));
  if (record === null) {
    throw new HttpError(404, { error: `${label} not found` });
  }

  return record;
}

// Keeps only the attributes the resource accepts. Unknown keys are rejected
// with 400, naming every offending key, instead of being ignored silently.
function restrictAttributes(payload, allowed) {
  const unknown = Object.keys(payload).filter((key) => !allowed.includes(key));

  if (unknown.length > 0) {
    throw new HttpError(400, {
      error: "Unknown fields",
      messages: unknown.map((field) => `Unknown field: ${field}`),
    });
  }

  const picked = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) picked[key] = payload[key];
  }
  return picked;
}

// Validates a record through the model and throws a 400 with the messages when
// it is not valid. `model` is the module exposing `validate` (async, like the
// user's uniqueness check against the database); `options` is forwarded.
async function validateOr400(model, attributes, options) {
  const messages = await model.validate(attributes, options);
  if (messages.length > 0) {
    throw new HttpError(400, { error: "Validation failed", messages });
  }
}

module.exports = { findOr404, restrictAttributes, validateOr400 };
