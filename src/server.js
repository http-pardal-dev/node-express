"use strict";

// Entry point: loads the configuration and environment (which refuses an
// unknown APP_ENV on its own), builds the application and listens.
//
// The server binds the loopback interface only (see config.js): this API has no
// authentication, and 127.0.0.1 is the only thing keeping it out of reach.

const { APP_ENV, PORT, HOST } = require("./config");
const { createApp } = require("./app");

const app = createApp();

app.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`node-express listening on http://${HOST}:${PORT} (${APP_ENV})`);
});
