"use strict";

const express = require("express");
const prisma = require("../prisma");
const { User } = require("../models");
const { json, jsonBody } = require("../helpers/json");
const { findOr404, restrictAttributes, validateOr400 } = require("../helpers/records");

// Routes for the Users resource — CRUD and HTTP fundamentals.
//
// The request body is read with jsonBody and filtered with restrictAttributes,
// so only the attributes of User.WRITABLE_ATTRIBUTES reach the model; anything
// else is a 400. Records are found with find_or_404 and validated with the
// model. Status codes: 200 ok, 201 created, 204 no content, 400 bad request,
// 404 not found, 409 conflict.

const router = express.Router();

const findById = (id) => prisma.user.findUnique({ where: { id } });

// GET /users - lists all users.
router.get("/", async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { id: "asc" } });
    json(res, { users: users.map(User.toJson) });
  } catch (err) {
    next(err);
  }
});

// GET /users/:id - finds a user by id.
router.get("/:id", async (req, res, next) => {
  try {
    const user = await findOr404(req, req.params.id, { findById, label: "User" });
    json(res, { user: User.toJson(user) });
  } catch (err) {
    next(err);
  }
});

// POST /users - creates a user. 201 with a Location header, 400 on invalid
// attributes, 409 when the email loses a uniqueness race.
router.post("/", async (req, res, next) => {
  try {
    const attributes = restrictAttributes(jsonBody(req), User.WRITABLE_ATTRIBUTES);
    validateOr400(User, attributes, { isCreate: true });

    const user = await prisma.user.create({ data: await User.buildData(attributes) });

    res.set("Location", `/users/${user.id}`);
    json(res, { user: User.toJson(user) }, 201);
  } catch (err) {
    next(err);
  }
});

// PUT /users/:id - replaces a user.
//
// PUT replaces the resource, so it requires every attribute the creation
// requires: a missing name, email or role is a 400, while the password is
// optional (an update never needs to send it again). Sending the whole resource
// keeps PUT idempotent. For a change to a single attribute, use PATCH.
router.put("/:id", async (req, res, next) => {
  try {
    const existing = await findOr404(req, req.params.id, { findById, label: "User" });
    const attributes = restrictAttributes(jsonBody(req), User.WRITABLE_ATTRIBUTES);

    // Force the required attributes to be present, so a missing one fails
    // validation the way a full replacement does.
    for (const required of ["name", "email", "role"]) {
      if (!Object.prototype.hasOwnProperty.call(attributes, required)) attributes[required] = null;
    }

    validateOr400(User, attributes, { isCreate: false });

    const user = await prisma.user.update({
      where: { id: existing.id },
      data: await User.buildData(attributes),
    });
    json(res, { user: User.toJson(user) });
  } catch (err) {
    next(err);
  }
});

// PATCH /users/:id - partially updates a user. Only the sent attributes change.
router.patch("/:id", async (req, res, next) => {
  try {
    const existing = await findOr404(req, req.params.id, { findById, label: "User" });
    const attributes = restrictAttributes(jsonBody(req), User.WRITABLE_ATTRIBUTES);
    validateOr400(User, attributes, { isCreate: false });

    const user = await prisma.user.update({
      where: { id: existing.id },
      data: await User.buildData(attributes),
    });
    json(res, { user: User.toJson(user) });
  } catch (err) {
    next(err);
  }
});

// DELETE /users/:id - removes a user. 204 with no body.
router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await findOr404(req, req.params.id, { findById, label: "User" });
    await prisma.user.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
