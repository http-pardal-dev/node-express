"use strict";

// Entry point: loads the environment (which refuses an unknown APP_ENV on its
// own), verifies the database of the current environment exists, then builds
// the application and listens.
//
// The server binds the loopback interface only (see config/boot.js): this API
// has no authentication, and 127.0.0.1 is the only thing keeping it out of
// reach.

const { APP_ENV, PORT, HOST } = require("../config/boot");
require("../config/environment");
const { verifyDatabase, DatabaseError } = require("../config/initializers/database");
const { createApp } = require("./app");

try {
  verifyDatabase();
} catch (err) {
  if (err instanceof DatabaseError) {
    // eslint-disable-next-line no-console
    console.error(`\n${err.message}\n`);
    process.exit(1);
  }
  throw err;
}

const app = createApp();

app.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`node-express listening on http://${HOST}:${PORT} (${APP_ENV})`);
});
