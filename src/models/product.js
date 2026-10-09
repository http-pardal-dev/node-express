"use strict";

const { isBlank, asNumber, formatMoney } = require("./support");

// Product model — queries.
//
// Mirrors ruby-sinatra's app/models/product.rb: name 2-100, description up to
// 1000 (optional), category 2-50, price present and between 0 and 99999999.99.
// price is money: stored as a decimal, returned as text so no client loses
// precision to a float.

// Highest storable price: the DECIMAL(10, 2) the original declares.
const MAX_PRICE = 99999999.99;

// Fields a client may send; anything else is rejected by the route.
const WRITABLE_ATTRIBUTES = ["name", "description", "category", "price"];

// Public response allowlist.
const PUBLIC_ATTRIBUTES = [
  "id",
  "name",
  "description",
  "category",
  "price",
  "created_at",
  "updated_at",
];

// Validates the attributes, returning an array of human-readable messages.
// On create every field is required; on update (PATCH) only the fields the
// client actually sent are checked, the way assign_attributes + valid? does in
// the original (the stored record already passed validation, so re-checking
// only the sent fields is equivalent).
function validate(attributes, { isCreate = true } = {}) {
  const errors = [];
  const has = (key) => Object.prototype.hasOwnProperty.call(attributes, key);

  if (isCreate || has("name")) validateName(attributes.name, errors);
  if (isCreate || has("description")) validateDescription(attributes.description, errors);
  if (isCreate || has("category")) validateCategory(attributes.category, errors);
  if (isCreate || has("price")) validatePrice(attributes.price, errors);

  return errors;
}

function validateName(name, errors) {
  if (isBlank(name)) {
    errors.push("Name can't be blank");
    return;
  }
  if (name.length < 2) errors.push("Name is too short (minimum is 2 characters)");
  if (name.length > 100) errors.push("Name is too long (maximum is 100 characters)");
}

function validateDescription(description, errors) {
  // Optional (allow_nil), but capped when sent.
  if (isBlank(description)) return;
  if (String(description).length > 1000) {
    errors.push("Description is too long (maximum is 1000 characters)");
  }
}

function validateCategory(category, errors) {
  if (isBlank(category)) {
    errors.push("Category can't be blank");
    return;
  }
  if (category.length < 2) errors.push("Category is too short (minimum is 2 characters)");
  if (category.length > 50) errors.push("Category is too long (maximum is 50 characters)");
}

function validatePrice(price, errors) {
  if (isBlank(price)) {
    errors.push("Price can't be blank");
    return;
  }

  const value = asNumber(price);
  if (value === null) {
    errors.push("Price is not a number");
    return;
  }
  if (value < 0) errors.push("Price must be greater than or equal to 0");
  if (value > MAX_PRICE) errors.push(`Price must be less than or equal to ${MAX_PRICE}`);
}

// Serializes a stored product (a Prisma record) to the public JSON shape. price
// is returned as text, matching the original's BigDecimal serialization.
function toJson(product) {
  return {
    id: product.id,
    name: product.name,
    description: product.description ?? null,
    category: product.category,
    price: formatMoney(product.price),
    created_at: product.createdAt instanceof Date ? product.createdAt.toISOString() : product.createdAt,
    updated_at: product.updatedAt instanceof Date ? product.updatedAt.toISOString() : product.updatedAt,
  };
}

// Maps writable attributes to the Prisma data object. Only the keys actually
// present are included, so PATCH changes just those. price is passed through as
// the string the client sent (Prisma stores it as a DECIMAL).
function buildData(attributes) {
  const data = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(attributes, key);

  if (has("name")) data.name = attributes.name;
  if (has("description")) data.description = isBlank(attributes.description) ? null : attributes.description;
  if (has("category")) data.category = attributes.category;
  if (has("price")) data.price = attributes.price;

  return data;
}

module.exports = {
  MAX_PRICE,
  PUBLIC_ATTRIBUTES,
  WRITABLE_ATTRIBUTES,
  validate,
  buildData,
  toJson,
};
