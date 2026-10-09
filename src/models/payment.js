"use strict";

const prisma = require("../prisma");
const { isBlank, asNumber, formatMoney } = require("./support");

// Payment model — lifecycle.
//
// Mirrors ruby-sinatra's app/models/payment.rb: amount present and between 0
// (exclusive) and 99999999.99, status in STATUSES, and an atomic transition
// that puts the expected current state inside the UPDATE so exactly one of two
// concurrent transitions wins. amount is money, returned as text.

// States a payment can be in. A payment is created `pending` and moves to
// `paid` (confirm) or `cancelled` (cancel); there is no other transition.
const STATUSES = ["pending", "paid", "cancelled"];

// Initial state of a newly created payment.
const DEFAULT_STATUS = "pending";

// Highest storable amount: the DECIMAL(10, 2) the original declares.
const MAX_AMOUNT = 99999999.99;

// The only field a client may send. status is server-owned.
const WRITABLE_ATTRIBUTES = ["amount"];

// Public response allowlist.
const PUBLIC_ATTRIBUTES = [
  "id",
  "amount",
  "status",
  "created_at",
  "updated_at",
];

// Validates the attributes, returning an array of human-readable messages.
function validate(attributes) {
  const errors = [];

  validateAmount(attributes.amount, errors);
  // status is server-owned and only ever set to a valid value here, so there is
  // nothing for a client to send; kept for parity with the model's inclusion.
  if (isPresent(attributes.status) && !STATUSES.includes(attributes.status)) {
    errors.push("Status is not included in the list");
  }

  return errors;
}

function isPresent(value) {
  return !isBlank(value);
}

function validateAmount(amount, errors) {
  if (isBlank(amount)) {
    errors.push("Amount can't be blank");
    return;
  }

  const value = asNumber(amount);
  if (value === null) {
    errors.push("Amount is not a number");
    return;
  }
  if (value <= 0) errors.push("Amount must be greater than 0");
  if (value > MAX_AMOUNT) errors.push(`Amount must be less than or equal to ${MAX_AMOUNT}`);
}

// Moves the payment to `to`, but only when its current state is `from` (by
// default `pending`). The state is part of the UPDATE, so the check and the
// change are a single atomic statement: of two concurrent transitions on the
// same payment, exactly one matches the row and wins, and the other changes
// nothing. Returns true when this call performed the transition.
async function transition(id, to, from = DEFAULT_STATUS) {
  const result = await prisma.payment.updateMany({
    where: { id, status: from },
    data: { status: to },
  });

  return result.count === 1;
}

// Serializes a stored payment (a Prisma record) to the public JSON shape.
// amount is returned as text, matching the original's BigDecimal serialization.
function toJson(payment) {
  return {
    id: payment.id,
    amount: formatMoney(payment.amount),
    status: payment.status,
    created_at: payment.createdAt instanceof Date ? payment.createdAt.toISOString() : payment.createdAt,
    updated_at: payment.updatedAt instanceof Date ? payment.updatedAt.toISOString() : payment.updatedAt,
  };
}

// Maps writable attributes to the Prisma data object for a create. Only amount
// is accepted; status is server-owned and always starts as DEFAULT_STATUS.
function buildData(attributes) {
  return {
    amount: attributes.amount,
    status: DEFAULT_STATUS,
  };
}

module.exports = {
  STATUSES,
  DEFAULT_STATUS,
  MAX_AMOUNT,
  PUBLIC_ATTRIBUTES,
  WRITABLE_ATTRIBUTES,
  validate,
  buildData,
  transition,
  toJson,
};
