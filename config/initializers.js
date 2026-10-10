"use strict";

// Startup initializers.
//
// The mistakes that reach a local server are ordinary ones: a typo in APP_ENV,
// a database that was never created. Each of them used to surface much later,
// as an error in the middle of the first request. Here they stop the boot with
// a message that says what to do (see environment.js and initializers/).
//
// This file only loads them, in the order a broken environment is reported:
// without a database nothing else can run either, so the database comes first,
// the way config/initializers.rb loads database before migrations. Requiring
// this file creates the shared Prisma Client and logger; config/environment.js
// requires it on boot, and the rest of the application imports the instances
// from here.

const database = require("./initializers/database");
const logger = require("./initializers/logger");

module.exports = { ...database, logger };
