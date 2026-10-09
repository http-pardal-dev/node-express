"use strict";

// Jest configuration for the node-express suite.
//
// The suite mirrors ruby-sinatra's spec/ layout (see spec/spec_helper.rb):
//   - test/models/*.test.js          unit tests, one file per model;
//   - test/routes/*.routes.test.js   integration tests, through the Express
//                                    app with Supertest (the counterpart of
//                                    Rack::Test), no running server;
//   - test/errors.test.js            the HTTP protocol every resource inherits
//                                    (404, 405, 400, 500).
//
// The database is storage/test.sqlite3, selected with DATABASE_URL the same way
// the npm scripts do. test/setup.js forces APP_ENV=test and cleans the tables
// between examples, so prepare it once with `npm run test:db:migrate`.
//
// The specs share one SQLite file and clean its tables between examples, so
// they must run serially: the npm scripts pass --runInBand for that reason.
// Running bare `npx jest` in parallel makes the suites fight over the same
// rows and fails with phantom 404s and lost updates.

module.exports = {
  testEnvironment: "node",

  // Only test/ holds specs; src/ and node_modules/ are never scanned.
  roots: ["<rootDir>/test"],
  testMatch: ["<rootDir>/test/**/*.test.js"],

  // Forces APP_ENV=test and DATABASE_URL before any app module loads, then
  // cleans the tables between examples (the counterpart of spec_helper.rb).
  setupFilesAfterEnv: ["<rootDir>/test/setup.js"],

  // Each test file runs in isolation; failing fast on a leaked handle keeps a
  // hanging Prisma connection from masking a real result.
  clearMocks: true,

  // The suite talks to a real SQLite database and boots the Express app, so it
  // is integration-first; coverage is opt-in via `npm run test:coverage`.
  collectCoverageFrom: ["src/**/*.js", "!src/server.js"],
};
