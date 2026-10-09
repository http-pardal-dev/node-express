"use strict";

// Seeds: products. Fixtures live in seeds/products.yml, the port of
// ruby-sinatra/db/seeds/products.yml.
//
// The loader is idempotent, so re-running it keeps the existing records
// instead of creating duplicates: products are matched by name.

const prisma = require("../../src/prisma");
const { loadList } = require("./load-list");

async function loadProducts() {
  let created = 0;
  for (const product of loadList("products.yml")) {
    const existing = await prisma.product.findFirst({ where: { name: product.name } });
    if (existing) continue;

    await prisma.product.create({
      data: {
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price,
      },
    });
    created += 1;
  }
  return created;
}

module.exports = { loadProducts };
