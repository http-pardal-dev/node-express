"use strict";

const bcrypt = require("bcryptjs");
const { isBlank, isPresent, isValidISODate, todayISO, toISODate } = require("./support");

// User model — CRUD and HTTP fundamentals.
//
// Mirrors ruby-sinatra's app/models/user.rb: the same rules (name 2-100, email
// present/valid/unique/max 254 and normalized, password min 8 optional on
// update, role in ROLES, birthdate a real past-or-today date), the same virtual
// password attributes (only a bcrypt digest is stored) and the same public
// response allowlist. Persistence is Prisma; this module owns the rules and the
// JSON shape, the way the ActiveRecord model does.

const ROLES = ["user", "admin"];

// Longest email accepted, the longest address the mail standards allow.
const MAX_EMAIL_LENGTH = 254;

const MIN_PASSWORD_LENGTH = 8;

// Fields a client may send on create/update. Anything else is rejected by the
// route (restrict_attributes) before it reaches here.
const WRITABLE_ATTRIBUTES = [
  "name",
  "email",
  "password",
  "password_confirmation",
  "role",
  "birthdate",
  "active",
];

// Public representation: an explicit allowlist, so password_digest never
// appears and a column added later is not exposed by accident.
const PUBLIC_ATTRIBUTES = [
  "id",
  "name",
  "email",
  "role",
  "active",
  "birthdate",
  "created_at",
  "updated_at",
];

// Emails compare case-insensitively, so they are stored the way they are
// compared: stripped and downcased.
function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : email;
}

// bcrypt cost, matching the original's has_secure_password default (10).
const BCRYPT_COST = 10;

async function hashPassword(plain) {
  return bcrypt.hash(String(plain), BCRYPT_COST);
}

// Validates the attributes the way the model does, returning an array of
// human-readable messages (empty when valid). `isCreate` decides whether the
// password is required (create) or optional (update).
//
// Email uniqueness is a database concern (a query) and is checked by the
// caller, not here; the messages this returns match the model's own
// validations.
function validate(attributes, { isCreate = true } = {}) {
  const errors = [];

  validateName(attributes.name, errors);
  validateEmail(attributes.email, errors);
  validatePassword(attributes, { isCreate }, errors);
  validateRole(attributes.role, errors);
  validateBirthdate(attributes.birthdate, errors);

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

function validateEmail(email, errors) {
  if (isBlank(email)) {
    errors.push("Email can't be blank");
    return;
  }
  if (email.length > MAX_EMAIL_LENGTH) {
    errors.push(`Email is too long (maximum is ${MAX_EMAIL_LENGTH} characters)`);
    return;
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    errors.push("Email is invalid");
  }
}

function validatePassword(attributes, { isCreate }, errors) {
  const { password, password_confirmation: confirmation } = attributes;

  if (isCreate) {
    if (isBlank(password)) {
      errors.push("Password can't be blank");
    } else if (String(password).length < MIN_PASSWORD_LENGTH) {
      errors.push(`Password is too short (minimum is ${MIN_PASSWORD_LENGTH} characters)`);
    }
  } else if (isPresent(password) && String(password).length < MIN_PASSWORD_LENGTH) {
    // On update the password is optional (allow_nil), but a sent one is checked.
    errors.push(`Password is too short (minimum is ${MIN_PASSWORD_LENGTH} characters)`);
  }

  // The confirmation must match when it is sent.
  if (isPresent(confirmation) && confirmation !== password) {
    errors.push("Password confirmation doesn't match Password");
  }
}

function validateRole(role, errors) {
  // role has a database default ("user"), so it is only rejected when sent and
  // not one of the allowed values.
  if (isPresent(role) && !ROLES.includes(role)) {
    errors.push("Role is not included in the list");
  }
}

function validateBirthdate(birthdate, errors) {
  if (isBlank(birthdate)) return;

  // A real YYYY-MM-DD date. An impossible one ("2000-13-40") is rejected here
  // instead of silently becoming nil.
  if (!isValidISODate(birthdate)) {
    errors.push("Birthdate must be a valid date in YYYY-MM-DD format");
    return;
  }
  if (birthdate > todayISO()) {
    errors.push(`Birthdate must be less than or equal to ${todayISO()}`);
  }
}

// Serializes a stored user (a Prisma record) to the public JSON shape.
function toJson(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    birthdate: user.birthdate ? toISODate(user.birthdate) : null,
    created_at: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
    updated_at: user.updatedAt instanceof Date ? user.updatedAt.toISOString() : user.updatedAt,
  };
}

module.exports = {
  ROLES,
  MAX_EMAIL_LENGTH,
  PUBLIC_ATTRIBUTES,
  WRITABLE_ATTRIBUTES,
  normalizeEmail,
  hashPassword,
  validate,
  toJson,
};
