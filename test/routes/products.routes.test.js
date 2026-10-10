"use strict";

// Integration tests for the Products routes, through the Express app with
// Supertest (no running server). The counterpart of ruby-sinatra's
// spec/routes/products_routes_spec.rb.

const { get, postJson, patchJson } = require("../support/helpers/request");
const { hardenedJsonEndpoint } = require("../shared/hardened-json-endpoint");
const { prisma } = require("../../config/initializers/database");

// The smallest valid product body.
function productBody(overrides = {}) {
  return {
    name: "Keyboard",
    category: "peripherals",
    price: "159.90",
    ...overrides,
  };
}

// Creates a product through the API and returns the parsed resource.
async function createProduct(overrides = {}) {
  const res = await postJson("/products", productBody(overrides));
  expect(res.status).toBe(201);
  return res.body.product;
}

describe("Products requests", () => {
  it("POST /products creates a product with 201 and a Location header", async () => {
    const res = await postJson("/products", productBody());

    expect(res.status).toBe(201);
    expect(res.headers.location).toMatch(/^\/products\/\d+$/);
    expect(res.body.product.name).toBe("Keyboard");
  });

  it("GET /products/:id finds a product by id", async () => {
    const product = await createProduct();

    const res = await get(`/products/${product.id}`);

    expect(res.status).toBe(200);
    expect(res.body.product.name).toBe("Keyboard");
  });

  it("GET /products paginates the list", async () => {
    await createProduct();

    const res = await get("/products?page=1&limit=2");

    expect(res.status).toBe(200);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 2 });
  });

  it("GET /products filters by category", async () => {
    await createProduct({ category: "e2e-category" });

    const res = await get("/products?category=e2e-category");

    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(1);
  });

  it("GET /products sorts by price descending", async () => {
    await createProduct({ name: "Laptop", price: "3500.00" });

    const res = await get("/products?sort=-price");

    expect(res.status).toBe(200);
    expect(res.body.products[0].name).toBe("Laptop");
  });

  it("PATCH /products/:id partially updates a product", async () => {
    const product = await createProduct();

    const res = await patchJson(`/products/${product.id}`, { price: "149.90" });

    expect(res.status).toBe(200);
    expect(res.body.product.price).toBe("149.9");
  });

  it("GET /products/:id returns 404 for a product that does not exist", async () => {
    const res = await get("/products/999999");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Product not found");
  });

  it("GET /products/:id returns 400 for an id that is not a positive integer", async () => {
    const res = await get("/products/abc");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid id");
  });

  it("POST /products returns 400 for a negative price", async () => {
    const res = await postJson("/products", productBody({ price: "-1" }));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("GET /products returns 400 for a non-numeric page", async () => {
    const res = await get("/products?page=abc");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid parameter");
    expect(res.body.messages[0]).toContain("page");
  });

  it("GET /products returns 400 for a zero limit", async () => {
    const res = await get("/products?limit=0");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid parameter");
    expect(res.body.messages[0]).toContain("limit");
  });

  it("GET /products returns 400 for a limit above the maximum", async () => {
    const res = await get("/products?limit=101");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid parameter");
    expect(res.body.messages[0]).toContain("limit");
  });

  it("GET /products returns 400 for an array page", async () => {
    const res = await get("/products?page[]=1");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid parameter");
  });

  it("GET /products returns 400 for an unknown sort column", async () => {
    const res = await get("/products?sort=hack");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid parameter");
    expect(res.body.messages[0]).toContain("sort");
  });

  it("GET /products returns 400 for a non-numeric min_price", async () => {
    const res = await get("/products?min_price=cheap");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid parameter");
    expect(res.body.messages[0]).toContain("min_price");
  });

  it("GET /products keeps pages stable with the id tiebreak", async () => {
    await createProduct({ name: "Same Price A", price: "10.00" });
    await createProduct({ name: "Same Price B", price: "10.00" });

    const firstPage = (await get("/products?sort=price&limit=1&page=1")).body.products.map((p) => p.id);
    const secondPage = (await get("/products?sort=price&limit=1&page=2")).body.products.map((p) => p.id);

    // No id appears on both pages, and together they are exactly the two rows.
    expect(firstPage.filter((id) => secondPage.includes(id))).toEqual([]);
    expect([...firstPage, ...secondPage].sort()).toEqual(
      (await prisma.product.findMany({ orderBy: { id: "asc" }, take: 2 })).map((p) => p.id).sort()
    );
  });

  hardenedJsonEndpoint({
    path: "/products",
    validBody: productBody,
    send: (body) => postJson("/products", body),
  });
});
