"use strict";

// Startup initializer: the application logger.
//
// The counterpart of the per-environment logging of config/environments/*.rb,
// applied here from config/environments/<APP_ENV>.js: development records
// everything, test is silent, production keeps one JSON line per event.
// LOG_LEVEL overrides the level when it is set. A single shared instance is
// imported wherever something needs to be recorded; output is structured JSON
// on stdout, the shape a log shipper expects.

const pino = require("pino");
const { APP_ENV } = require("../boot");
const settings = require(`../environments/${APP_ENV}`);

const logger = pino({
  level: process.env.LOG_LEVEL || settings.logLevel,
  // A stable field on every line, so logs from this service are recognizable
  // once they reach a shared log store.
  base: { service: "node-express" },
  timestamp: pino.stdTimeFunctions.isoTime,
});

module.exports = logger;
