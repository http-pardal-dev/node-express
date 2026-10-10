"use strict";

// Test environment settings.
//
// The counterpart of config/environments/test.rb (`App.set :logging, false`):
// nothing is logged, so the suite output stays readable.
module.exports = { logLevel: "silent", requestLogging: false };
