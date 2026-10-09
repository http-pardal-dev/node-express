"use strict";

const express = require("express");
const prisma = require("../prisma");
const { Product } = require("../models");
const { json, jsonBody } = require("../helpers/json");
const { findOr404, restrictAttributes, validateOr400 } = require("../helpers/records");
const {
  MAX_LIMIT,
  PRODUCT_SORT_COLUMNS,
  integerParam,
  decimalParam,
  sortParam,
  textParam,
} = require("../helpers/params");

// Routes for the Products resource — queries.
//
// Everything sent in the query string is read from req.query and validated with
// the params helpers: page and limit must be positive integers (limit at most
// MAX_LIMIT), sort must be a known column with an optional "-" prefix, and the
// filters must have the expected types.

const router = express.Router();

const findById = (id) => prisma.product.findUnique({ where: { id } });

// GET /products - lists products with filters, sorting and pagination.
//
//   category=...                  -> filter by category
//   min_price=...&max_price=...   -> filter by price range (inclusive)
//   sort=name|price (- prefix)    -> sorting ("-" means descending)
//   page=...&limit=...            -> pagination
router.get("/", async (req, res, next) => {
  try {
    const where = {};

    const category = textParam(req.query.category, "category", { maxLength: 50 });
    if (category) where.category = category;

    const minPrice = decimalParam(req.query.min_price, "min_price");
    if (minPrice !== null) where.price = { ...where.price, gte: minPrice };
    const maxPrice = decimalParam(req.query.max_price, "max_price");
    if (maxPrice !== null) where.price = { ...where.price, lte: maxPrice };

    // Sorting: a leading "-" means descending. The column comes from an
    // allowlist, and the id breaks ties, so pages are stable.
    let orderBy = sortParam(req.query.sort, PRODUCT_SORT_COLUMNS, { default: { id: "asc" } });
    if (!Object.keys(orderBy).includes("id")) {
      const direction = Object.values(orderBy)[0];
      orderBy = [{ ...orderBy }, { id: direction }];
    }

    // Pagination: page is 1-based and both values are at least 1.
    const page = integerParam(req.query.page, "page", { default: 1 });
    const limit = integerParam(req.query.limit, "limit", { default: 10, max: MAX_LIMIT });

    const total = await prisma.product.count({ where });
    const products = await prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    json(res, {
      products: products.map(Product.toJson),
      pagination: { page, limit, total },
    });
  } catch (err) {
    next(err);
  }
});

// GET /products/:id - finds a product by id.
router.get("/:id", async (req, res, next) => {
  try {
    const product = await findOr404(req, req.params.id, { findById, label: "Product" });
    json(res, { product: Product.toJson(product) });
  } catch (err) {
    next(err);
  }
});

// POST /products - creates a product. 201 with a Location header.
router.post("/", async (req, res, next) => {
  try {
    const attributes = restrictAttributes(jsonBody(req), Product.WRITABLE_ATTRIBUTES);
    await validateOr400(Product, attributes);

    const product = await prisma.product.create({ data: Product.buildData(attributes) });

    res.set("Location", `/products/${product.id}`);
    json(res, { product: Product.toJson(product) }, 201);
  } catch (err) {
    next(err);
  }
});

// PATCH /products/:id - partially updates a product. Only the sent fields
// change.
router.patch("/:id", async (req, res, next) => {
  try {
    const existing = await findOr404(req, req.params.id, { findById, label: "Product" });
    const attributes = restrictAttributes(jsonBody(req), Product.WRITABLE_ATTRIBUTES);
    await validateOr400(Product, attributes, { isCreate: false });

    const product = await prisma.product.update({
      where: { id: existing.id },
      data: Product.buildData(attributes),
    });
    json(res, { product: Product.toJson(product) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
