"use strict";

// Boot: prepares the Node runtime before the application is loaded.
//
// Its only responsibility is the environment the process runs in: it loads the
// .env file and resolves APP_ENV, DATABASE_URL, PORT and HOST from it, the way
// config/boot.rb points Bundler at the Gemfile and defines PROJECT_ROOT.
// Validating APP_ENV and loading the environment-specific settings is the job
// of config/environment.js.

require("dotenv").config();

const path = require("path");

// Absolute path of the project root. Every other configuration that needs a
// path (the SQLite files under storage/) builds it from here, so none of them
// depends on the folder the command happened to be started from.
const PROJECT_ROOT = path.resolve(__dirname, "..");

// Runtime environments. The server knows exactly three of them, and each one
// has its own settings in config/environments/<name>.js and its own database
// in storage/<name>.sqlite3.
const ENVIRONMENTS = ["development", "test", "production"];

const APP_ENV = process.env.APP_ENV || "development";

// The database file defaults to the current environment when DATABASE_URL is
// not set, mirroring data/database.yml (storage/<env>.sqlite3). Prisma
// resolves a relative SQLite path from the prisma/ folder (where schema.prisma
// lives), so the databases sit at the project-root storage/ directory.
const DATABASE_URL = process.env.DATABASE_URL || `file:../storage/${APP_ENV}.sqlite3`;

// The server binds the loopback interface only: this API has no authentication.
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";

module.exports = { PROJECT_ROOT, ENVIRONMENTS, APP_ENV, DATABASE_URL, PORT, HOST };
