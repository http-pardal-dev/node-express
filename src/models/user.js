"use strict";

const bcrypt = require("bcryptjs");
const prisma = require("../prisma");
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
// human-readable messages (empty when valid). On create, name/email/password
// are required; on update (PATCH/PUT) only the fields the client actually sent
// are checked — PUT forces name/email/role to be present (nil when omitted),
// so a missing one fails the same required check.
//
// Email is normalized before its checks, the way the model's before_validation
// hook does, so "  Ada@Example.COM  " is validated as "ada@example.com".
// Uniqueness is checked against the database here, like the model's
// uniqueness validation; a race that slips between the check and the insert
// still answers 409 through the unique index (`errors.js`).
async function validate(attributes, { isCreate = true, excludeId = null } = {}) {
  const errors = [];
  const has = (key) => Object.prototype.hasOwnProperty.call(attributes, key);

  if (isCreate || has("name")) validateName(attributes.name, errors);
  if (isCreate || has("email")) await validateEmail(attributes.email, errors, { excludeId });
  if (isCreate || has("password") || has("password_confirmation")) {
    validatePassword(attributes, { isCreate }, errors);
  }
  if (has("role")) validateRole(attributes.role, errors);
  if (has("birthdate")) validateBirthdate(attributes.birthdate, errors);

  return errors;
}

// The stored record as writable attributes, so an update validates the merged
// candidate (sent fields over the current state), the way assign_attributes +
// valid? does in the original.
function toCandidate(stored) {
  return {
    name: stored.name,
    email: stored.email,
    role: stored.role,
    birthdate: stored.birthdate ? toISODate(stored.birthdate) : stored.birthdate,
    active: stored.active,
  };
}

function validateName(name, errors) {
  if (isBlank(name)) {
    errors.push("Name can't be blank");
    return;
  }
  if (name.length < 2) errors.push("Name is too short (minimum is 2 characters)");
  if (name.length > 100) errors.push("Name is too long (maximum is 100 characters)");
}

async function validateEmail(email, errors, { excludeId = null } = {}) {
  if (isBlank(email)) {
    errors.push("Email can't be blank");
    return;
  }

  const normalized = normalizeEmail(email);
  if (normalized.length > MAX_EMAIL_LENGTH) {
    errors.push(`Email is too long (maximum is ${MAX_EMAIL_LENGTH} characters)`);
    return;
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    errors.push("Email is invalid");
    return;
  }

  // Uniqueness, the way the model's `uniqueness: { case_sensitive: false }`
  // does — the normalized lookup keeps "Ada@Example.com" and
  // "ada@example.com" from coexisting, and the update excludes its own record.
  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing && existing.id !== excludeId) {
    errors.push("Email has already been taken");
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
  // role has a database default ("user") and no allow_nil, so it is only
  // rejected when the key is present and not one of the allowed values. PUT
  // forces the key to be present (nil when omitted), which then fails here.
  if (!ROLES.includes(role)) {
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

// Maps writable attributes to the Prisma data object. Only the keys actually
// present are included, so PATCH changes just those; PUT passes every key
// (name/email/role forced present by the route). The virtual password becomes
// a bcrypt digest, and birthdate becomes a Date (or null when cleared).
async function buildData(attributes) {
  const data = {};

  if (Object.prototype.hasOwnProperty.call(attributes, "name")) data.name = attributes.name;
  if (Object.prototype.hasOwnProperty.call(attributes, "email")) data.email = normalizeEmail(attributes.email);
  if (Object.prototype.hasOwnProperty.call(attributes, "role")) data.role = attributes.role;
  if (Object.prototype.hasOwnProperty.call(attributes, "active")) data.active = attributes.active;

  if (Object.prototype.hasOwnProperty.call(attributes, "birthdate")) {
    const birthdate = attributes.birthdate;
    data.birthdate = isBlank(birthdate) ? null : new Date(`${birthdate}T00:00:00.000Z`);
  }

  if (Object.prototype.hasOwnProperty.call(attributes, "password") && !isBlank(attributes.password)) {
    data.passwordDigest = await hashPassword(attributes.password);
  }

  return data;
}

module.exports = {
  ROLES,
  MAX_EMAIL_LENGTH,
  PUBLIC_ATTRIBUTES,
  WRITABLE_ATTRIBUTES,
  normalizeEmail,
  hashPassword,
  validate,
  buildData,
  toJson,
};
