"use strict";

// Seeds: users. Fixtures live in data/users.yml, the port of
// ruby-sinatra/db/data/users.yml.
//
// The loader is idempotent, so re-running it keeps the existing records
// instead of creating duplicates: users are matched by email (stripped and
// downcased, like the model). Each `password` from the YAML is hashed with
// bcrypt exactly like the original (has_secure_password); password_confirmation
// mirrors the Ruby fixture and is ignored here.

const bcrypt = require("bcryptjs");
const { prisma } = require("../../../config/initializers/database");
const { loadList } = require("../load-list");

// bcrypt cost, matching the original's has_secure_password default (10).
const BCRYPT_COST = 10;

async function loadUsers() {
  let created = 0;
  for (const user of loadList("users.yml")) {
    const email = user.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) continue;

    await prisma.user.create({
      data: {
        name: user.name,
        email,
        passwordDigest: await bcrypt.hash(String(user.password), BCRYPT_COST),
        role: user.role,
        active: user.active,
        birthdate: new Date(`${user.birthdate}T00:00:00.000Z`),
      },
    });
    created += 1;
  }
  return created;
}

module.exports = { loadUsers };
