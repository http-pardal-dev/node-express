"use strict";

const { PrismaClient } = require("@prisma/client");

// One Prisma Client for the whole process, the way ruby-sinatra keeps a single
// ActiveRecord connection (see config/initializers/database.rb). Reused across
// the models so they all talk to the same database selected by DATABASE_URL.
const prisma = new PrismaClient();

module.exports = prisma;
