"use strict";

// Seeds: payments. Fixtures live in seeds/payments.yml, the port of
// ruby-sinatra/db/seeds/payments.yml.
//
// The loader is idempotent, so re-running it keeps the existing records
// instead of creating duplicates: payments are matched by amount. status is
// server-owned and only applied on creation, so a payment confirmed or
// cancelled through the API is never moved back.

const prisma = require("../../src/prisma");
const { loadList } = require("./load-list");

// Initial state a payment is created in; matches the model's default.
const DEFAULT_STATUS = "pending";

async function loadPayments() {
  let created = 0;
  for (const payment of loadList("payments.yml")) {
    // amount is the identity: the same decimal value matches the same record.
    const existing = await prisma.payment.findFirst({ where: { amount: payment.amount } });
    if (existing) continue;

    // status is server-owned and only applied on creation, to leave examples
    // in every state, exactly like the original seed.
    await prisma.payment.create({
      data: { amount: payment.amount, status: payment.status || DEFAULT_STATUS },
    });
    created += 1;
  }
  return created;
}

module.exports = { loadPayments };
