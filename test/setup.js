"use strict";

// Jest infrastructure, the counterpart of ruby-sinatra's spec/spec_helper.rb.
//
// The specs are split the way the application is (see src/): the models live in
// test/models/ and the routes in test/routes/, one file per resource. test/
// errors.test.js is the exception, like spec/errors_spec.rb: the HTTP protocol
// belongs to no single resource, so it sits at the top of test/.
//
// The specs run in the `test` environment, against storage/test.sqlite3. Prepare
// that database once with `npm run test:db:migrate`; without it the first query
// fails with a clear error instead of a confusing one.
//
// Every spec (unit and integration) shares one Prisma connection, cleaned
// between examples so each test sees empty tables. The integration specs go
// through the Express app with Supertest, without starting a server.

// The environment must be selected before the application loads: dotenv never
// overrides a variable that is already set, so forcing `test` here keeps the
// specs from touching the development database even when `.env` says otherwise.
// DATABASE_URL is pinned the same way the `test:db:*` npm scripts pin it.
process.env.APP_ENV = "test";
process.env.DATABASE_URL = "file:../storage/test.sqlite3";

const prisma = require("../src/prisma");

// Each example starts with empty tables, so records created by one test never
// leak into another. There are no foreign keys between the tables, so the order
// does not matter. deleteMany on an empty table is a no-op, which keeps this
// correct for both the unit and the integration specs.
beforeEach(async () => {
  await prisma.user.deleteMany();
  await prisma.product.deleteMany();
  await prisma.payment.deleteMany();
});

// One connection for the whole process, closed once at the end so Jest exits
// cleanly instead of waiting on the open Prisma handle.
afterAll(async () => {
  await prisma.$disconnect();
});
