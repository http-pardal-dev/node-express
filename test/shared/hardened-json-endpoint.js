"use strict";

// Shared behaviour for the integration specs: given an endpoint that accepts a
// JSON body, these examples pin down how the application treats bodies and
// attributes that must never succeed silently. The counterpart of
// ruby-sinatra's spec/shared/hardened_json_endpoint.rb.
//
// This is behaviour, not tooling: every resource has to answer the same four
// ways, so the three integration specs assert it once, here, instead of writing
// the same four tests three times. The tools the tests themselves use are in
// test/support/helpers/request.js.
//
// The host test calls hardenedJsonEndpoint with:
//   - path:       the endpoint (e.g. "/users");
//   - validBody:  an object the endpoint accepts;
//   - send:       a function that posts `body` to the endpoint (POST here).

const { postJson, postRaw, dumpResponse } = require("../support/helpers/request");

function hardenedJsonEndpoint({ path, validBody, send }) {
  it("returns 400 for an invalid JSON body", async () => {
    const res = await postRaw(path, "{invalid");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid JSON");
  });

  it("returns 400 for a JSON body that is not an object", async () => {
    const res = await postRaw(path, "[1, 2]");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("JSON body must be an object");
  });

  it("returns 400 for an unknown field, without a 500", async () => {
    const res = await send({ ...validBody, unknown_field: "nope" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Unknown fields");
    expect(res.body.messages[0]).toContain("unknown_field");
  });

  it("returns 413 for a body larger than the limit", async () => {
    const res = await send({ ...validBody, padding: "x".repeat(64 * 1024) });

    expect(res.status).toBe(413);
    expect(res.body.error).toBe("Request body too large");
  });
}

module.exports = { hardenedJsonEndpoint, postJson, dumpResponse };
