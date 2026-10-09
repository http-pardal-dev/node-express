"use strict";

// Seeds: populates the database with the same fixtures as ruby-sinatra
// (see ruby-sinatra/db/seeds/*.yml). The data now lives in prisma/seeds/*.yml
// and each resource has its own loader under seeds/, so this file only
// orchestrates them, the way db/seeds.rb does.
//
//   node prisma/seed.js        # or: npm run db:seed
//
// The loader is idempotent, so re-running it keeps the existing records
// instead of creating duplicates:
//   - users: matched by email (stripped and downcased, like the model); each
//     password from the YAML is hashed with bcrypt (has_secure_password);
//   - products: matched by name;
//   - payments: matched by amount; status is only applied on creation (a
//     payment created pending is moved once), so a payment the user confirmed
//     or cancelled through the API is never moved back.

// Load the environment (APP_ENV, DATABASE_URL) before the Prisma Client is
// created, the same way src/config.js does for the server.
require("dotenv").config();

const prisma = require("../src/prisma");
const { loadUsers } = require("./seeds/users");
const { loadProducts } = require("./seeds/products");
const { loadPayments } = require("./seeds/payments");

async function main() {
  const users = await loadUsers();
  const products = await loadProducts();
  const payments = await loadPayments();

  // eslint-disable-next-line no-console
  console.log(
    `Seeds loaded: ${users} user(s), ${products} product(s), ${payments} payment(s).`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
