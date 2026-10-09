"use strict";

const express = require("express");
const { notFoundHandler, errorHandler } = require("./errors/errors");
const { captureRawBody } = require("./middleware/raw-body");

// Modular Express application, the counterpart of ruby-sinatra's app.rb.
//
// Every response uses the application/json content-type; the request body is
// captured raw and parsed as JSON by the helpers; errors (404, 405, 500) also
// return JSON. Database access uses Prisma (see src/prisma.js).
function createApp() {
  const app = express();

  // No framework banner, and JSON is produced by the helpers/Prisma, so the
  // default parsers are not installed: the raw body is captured instead.
  app.disable("x-powered-by");
  app.use(captureRawBody);

  // Health check route: confirms the server is up.
  app.get("/", (req, res) => {
    res.json({ service: "node-express", status: "ok" });
  });

  // Routes for each resource, one router per resource.
  app.use("/users", require("./routes/users"));
  app.use("/products", require("./routes/products"));
  app.use("/payments", require("./routes/payments"));

  // 404/405 for a path no route served (the route table lives in errors.js),
  // then the JSON error handler.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
