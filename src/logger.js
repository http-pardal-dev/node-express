"use strict";

// Application logger, the counterpart of ruby-sinatra's per-environment logging
// (config/environments/*.rb). ruby-sinatra swaps the Logger by environment:
// development prints every request and query, test is silent, production is
// quiet. Pino is configured the same way here, from APP_ENV:
//
//   - development: "debug" level, every event is recorded;
//   - test:        "silent", so the suite output stays readable;
//   - production:  "info", one JSON line per event.
//
// The logger is a single shared instance (like ruby-sinatra keeps one Logger),
// imported wherever something needs to be recorded. Output is structured JSON
// on stdout, the shape a log shipper expects; the level alone decides how much
// of it there is, the way the original decides by swapping the Logger.

const pino = require("pino");
const { APP_ENV } = require("./config");

// Level per environment. "silent" turns Pino off completely (nothing is
// written), which is what the test suite wants.
const LEVELS = {
  development: "debug",
  test: "silent",
  production: "info",
};

const level = LEVELS[APP_ENV] || "info";

const logger = pino({
  level,
  // A stable field on every line, so logs from this service are recognizable
  // once they reach a shared log store.
  base: { service: "node-express" },
  timestamp: pino.stdTimeFunctions.isoTime,
});

module.exports = logger;

