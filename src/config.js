"use strict";

// Application configuration.
//
// Reads the runtime environment the way config/environment.rb does: APP_ENV
// selects development, test or production, and the database file is chosen with
// DATABASE_URL (see .env.example). Unknown environments are refused here with a
// message that says what to fix, before anything else loads.

require("dotenv").config();

const ENVIRONMENTS = ["development", "test", "production"];

const APP_ENV = process.env.APP_ENV || "development";

if (!ENVIRONMENTS.includes(APP_ENV)) {
  // Printed on its own, without a stack trace: a typo in APP_ENV is a mistake
  // by the person running the server, not a bug in it.
  // eslint-disable-next-line no-console
  console.error(
    `\nAPP_ENV is ${JSON.stringify(APP_ENV)}, but this server only knows: ${ENVIRONMENTS.join(", ")}.\n` +
      "Fix it in the .env file (see .env.example) or set APP_ENV=<name> before starting the server.\n"
  );
  process.exit(1);
}

// The database file defaults to the current environment when DATABASE_URL is
// not set, mirroring data/database.yml (storage/<env>.sqlite3).
const DATABASE_URL =
  process.env.DATABASE_URL || `file:../storage/${APP_ENV}.sqlite3`;

// The server binds the loopback interface only: this API has no authentication.
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";

module.exports = { APP_ENV, DATABASE_URL, PORT, HOST, ENVIRONMENTS };
