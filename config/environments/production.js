"use strict";

// Production environment settings.
//
// The counterpart of config/environments/production.rb: no request log, only
// informational lines and above. Errors still reach the error stream through
// the error handler (see lib/errors/errors.js).
module.exports = { logLevel: "info", requestLogging: false };
