"use strict";

// Startup initializer: the database of the current environment has to exist,
// and one Prisma Client serves the whole process.
//
// The counterpart of config/initializers/database.rb (plus the single
// ActiveRecord connection it guards): without the file every query would fail
// with a confusing error, a long way from the actual mistake (`npm run
// db:setup` was never run). server.js stops the boot with that message through
// verifyDatabase. The Rake exclusion of the original is mirrored by verifying
// on server boot only, never from the migrate/seed scripts or the tests, which
// create the file themselves.

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { PROJECT_ROOT, APP_ENV, DATABASE_URL } = require("../boot");

// Raised with a message meant to be read by the person using the server, not
// to be debugged. server.js prints it on its own and exits, without a stack
// trace.
class DatabaseError extends Error {}

// One Prisma Client for the whole process, reused across the models so they
// all talk to the same database selected by DATABASE_URL.
const prisma = new PrismaClient();

// The database file of the current environment, as an absolute path. It is
// read from DATABASE_URL, never from a path written twice in the project.
// Prisma resolves a relative SQLite URL from the prisma/ folder (where
// schema.prisma lives); anything else has no file to check.
function databaseFile() {
  const match = /^file:(.+)$/.exec(DATABASE_URL);
  if (!match) return null;
  return path.resolve(PROJECT_ROOT, "prisma", match[1]);
}

function verifyDatabase() {
  const file = databaseFile();
  if (file === null || fs.existsSync(file)) return;

  throw new DatabaseError(
    `The ${APP_ENV} database does not exist: ${file}\n` + "Create it and its tables with: npm run db:setup"
  );
}

module.exports = { prisma, DatabaseError, databaseFile, verifyDatabase };
