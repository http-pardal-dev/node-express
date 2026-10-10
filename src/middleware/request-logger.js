"use strict";

const logger = require("../../config/initializers/logger");

// Logs every incoming request and its response, the counterpart of the request
// logging ruby-sinatra turns on with `App.set :logging, true` in development
// (and off in test and production). Whether it is installed is decided by the
// environment settings (see config/environments/*.js and app.js); the
// middleware only records the line, after the response finishes, so the status
// code and the duration are already known, on a single structured line per
// request.
function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const line = {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 1000) / 1000,
    };

    // 5xx is an error, everything else is informational.
    if (res.statusCode >= 500) logger.error(line, "request");
    else logger.info(line, "request");
  });

  next();
}

module.exports = { requestLogger };
