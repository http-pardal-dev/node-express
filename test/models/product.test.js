"use strict";

// Unit tests for the Product model (src/models/product.js). The counterpart of
// ruby-sinatra's spec/models/product_spec.rb. Validation is a pure function, so
// these specs need no database.

const { Product } = require("../../src/models");

// The smallest valid product: name, category and price decide validity.
function buildProduct(overrides = {}) {
  return {
    name: "Keyboard",
    category: "peripherals",
    price: "159.90",
    ...overrides,
  };
}

describe("Product.validate", () => {
  it("is valid with name, category and price", () => {
    expect(Product.validate(buildProduct())).toEqual([]);
  });

  it("requires a name", () => {
    expect(Product.validate(buildProduct({ name: null }))).toContain("Name can't be blank");
  });

  it("requires a category", () => {
    expect(Product.validate(buildProduct({ category: null }))).toContain("Category can't be blank");
  });

  it("rejects a negative price", () => {
    expect(Product.validate(buildProduct({ price: "-1" })).length).toBeGreaterThan(0);
  });

  it("accepts a zero price", () => {
    expect(Product.validate(buildProduct({ price: "0" }))).toEqual([]);
  });

  it("rejects a price above the column capacity", () => {
    expect(Product.validate(buildProduct({ price: "100000000" })).length).toBeGreaterThan(0);
  });

  it("accepts the highest storable price", () => {
    expect(Product.validate(buildProduct({ price: "99999999.99" }))).toEqual([]);
  });

  it("on update only checks the sent fields, so a partial update is valid", () => {
    expect(Product.validate({ price: "149.90" }, { isCreate: false })).toEqual([]);
  });

  it("on update still rejects an invalid sent field", () => {
    expect(Product.validate({ price: "-1" }, { isCreate: false }).length).toBeGreaterThan(0);
  });
});

describe("Product.toJson", () => {
  it("exposes only the public attributes and returns price as text", () => {
    const stored = {
      id: 1,
      name: "Keyboard",
      description: "Mechanical keyboard",
      category: "peripherals",
      price: "159.90",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    const json = Product.toJson(stored);
    expect(Object.keys(json).sort()).toEqual([...Product.PUBLIC_ATTRIBUTES].sort());
    expect(json.price).toBe("159.9");
  });
});
