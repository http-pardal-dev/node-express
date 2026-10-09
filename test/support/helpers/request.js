"use strict";

// Tools the integration specs use: JSON bodies in, parsed responses out. The
// counterpart of ruby-sinatra's spec/support/helpers/request_helpers.rb.
//
// This is tooling, not behaviour: nothing here asserts anything, it only makes
// a test shorter. The behaviour several specs assert together lives in
// test/shared/hardened-json-endpoint.js.
//
// Supertest drives the Express app (the counterpart of Rack::Test driving the
// Sinatra app) without starting a server. Every call returns a Response with
// `.status`, `.body` (already parsed JSON) and `.headers`.

const request = require("supertest");
const { createApp } = require("../../../src/app");

// One app for the whole suite, built once. Supertest can spin an ephemeral
// server per request, but a single app instance keeps it close to the Ruby
// suite, which sends every request to the same `App`.
const app = createApp();

// Bound verbs against the shared app, so a test reads `get("/users/1")` the way
// a Ruby request spec reads `get "/users/1"`.
const get = (path) => request(app).get(path);
const post = (path) => request(app).post(path);
const put = (path) => request(app).put(path);
const patch = (path) => request(app).patch(path);
const del = (path) => request(app).delete(path);

// Sends a JSON body: sets the content-type, so each test shows only the data
// that matters.
const postJson = (path, body) => post(path).set("Content-Type", "application/json").send(body);
const putJson = (path, body) => put(path).set("Content-Type", "application/json").send(body);
const patchJson = (path, body) => patch(path).set("Content-Type", "application/json").send(body);

// Sends a raw string as a JSON body, for the cases the JSON helpers cannot
// express: an invalid JSON document, or a JSON value that is not an object.
const postRaw = (path, raw) => post(path).set("Content-Type", "application/json").send(raw);

// Full response dump for debugging a failing test: status, headers and body on
// a single inspectable string, the counterpart of `dump_response`.
function dumpResponse(res) {
  return `status=${res.status} headers=${JSON.stringify(res.headers)} body=${JSON.stringify(res.body)}`;
}

module.exports = {
  app,
  request,
  get,
  post,
  put,
  patch,
  del,
  postJson,
  putJson,
  patchJson,
  postRaw,
  dumpResponse,
};

